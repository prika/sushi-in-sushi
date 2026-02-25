/**
 * Integration Tests: Close Session API
 *
 * Tests the POST /api/sessions/[id]/close endpoint:
 * - Closes session and frees the table
 * - Cancels non-delivered orders
 * - Handles errors (session not found, already closed)
 * - Accepts optional closeReason
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestSession, createTestOrder } from '../../helpers/factories';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

// ─── Route handler import ───────────────────────────────────────────────────

import { POST } from '@/app/api/sessions/[id]/close/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost:3000/api/sessions/session-1/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/sessions/[id]/close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fechar sessão e libertar a mesa', async () => {
    const session = createTestSession({ id: 'session-1', table_id: 'table-1', status: 'active' });

    // Mock: sessions.select → session found
    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    // Mock: sessions.update → success
    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    // Mock: tables.update → success
    const tablesUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    // Mock: orders.update → no orders to cancel
    const ordersUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      if (table === 'tables') return tablesUpdateChain;
      if (table === 'orders') return ordersUpdateChain;
      return createMockChain();
    });

    const request = createRequest({ cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sessionId).toBe('session-1');
    expect(data.tableId).toBe('table-1');
  });

  it('deve cancelar pedidos pendentes/em preparação', async () => {
    const session = createTestSession({ id: 'session-1', table_id: 'table-1', status: 'active' });
    const cancelledOrders = [
      createTestOrder({ id: 'order-1', status: 'pending' }),
      createTestOrder({ id: 'order-2', status: 'preparing' }),
    ];

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const tablesUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const ordersUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: cancelledOrders, error: null }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      if (table === 'tables') return tablesUpdateChain;
      if (table === 'orders') return ordersUpdateChain;
      return createMockChain();
    });

    const request = createRequest({ cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cancelledOrders).toBe(2);
  });

  it('não deve cancelar pedidos quando cancelOrders=false', async () => {
    const session = createTestSession({ id: 'session-1', table_id: 'table-1', status: 'active' });

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const tablesUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      if (table === 'tables') return tablesUpdateChain;
      return createMockChain();
    });

    const request = createRequest({ cancelOrders: false });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cancelledOrders).toBe(0);
    // orders table should never be called
    const ordersCallArgs = mockFrom.mock.calls.filter((c: string[]) => c[0] === 'orders');
    expect(ordersCallArgs).toHaveLength(0);
  });

  it('deve retornar 404 se sessão não existe', async () => {
    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };

    mockFrom.mockImplementation(() => sessionsChain);

    const request = createRequest({});
    const response = await POST(request, { params: { id: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('não encontrada');
  });

  it('deve retornar 400 se sessão já está fechada', async () => {
    const session = createTestSession({ id: 'session-1', status: 'closed' });

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    mockFrom.mockImplementation(() => sessionsChain);

    const request = createRequest({});
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('já está encerrada');
  });

  it('deve retornar 500 se update da sessão falha', async () => {
    const session = createTestSession({ id: 'session-1', table_id: 'table-1', status: 'active' });

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      return createMockChain();
    });

    const request = createRequest({});
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('encerrar sessão');
  });

  it('deve incluir closeReason na resposta', async () => {
    const session = createTestSession({ id: 'session-1', table_id: 'table-1', status: 'active' });

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const tablesUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const ordersUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      if (table === 'tables') return tablesUpdateChain;
      if (table === 'orders') return ordersUpdateChain;
      return createMockChain();
    });

    const request = createRequest({ closeReason: 'Cliente desistiu', cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.closeReason).toBe('Cliente desistiu');
  });

  it('deve funcionar sem body (JSON vazio)', async () => {
    const session = createTestSession({ id: 'session-1', table_id: 'table-1', status: 'active' });

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const tablesUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const ordersUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      if (table === 'tables') return tablesUpdateChain;
      if (table === 'orders') return ordersUpdateChain;
      return createMockChain();
    });

    // Empty body request
    const request = new NextRequest('http://localhost:3000/api/sessions/session-1/close', {
      method: 'POST',
    });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // cancelOrders defaults to true (cancelOrders !== false)
    expect(data.cancelledOrders).toBe(0);
  });

  it('deve libertar mesa mesmo sem table_id na sessão', async () => {
    const session = createTestSession({ id: 'session-1', table_id: null, status: 'active' });

    const sessionsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session, error: null }),
    };

    const sessionsUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const ordersUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    let sessionCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        sessionCallCount++;
        return sessionCallCount === 1 ? sessionsChain : sessionsUpdateChain;
      }
      if (table === 'orders') return ordersUpdateChain;
      return createMockChain();
    });

    const request = createRequest({ cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tableId).toBeNull();
    // tables.update should NOT have been called
    const tablesCallArgs = mockFrom.mock.calls.filter((c: string[]) => c[0] === 'tables');
    expect(tablesCallArgs).toHaveLength(0);
  });
});
