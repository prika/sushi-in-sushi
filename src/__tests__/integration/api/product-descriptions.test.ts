/**
 * Integration Tests: Product Descriptions API
 *
 * Tests the PUT /api/products/descriptions endpoint:
 * - Saves multi-lang descriptions JSONB to DB
 * - Syncs legacy PT description field
 * - Validates required productId
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const mockUpdate = vi.fn();
const mockEq = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({ update: mockUpdate }),
  }),
}));

mockUpdate.mockReturnValue({ eq: mockEq });

// ─── Route handler import ───────────────────────────────────────────────────

import { PUT } from '@/app/api/products/descriptions/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/products/descriptions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PUT /api/products/descriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  it('deve guardar descrições JSONB e sincronizar campo PT legacy', async () => {
    const descriptions = {
      pt: 'Salmão grelhado',
      en: 'Grilled salmon',
      fr: 'Saumon grillé',
    };

    const request = createRequest({ productId: 'prod-1', descriptions });
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.saved).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptions,
        description: 'Salmão grelhado', // PT sync
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'prod-1');
  });

  it('deve guardar descrição vazia como null no campo legacy', async () => {
    const descriptions = {
      en: 'Grilled salmon',
      fr: 'Saumon grillé',
    };

    const request = createRequest({ productId: 'prod-1', descriptions });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptions,
        description: null, // no PT key
      })
    );
  });

  it('deve retornar 400 quando productId não é fornecido', async () => {
    const request = createRequest({ descriptions: { pt: 'Teste' } });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('productId');
  });

  it('deve lidar com descriptions vazio', async () => {
    const request = createRequest({ productId: 'prod-1', descriptions: {} });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptions: {},
        description: null,
      })
    );
  });

  it('deve retornar 500 quando DB falha', async () => {
    mockEq.mockResolvedValue({ error: { message: 'DB error' } });

    const request = createRequest({ productId: 'prod-1', descriptions: { pt: 'Teste' } });
    const response = await PUT(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('DB error');
  });
});
