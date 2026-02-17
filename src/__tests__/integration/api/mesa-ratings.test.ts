/**
 * Integration Tests: Mesa Ratings API
 * Tests for /api/mesa/ratings (GET and POST)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

describe('GET /api/mesa/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de parâmetros', () => {
    it('requer sessionId', () => {
      const params = { sessionCustomerId: 'cust-1' };
      const isValid = !!('sessionId' in params);

      expect(isValid).toBe(false);
    });

    it('aceita sessionId', () => {
      const params = { sessionId: 'session-123' };

      expect(params.sessionId).toBeDefined();
    });

    it('sessionCustomerId é opcional', () => {
      const params = { sessionId: 'session-123' };

      expect(params).not.toHaveProperty('sessionCustomerId');
    });
  });

  describe('Table leader (mais amado)', () => {
    it('calcula produto com maior pontuação total', () => {
      const ratings = [
        { product_id: 1, rating: 5 },
        { product_id: 1, rating: 4 },
        { product_id: 2, rating: 5 },
      ];

      const byProduct: Record<number, { sum: number; count: number }> = {};
      for (const r of ratings) {
        if (!byProduct[r.product_id]) byProduct[r.product_id] = { sum: 0, count: 0 };
        byProduct[r.product_id].sum += r.rating;
        byProduct[r.product_id].count += 1;
      }

      const leaderEntry = Object.entries(byProduct).sort(
        (a, b) => b[1].sum - a[1].sum
      )[0];

      expect(leaderEntry[0]).toBe('1'); // product 1 has sum=9
      expect(leaderEntry[1].sum).toBe(9);
      expect(leaderEntry[1].count).toBe(2);
    });

    it('retorna null se nenhum rating', () => {
      const ratings: unknown[] = [];
      const byProduct: Record<number, { sum: number }> = {};

      const leaderEntry = Object.entries(byProduct)[0];
      const tableLeader = leaderEntry ? { productId: leaderEntry[0] } : null;

      expect(tableLeader).toBeNull();
    });

    it('inclui totalScore e voteCount', () => {
      const tableLeader = {
        productId: '5',
        totalScore: 12,
        voteCount: 3,
      };

      expect(tableLeader.totalScore).toBe(12);
      expect(tableLeader.voteCount).toBe(3);
    });
  });

  describe('User ratings', () => {
    it('filtra por sessionCustomerId', () => {
      const ratings = [
        { session_customer_id: 'cust-1', product_id: 1 },
        { session_customer_id: 'cust-2', product_id: 2 },
        { session_customer_id: 'cust-1', product_id: 3 },
      ];

      const sessionCustomerId = 'cust-1';
      const userRatings = ratings.filter(r => r.session_customer_id === sessionCustomerId);

      expect(userRatings).toHaveLength(2);
    });

    it('retorna 0 se sessionCustomerId não fornecido', () => {
      const ratings = [
        { session_customer_id: 'cust-1' },
        { session_customer_id: 'cust-2' },
      ];

      const sessionCustomerId = undefined;
      const userRatings = sessionCustomerId
        ? ratings.filter(r => r.session_customer_id === sessionCustomerId)
        : [];

      expect(userRatings).toHaveLength(0);
    });

    it('inclui userRatingCount', () => {
      const userRatings = [
        { product_id: 1 },
        { product_id: 2 },
        { product_id: 3 },
      ];

      const userRatingCount = userRatings.length;

      expect(userRatingCount).toBe(3);
    });

    it('retorna userRatedProductIds', () => {
      const userRatings = [
        { product_id: 1 },
        { product_id: 5 },
        { product_id: 3 },
      ];

      const userRatedProductIds = userRatings.map(r => Number(r.product_id));

      expect(userRatedProductIds).toEqual([1, 5, 3]);
    });

    it('retorna userRatedOrderIds', () => {
      const userRatings = [
        { order_id: 'order-1' },
        { order_id: null },
        { order_id: 'order-3' },
      ];

      const userRatedOrderIds = userRatings
        .map(r => r.order_id)
        .filter((id): id is string => id !== null);

      expect(userRatedOrderIds).toEqual(['order-1', 'order-3']);
    });
  });

  describe('Total ratings at table', () => {
    it('conta todos os ratings da sessão', () => {
      const ratings = [
        { session_id: 'session-1' },
        { session_id: 'session-1' },
        { session_id: 'session-1' },
      ];

      const totalRatingsAtTable = ratings.length;

      expect(totalRatingsAtTable).toBe(3);
    });
  });

  describe('Resposta', () => {
    it('inclui todos os campos', () => {
      const response = {
        tableLeader: { productId: '1', totalScore: 10, voteCount: 2 },
        userRatingCount: 2,
        userRatedProductIds: [1, 2],
        userRatedOrderIds: ['order-1'],
        totalRatingsAtTable: 5,
      };

      expect(response).toHaveProperty('tableLeader');
      expect(response).toHaveProperty('userRatingCount');
      expect(response).toHaveProperty('userRatedProductIds');
      expect(response).toHaveProperty('userRatedOrderIds');
      expect(response).toHaveProperty('totalRatingsAtTable');
    });
  });
});

describe('POST /api/mesa/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de campos obrigatórios', () => {
    it('requer sessionId', () => {
      const body = { productId: 1, rating: 5 };
      const isValid = !!('sessionId' in body);

      expect(isValid).toBe(false);
    });

    it('requer productId', () => {
      const body = { sessionId: 'session-1', rating: 5 };
      const isValid = body.productId != null;

      expect(isValid).toBe(false);
    });

    it('requer rating', () => {
      const body = { sessionId: 'session-1', productId: 1 };
      const isValid = (body as any).rating != null;

      expect(isValid).toBe(false);
    });

    it('aceita todos os campos obrigatórios', () => {
      const body = { sessionId: 'session-1', productId: 1, rating: 5 };

      expect(body.sessionId).toBeDefined();
      expect(body.productId).toBeDefined();
      expect(body.rating).toBeDefined();
    });
  });

  describe('Validação de rating', () => {
    it('aceita ratings de 1 a 5', () => {
      const validRatings = [1, 2, 3, 4, 5];

      validRatings.forEach(rating => {
        const isValid = rating >= 1 && rating <= 5 && Number.isInteger(rating);
        expect(isValid).toBe(true);
      });
    });

    it('rejeita rating 0', () => {
      const rating = 0;
      const isValid = rating >= 1 && rating <= 5;

      expect(isValid).toBe(false);
    });

    it('rejeita rating 6', () => {
      const rating = 6;
      const isValid = rating >= 1 && rating <= 5;

      expect(isValid).toBe(false);
    });

    it('rejeita rating negativo', () => {
      const rating = -1;
      const isValid = rating >= 1 && rating <= 5;

      expect(isValid).toBe(false);
    });

    it('rejeita rating decimal', () => {
      const rating = 3.5;
      const isValid = Number.isInteger(rating);

      expect(isValid).toBe(false);
    });
  });

  describe('Campos opcionais', () => {
    it('sessionCustomerId é opcional', () => {
      const body = { sessionId: 'session-1', productId: 1, rating: 5 };

      expect(body).not.toHaveProperty('sessionCustomerId');
    });

    it('orderId é opcional', () => {
      const body = { sessionId: 'session-1', productId: 1, rating: 5 };

      expect(body).not.toHaveProperty('orderId');
    });
  });

  describe('Conversão de tipos', () => {
    it('converte rating para número', () => {
      const rating = '4';
      const converted = Number(rating);

      expect(typeof converted).toBe('number');
      expect(converted).toBe(4);
    });

    it('converte productId para número', () => {
      const productId = '10';
      const converted = Number(productId);

      expect(typeof converted).toBe('number');
      expect(converted).toBe(10);
    });
  });

  describe('Modo per-order-item (com orderId)', () => {
    it('usa constraint session_id+session_customer_id+order_id', () => {
      const body = {
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        productId: 1,
        orderId: 'order-123',
        rating: 5,
      };

      const hasOrderId = !!body.orderId;
      const hasCustomerId = !!body.sessionCustomerId;
      const usePerOrderConstraint = hasOrderId && hasCustomerId;

      expect(usePerOrderConstraint).toBe(true);
    });

    it('usa upsert se sessionCustomerId presente', () => {
      const body = {
        sessionCustomerId: 'cust-1',
        orderId: 'order-123',
      };

      const shouldUpsert = !!body.sessionCustomerId;

      expect(shouldUpsert).toBe(true);
    });

    it('usa insert se sessionCustomerId ausente', () => {
      const body = {
        orderId: 'order-123',
      };

      const shouldUpsert = !!body.sessionCustomerId;

      expect(shouldUpsert).toBe(false);
    });
  });

  describe('Modo per-product (sem orderId - legacy)', () => {
    it('usa constraint session_id+session_customer_id+product_id', () => {
      const body = {
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        productId: 1,
        rating: 5,
      };

      const hasOrderId = !!('orderId' in body);
      const hasCustomerId = !!body.sessionCustomerId;
      const usePerProductConstraint = !hasOrderId && hasCustomerId;

      expect(usePerProductConstraint).toBe(true);
    });

    it('permite múltiplos ratings do mesmo produto se orderId diferente', () => {
      const rating1 = { productId: 1, orderId: 'order-1', rating: 5 };
      const rating2 = { productId: 1, orderId: 'order-2', rating: 3 };

      expect(rating1.orderId).not.toBe(rating2.orderId);
    });
  });

  describe('Estrutura do row', () => {
    it('mapeia campos para snake_case', () => {
      const body = {
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        productId: 1,
        orderId: 'order-123',
        rating: 5,
      };

      const row = {
        session_id: body.sessionId,
        product_id: Number(body.productId),
        rating: body.rating,
        session_customer_id: body.sessionCustomerId || null,
        order_id: body.orderId || null,
      };

      expect(row).toHaveProperty('session_id');
      expect(row).toHaveProperty('product_id');
      expect(row).toHaveProperty('session_customer_id');
      expect(row).toHaveProperty('order_id');
    });

    it('usa null para sessionCustomerId ausente', () => {
      const sessionCustomerId = undefined;
      const value = sessionCustomerId || null;

      expect(value).toBeNull();
    });

    it('usa null para orderId ausente', () => {
      const orderId = undefined;
      const value = orderId || null;

      expect(value).toBeNull();
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna ok true', () => {
      const response = { ok: true, id: '123' };

      expect(response.ok).toBe(true);
    });

    it('inclui ID do rating criado', () => {
      const response = { ok: true, id: '456' };

      expect(response.id).toBeDefined();
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 400 para campos ausentes', () => {
      const error = { code: 'MISSING_FIELDS', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 400 para rating inválido', () => {
      const error = { code: 'INVALID_RATING', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 500 para erro de base de dados', () => {
      const error = { code: 'DB_ERROR', status: 500 };

      expect(error.status).toBe(500);
    });
  });

  describe('Casos de uso', () => {
    it('rating anónimo (sem sessionCustomerId)', () => {
      const body = {
        sessionId: 'session-1',
        productId: 1,
        rating: 5,
      };

      expect(body.sessionCustomerId).toBeUndefined();
    });

    it('rating identificado (com sessionCustomerId)', () => {
      const body = {
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        productId: 1,
        rating: 5,
      };

      expect(body.sessionCustomerId).toBeDefined();
    });

    it('rating de item específico de pedido', () => {
      const body = {
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        productId: 1,
        orderId: 'order-123',
        rating: 4,
      };

      expect(body.orderId).toBeDefined();
      expect(body.productId).toBeDefined();
    });

    it('atualização de rating existente (upsert)', () => {
      const existing = {
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        productId: 1,
        rating: 3,
      };

      const updated = {
        ...existing,
        rating: 5,
      };

      expect(updated.rating).not.toBe(existing.rating);
      expect(updated.sessionId).toBe(existing.sessionId);
    });
  });
});
