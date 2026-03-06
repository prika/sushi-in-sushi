/**
 * Integration Tests: Business Strategy API
 * Tests for GET /api/admin/business-strategy and PATCH /api/admin/business-strategy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/admin/business-strategy/route';

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_STRATEGY = {
  id: 1,
  objectives: [
    { id: 'acq_new_customers', priority: 4, notes: 'Focus on social' },
    { id: 'ret_repeat_visits', priority: 5, notes: '' },
  ],
  target_audience: ['Casais', 'Turistas'],
  competitive_edge: 'Fresh fish daily',
  communication_tone: 'premium',
  age_range_min: 25,
  age_range_max: 45,
  key_dates: [{ label: 'Dia dos Namorados', date: '2026-02-14', recurring: true }],
  marketing_budget_monthly: 500,
  active_channels: [{ channel: 'Instagram', priority: 'primary' }],
  competitors: ['Sushi Cafe', 'Noz'],
  cuisine_types: ['Rodizio', 'A la carte'],
  capacity_lunch: 60,
  capacity_dinner: 80,
  avg_price_min: '15.00',
  avg_price_max: '35.00',
  created_at: '2026-03-06T00:00:00.000Z',
  updated_at: '2026-03-06T00:00:00.000Z',
};

// ─── Mock Supabase ──────────────────────────────────────────────────────────

let mockSelectData: unknown = MOCK_STRATEGY;
let mockSelectError: { code?: string; message: string } | null = null;
let mockUpsertData: unknown = MOCK_STRATEGY;
let mockUpsertError: { message: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: mockSelectData, error: mockSelectError }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockUpsertData, error: mockUpsertError }),
        }),
      }),
    }),
  })),
}));

// ─── Mock Auth ──────────────────────────────────────────────────────────────

let mockUser: { id: string; role: string } | null = { id: 'admin-uuid', role: 'admin' };

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(() => Promise.resolve(mockUser)),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function createPatchRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/business-strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectData = MOCK_STRATEGY;
    mockSelectError = null;
  });

  it('retorna dados da estrategia', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.objectives).toHaveLength(2);
    expect(data.target_audience).toContain('Casais');
    expect(data.communication_tone).toBe('premium');
  });

  it('retorna null quando nao ha dados', async () => {
    mockSelectData = null;
    mockSelectError = { code: 'PGRST116', message: 'not found' };

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it('retorna 500 quando ha erro de BD', async () => {
    mockSelectData = null;
    mockSelectError = { code: 'XXXXX', message: 'DB error' };

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('DB error');
  });
});

describe('PATCH /api/admin/business-strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'admin-uuid', role: 'admin' };
    mockUpsertData = MOCK_STRATEGY;
    mockUpsertError = null;
  });

  it('atualiza objetivos com sucesso', async () => {
    const body = {
      objectives: [{ id: 'acq_new_customers', priority: 5, notes: 'Top priority' }],
    };
    const request = createPatchRequest(body);

    const response = await PATCH(request);

    expect(response.status).toBe(200);
  });

  it('atualiza contexto do negocio com sucesso', async () => {
    const body = {
      target_audience: ['Familias', 'Corporate'],
      communication_tone: 'casual',
      marketing_budget_monthly: 1000,
      competitors: ['Sushi Cafe'],
    };
    const request = createPatchRequest(body);

    const response = await PATCH(request);

    expect(response.status).toBe(200);
  });

  it('rejeita utilizador nao-admin', async () => {
    mockUser = { id: 'waiter-uuid', role: 'waiter' };

    const request = createPatchRequest({ objectives: [] });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('autorizado');
  });

  it('rejeita utilizador nao autenticado', async () => {
    mockUser = null;

    const request = createPatchRequest({ objectives: [] });
    const response = await PATCH(request);

    expect(response.status).toBe(403);
  });

  it('filtra campos nao permitidos', async () => {
    const body = {
      objectives: [],
      id: 999,
      created_at: '2020-01-01',
      malicious_field: 'drop table',
    };
    const request = createPatchRequest(body);

    const response = await PATCH(request);

    // Should succeed (unknown fields silently ignored)
    expect(response.status).toBe(200);
  });

  it('retorna 500 quando ha erro de BD no upsert', async () => {
    mockUpsertData = null;
    mockUpsertError = { message: 'Upsert failed' };

    const request = createPatchRequest({ objectives: [] });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Upsert failed');
  });
});
