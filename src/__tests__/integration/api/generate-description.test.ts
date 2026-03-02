/**
 * Integration Tests: Generate Description API
 *
 * Tests the POST /api/products/generate-description endpoint:
 * - Generates multi-lang descriptions (6 locales) via Claude Haiku
 * - Saves descriptions, seo_titles, seo_descriptions JSONB to DB
 * - Keeps legacy PT fields in sync
 * - Handles missing API key, missing product name, AI parse errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockUpdate, mockEq, mockCreate } = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockCreate = vi.fn();
  return { mockUpdate, mockEq, mockCreate };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({ update: mockUpdate }),
  }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

// ─── Route handler import ───────────────────────────────────────────────────

import { POST } from '@/app/api/products/generate-description/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/products/generate-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const multiLangResponse = {
  descriptions: {
    pt: 'Salmão grelhado com molho teriyaki',
    en: 'Grilled salmon with teriyaki sauce',
    fr: 'Saumon grillé sauce teriyaki',
    de: 'Gegrillter Lachs mit Teriyaki',
    it: 'Salmone grigliato con teriyaki',
    es: 'Salmón a la parrilla con teriyaki',
  },
  seoTitles: {
    pt: 'Salmão Teriyaki - Sushi in Sushi',
    en: 'Teriyaki Salmon - Sushi in Sushi',
    fr: 'Saumon Teriyaki - Sushi in Sushi',
    de: 'Teriyaki Lachs - Sushi in Sushi',
    it: 'Salmone Teriyaki - Sushi in Sushi',
    es: 'Salmón Teriyaki - Sushi in Sushi',
  },
  seoDescriptions: {
    pt: 'Delicioso salmão grelhado',
    en: 'Delicious grilled salmon',
    fr: 'Délicieux saumon grillé',
    de: 'Köstlicher gegrillter Lachs',
    it: 'Delizioso salmone grigliato',
    es: 'Delicioso salmón a la parrilla',
  },
};

function mockAIResponse(json: unknown) {
  mockCreate.mockResolvedValue({
    content: [{
      type: 'text',
      text: JSON.stringify(json),
    }],
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/products/generate-description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('deve retornar descrições em 6 idiomas', async () => {
    mockAIResponse(multiLangResponse);

    const request = createRequest({ name: 'Salmão Teriyaki' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.descriptions).toBeDefined();
    expect(Object.keys(data.descriptions)).toHaveLength(6);
    expect(data.descriptions.pt).toBe('Salmão grelhado com molho teriyaki');
    expect(data.descriptions.en).toBe('Grilled salmon with teriyaki sauce');
    expect(data.seoTitles).toBeDefined();
    expect(data.seoDescriptions).toBeDefined();
    expect(data.saved).toBe(false); // no productId provided
  });

  it('deve guardar na BD quando productId é fornecido', async () => {
    mockAIResponse(multiLangResponse);

    const request = createRequest({
      productId: 'prod-1',
      name: 'Salmão Teriyaki',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.saved).toBe(true);

    // Verify DB update was called with JSONB fields
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptions: multiLangResponse.descriptions,
        seo_titles: multiLangResponse.seoTitles,
        seo_descriptions: multiLangResponse.seoDescriptions,
        description: 'Salmão grelhado com molho teriyaki', // legacy PT sync
        seo_title: 'Salmão Teriyaki - Sushi in Sushi',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'prod-1');
  });

  it('deve incluir contexto de ingredientes no prompt', async () => {
    mockAIResponse(multiLangResponse);

    const request = createRequest({
      name: 'Salmão Teriyaki',
      ingredients: ['salmão', 'molho teriyaki', 'gengibre'],
      categoryName: 'Pratos Quentes',
      price: 14.90,
      pieces: 1,
    });
    await POST(request);

    // Verify Claude was called with ingredients in the prompt
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
      })
    );

    const callArgs = mockCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    const textBlock = userContent.find((b: { type: string }) => b.type === 'text');
    expect(textBlock.text).toContain('salmão, molho teriyaki, gengibre');
    expect(textBlock.text).toContain('Pratos Quentes');
    expect(textBlock.text).toContain('€14.90');
  });

  it('deve retornar erro 400 quando nome não é fornecido', async () => {
    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Product name is required');
  });

  it('deve retornar erro 500 quando ANTHROPIC_API_KEY não está configurado', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const request = createRequest({ name: 'Teste' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('ANTHROPIC_API_KEY not configured');
  });

  it('deve retornar erro 500 quando AI não retorna JSON válido', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'This is not valid JSON output',
      }],
    });

    const request = createRequest({ name: 'Teste' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to parse AI response');
  });

  it('deve lidar com JSON dentro de markdown code blocks', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: '```json\n' + JSON.stringify(multiLangResponse) + '\n```',
      }],
    });

    const request = createRequest({ name: 'Salmão Teriyaki' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.descriptions.pt).toBe('Salmão grelhado com molho teriyaki');
  });
});
