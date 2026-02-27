/**
 * Integration Tests: Ingredients Translate API
 *
 * Tests the POST /api/ingredients/translate endpoint:
 * - Translates single ingredient via Claude Haiku
 * - Translates batch of ingredients
 * - Saves name_translations JSONB to DB
 * - Handles missing IDs, not found, AI errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockSelect, mockIn, mockUpdate, mockUpdateEq, mockCreate } = vi.hoisted(() => {
  const mockIn = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
  const mockCreate = vi.fn();
  return { mockSelect, mockIn, mockUpdate, mockUpdateEq, mockCreate };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
      update: mockUpdate,
    }),
  }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

// ─── Route handler import ───────────────────────────────────────────────────

import { POST } from '@/app/api/ingredients/translate/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/ingredients/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupSelectMock(data: Array<{ id: string; name: string }> | null, error: unknown = null) {
  mockIn.mockResolvedValue({ data, error });
  mockSelect.mockReturnValue({ in: mockIn });
}

function setupUpdateMock() {
  mockUpdateEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/ingredients/translate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    setupUpdateMock();
  });

  describe('Tradução individual', () => {
    it('deve traduzir um ingrediente para 6 idiomas', async () => {
      setupSelectMock([{ id: 'ing-1', name: 'Salmão' }]);

      const translations = {
        pt: 'Salmão', en: 'Salmon', fr: 'Saumon',
        de: 'Lachs', it: 'Salmone', es: 'Salmón',
      };

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ translations }) }],
      });

      const request = createRequest({ ingredientId: 'ing-1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translated).toBe(1);
      expect(data.updates).toHaveLength(1);
      expect(data.updates[0].id).toBe('ing-1');
      expect(data.updates[0].nameTranslations.en).toBe('Salmon');
      expect(data.updates[0].nameTranslations.fr).toBe('Saumon');
    });

    it('deve guardar traduções na BD', async () => {
      setupSelectMock([{ id: 'ing-1', name: 'Atum' }]);

      const translations = {
        pt: 'Atum', en: 'Tuna', fr: 'Thon',
        de: 'Thunfisch', it: 'Tonno', es: 'Atún',
      };

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ translations }) }],
      });

      const request = createRequest({ ingredientId: 'ing-1' });
      await POST(request);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name_translations: translations })
      );
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'ing-1');
    });
  });

  describe('Tradução batch', () => {
    it('deve traduzir múltiplos ingredientes', async () => {
      setupSelectMock([
        { id: 'ing-1', name: 'Salmão' },
        { id: 'ing-2', name: 'Atum' },
        { id: 'ing-3', name: 'Arroz' },
      ]);

      const results = {
        'Salmão': { pt: 'Salmão', en: 'Salmon', fr: 'Saumon', de: 'Lachs', it: 'Salmone', es: 'Salmón' },
        'Atum': { pt: 'Atum', en: 'Tuna', fr: 'Thon', de: 'Thunfisch', it: 'Tonno', es: 'Atún' },
        'Arroz': { pt: 'Arroz', en: 'Rice', fr: 'Riz', de: 'Reis', it: 'Riso', es: 'Arroz' },
      };

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ results }) }],
      });

      const request = createRequest({ ingredientIds: ['ing-1', 'ing-2', 'ing-3'] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translated).toBe(3);
      expect(data.updates).toHaveLength(3);

      // Verify each ingredient was updated
      expect(mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('deve lidar com ingredientes parcialmente traduzidos pelo AI', async () => {
      setupSelectMock([
        { id: 'ing-1', name: 'Wasabi' },
        { id: 'ing-2', name: 'Gengibre' },
      ]);

      // AI only returns one of the two
      const results = {
        'Gengibre': { pt: 'Gengibre', en: 'Ginger', fr: 'Gingembre', de: 'Ingwer', it: 'Zenzero', es: 'Jengibre' },
      };

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ results }) }],
      });

      const request = createRequest({ ingredientIds: ['ing-1', 'ing-2'] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translated).toBe(1); // Only one was matched
    });
  });

  describe('Validação e erros', () => {
    it('deve retornar 400 quando nenhum ID é fornecido', async () => {
      const request = createRequest({});
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('ingredientId');
    });

    it('deve retornar 404 quando ingredientes não são encontrados', async () => {
      setupSelectMock([]);

      const request = createRequest({ ingredientId: 'non-existent' });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it('deve retornar 500 quando ANTHROPIC_API_KEY não está configurado', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = createRequest({ ingredientId: 'ing-1' });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('ANTHROPIC_API_KEY');
    });

    it('deve retornar 500 quando AI não retorna JSON válido', async () => {
      setupSelectMock([{ id: 'ing-1', name: 'Salmão' }]);

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON at all' }],
      });

      const request = createRequest({ ingredientId: 'ing-1' });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('parse');
    });

    it('deve retornar 500 quando DB falha ao buscar ingredientes', async () => {
      setupSelectMock(null, { message: 'DB connection failed' });

      const request = createRequest({ ingredientId: 'ing-1' });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
