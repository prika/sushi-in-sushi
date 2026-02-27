/**
 * Integration Tests: Orders API
 *
 * Tests the POST /api/orders endpoint:
 * - Server-side price validation via CreateOrderUseCase
 * - Session validation (exists, active, ordering mode)
 * - Request body validation
 * - Security: client-sent prices are ignored
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const mockExecuteMultiple = vi.fn();
const mockSessionFindById = vi.fn();
const mockSessionCalculateTotal = vi.fn();
const mockSessionUpdate = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({}),
}));

vi.mock('@/infrastructure/repositories/SupabaseOrderRepository', () => ({
  SupabaseOrderRepository: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock('@/infrastructure/repositories/SupabaseProductRepository', () => ({
  SupabaseProductRepository: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock('@/infrastructure/repositories/SupabaseSessionRepository', () => ({
  SupabaseSessionRepository: vi.fn().mockImplementation(function () {
    return {
      findById: mockSessionFindById,
      calculateTotal: mockSessionCalculateTotal,
      update: mockSessionUpdate,
    };
  }),
}));

vi.mock('@/application/use-cases/orders/CreateOrderUseCase', () => ({
  CreateOrderUseCase: vi.fn().mockImplementation(function () {
    return {
      executeMultiple: mockExecuteMultiple,
    };
  }),
}));

// ─── Route handler import ───────────────────────────────────────────────────

import { POST } from '@/app/api/orders/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createActiveSession(overrides = {}) {
  return {
    id: 'session-1',
    tableId: 'table-1',
    status: 'active',
    orderingMode: 'client',
    isRodizio: false,
    numPeople: 2,
    totalAmount: 0,
    startedAt: new Date(),
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createOrderResult(overrides = {}) {
  return {
    id: 'order-1',
    sessionId: 'session-1',
    productId: 'product-1',
    quantity: 2,
    unitPrice: 12.50,
    notes: null,
    status: 'pending',
    sessionCustomerId: null,
    preparedBy: null,
    preparingStartedAt: null,
    readyAt: null,
    deliveredAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Request validation ──────────────────────────────────────────────────

  describe('Request validation', () => {
    it('rejeita pedido sem sessionId', async () => {
      const request = createRequest({
        items: [{ productId: 'p1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID da sessao obrigatorio');
    });

    it('rejeita pedido com items vazio', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        items: [],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Items do pedido obrigatorios');
    });

    it('rejeita pedido sem items', async () => {
      const request = createRequest({
        sessionId: 'session-1',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Items do pedido obrigatorios');
    });

    it('rejeita item sem productId', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        items: [{ quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('productId obrigatorio em cada item');
    });

    it('rejeita item com quantidade 0', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 0 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Quantidade invalida (1-99)');
    });

    it('rejeita item com quantidade > 99', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 100 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Quantidade invalida (1-99)');
    });

    it('rejeita item com quantidade nao inteira', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 1.5 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Quantidade invalida (1-99)');
    });
  });

  // ── Session validation ──────────────────────────────────────────────────

  describe('Session validation', () => {
    it('retorna 404 quando sessao nao existe', async () => {
      mockSessionFindById.mockResolvedValue(null);

      const request = createRequest({
        sessionId: 'non-existent',
        items: [{ productId: 'p1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Sessao nao encontrada');
    });

    it('retorna 400 quando sessao esta fechada', async () => {
      mockSessionFindById.mockResolvedValue(
        createActiveSession({ status: 'closed' }),
      );

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Sessao nao esta ativa');
    });

    it('retorna 400 quando sessao esta paga', async () => {
      mockSessionFindById.mockResolvedValue(
        createActiveSession({ status: 'paid' }),
      );

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Sessao nao esta ativa');
    });

    it('retorna 400 quando sessao esta pendente de pagamento', async () => {
      mockSessionFindById.mockResolvedValue(
        createActiveSession({ status: 'pending_payment' }),
      );

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Sessao nao esta ativa');
    });

    it('retorna 403 quando modo e waiter_only', async () => {
      mockSessionFindById.mockResolvedValue(
        createActiveSession({ orderingMode: 'waiter_only' }),
      );

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('empregado');
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  describe('Criacao de pedidos', () => {
    beforeEach(() => {
      mockSessionFindById.mockResolvedValue(createActiveSession());
      mockSessionCalculateTotal.mockResolvedValue(25.00);
      mockSessionUpdate.mockResolvedValue({});
    });

    it('cria pedidos com sucesso', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: true,
        data: [createOrderResult()],
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'product-1', quantity: 2 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.orders).toHaveLength(1);
      expect(data.total_amount).toBe(25.00);
    });

    it('retorna pedidos em snake_case', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: true,
        data: [createOrderResult()],
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'product-1', quantity: 2 }],
      });
      const response = await POST(request);
      const data = await response.json();

      const order = data.orders[0];
      expect(order).toHaveProperty('session_id', 'session-1');
      expect(order).toHaveProperty('product_id', 'product-1');
      expect(order).toHaveProperty('unit_price', 12.50);
      expect(order).toHaveProperty('session_customer_id');
      expect(order).toHaveProperty('created_at');
      expect(order).toHaveProperty('updated_at');
    });

    it('cria multiplos pedidos', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: true,
        data: [
          createOrderResult({ id: 'order-1', productId: 'p1' }),
          createOrderResult({ id: 'order-2', productId: 'p2', unitPrice: 8.00 }),
        ],
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 1 },
        ],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.orders).toHaveLength(2);
    });

    it('passa notas e sessionCustomerId ao use case', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: true,
        data: [createOrderResult({ notes: 'Sem gengibre' })],
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [
          {
            productId: 'p1',
            quantity: 1,
            notes: 'Sem gengibre',
            sessionCustomerId: 'customer-1',
          },
        ],
      });
      await POST(request);

      expect(mockExecuteMultiple).toHaveBeenCalledWith([
        expect.objectContaining({
          sessionId: 'session-1',
          productId: 'p1',
          quantity: 1,
          notes: 'Sem gengibre',
          sessionCustomerId: 'customer-1',
        }),
      ]);
    });

    it('recalcula total da sessao apos criar pedidos', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: true,
        data: [createOrderResult()],
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p1', quantity: 2 }],
      });
      await POST(request);

      expect(mockSessionCalculateTotal).toHaveBeenCalledWith('session-1');
      expect(mockSessionUpdate).toHaveBeenCalledWith('session-1', {
        totalAmount: 25.00,
      });
    });
  });

  // ── Use case errors ─────────────────────────────────────────────────────

  describe('Use case errors', () => {
    beforeEach(() => {
      mockSessionFindById.mockResolvedValue(createActiveSession());
    });

    it('retorna 400 quando todos os produtos estao indisponiveis', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: false,
        error: 'Produto product-1: Produto não está disponível',
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'product-1', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('disponível');
    });

    it('retorna 400 quando produto nao existe', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: false,
        error: 'Produto p-fake: Produto não encontrado',
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [{ productId: 'p-fake', quantity: 1 }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('encontrado');
    });
  });

  // ── Security ────────────────────────────────────────────────────────────

  describe('Security', () => {
    beforeEach(() => {
      mockSessionFindById.mockResolvedValue(createActiveSession());
      mockSessionCalculateTotal.mockResolvedValue(12.50);
      mockSessionUpdate.mockResolvedValue({});
    });

    it('ignora campo price enviado pelo cliente', async () => {
      mockExecuteMultiple.mockResolvedValue({
        success: true,
        data: [createOrderResult({ unitPrice: 12.50 })],
      });

      const request = createRequest({
        sessionId: 'session-1',
        items: [
          { productId: 'p1', quantity: 1, price: 0.01, unitPrice: 0.01 },
        ],
      });
      const response = await POST(request);

      expect(response.status).toBe(201);

      // Verify DTO does not contain price fields
      const calledWith = mockExecuteMultiple.mock.calls[0][0];
      expect(calledWith[0]).not.toHaveProperty('price');
      expect(calledWith[0]).not.toHaveProperty('unitPrice');
    });
  });
});
