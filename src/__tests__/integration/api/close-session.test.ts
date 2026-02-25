/**
 * Integration Tests: Close Session API
 *
 * Tests the POST /api/sessions/[id]/close endpoint:
 * - Calls close_session_transactional RPC atomically
 * - Handles RPC errors and business logic errors
 * - Accepts optional closeReason and cancelOrders params
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    rpc: mockRpc,
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/sessions/[id]/close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fechar sessão e libertar a mesa', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-1',
        table_id: 'table-1',
        cancelled_orders: 0,
        close_reason: null,
      },
      error: null,
    });

    const request = createRequest({ cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sessionId).toBe('session-1');
    expect(data.tableId).toBe('table-1');

    expect(mockRpc).toHaveBeenCalledWith('close_session_transactional', {
      p_session_id: 'session-1',
      p_cancel_orders: true,
      p_close_reason: null,
    });
  });

  it('deve cancelar pedidos pendentes/em preparação', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-1',
        table_id: 'table-1',
        cancelled_orders: 2,
        close_reason: null,
      },
      error: null,
    });

    const request = createRequest({ cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cancelledOrders).toBe(2);
  });

  it('não deve cancelar pedidos quando cancelOrders=false', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-1',
        table_id: 'table-1',
        cancelled_orders: 0,
        close_reason: null,
      },
      error: null,
    });

    const request = createRequest({ cancelOrders: false });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cancelledOrders).toBe(0);
    expect(mockRpc).toHaveBeenCalledWith('close_session_transactional', {
      p_session_id: 'session-1',
      p_cancel_orders: false,
      p_close_reason: null,
    });
  });

  it('deve retornar 404 se sessão não existe', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        error: 'Sessão não encontrada',
      },
      error: null,
    });

    const request = createRequest({});
    const response = await POST(request, { params: { id: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('não encontrada');
  });

  it('deve retornar 400 se sessão já está fechada', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        error: 'Sessão já está encerrada',
      },
      error: null,
    });

    const request = createRequest({});
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('já está encerrada');
  });

  it('deve retornar 500 se RPC falha', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const request = createRequest({});
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('encerrar sessão');
  });

  it('deve incluir closeReason na resposta', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-1',
        table_id: 'table-1',
        cancelled_orders: 0,
        close_reason: 'Cliente desistiu',
      },
      error: null,
    });

    const request = createRequest({ closeReason: 'Cliente desistiu', cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.closeReason).toBe('Cliente desistiu');
    expect(mockRpc).toHaveBeenCalledWith('close_session_transactional', {
      p_session_id: 'session-1',
      p_cancel_orders: true,
      p_close_reason: 'Cliente desistiu',
    });
  });

  it('deve funcionar sem body (JSON vazio)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-1',
        table_id: 'table-1',
        cancelled_orders: 0,
        close_reason: null,
      },
      error: null,
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
    expect(mockRpc).toHaveBeenCalledWith('close_session_transactional', {
      p_session_id: 'session-1',
      p_cancel_orders: true,
      p_close_reason: null,
    });
  });

  it('deve libertar mesa mesmo sem table_id na sessão', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        session_id: 'session-1',
        table_id: null,
        cancelled_orders: 0,
        close_reason: null,
      },
      error: null,
    });

    const request = createRequest({ cancelOrders: true });
    const response = await POST(request, { params: { id: 'session-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tableId).toBeNull();
  });
});
