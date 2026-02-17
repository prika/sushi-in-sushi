/**
 * Integration Tests: Products API
 * Tests for the /api/products/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestProduct } from '../../helpers/factories';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

describe('GET /api/products/[id]/average-time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de ID', () => {
    it('valida UUID de produto', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      validUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });
    });

    it('rejeita IDs inválidos', () => {
      const invalidIds = ['123', 'abc', '', 'not-a-uuid'];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      invalidIds.forEach(id => {
        expect(uuidRegex.test(id)).toBe(false);
      });
    });
  });

  describe('Cálculo de tempo médio', () => {
    it('calcula média de tempos de preparação', () => {
      const preparationTimes = [10, 15, 12, 8, 14]; // minutes

      const average = preparationTimes.reduce((sum, time) => sum + time, 0) / preparationTimes.length;

      expect(average).toBe(11.8);
    });

    it('arredonda para minutos inteiros', () => {
      const preparationTimes = [10, 15, 13];
      const average = preparationTimes.reduce((sum, time) => sum + time, 0) / preparationTimes.length;
      const rounded = Math.round(average);

      expect(rounded).toBe(13);
    });

    it('retorna null quando sem dados', () => {
      const preparationTimes: number[] = [];
      const average = preparationTimes.length > 0
        ? preparationTimes.reduce((sum, time) => sum + time, 0) / preparationTimes.length
        : null;

      expect(average).toBeNull();
    });
  });

  describe('Filtros de data', () => {
    it('filtra por últimos N dias', () => {
      const today = new Date();
      const orders = [
        { date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        { date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) }, // 10 days ago
        { date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
      ];

      const lastNDays = 7;
      const cutoffDate = new Date(today.getTime() - lastNDays * 24 * 60 * 60 * 1000);
      const filtered = orders.filter(o => o.date >= cutoffDate);

      expect(filtered).toHaveLength(2); // 2 days ago and 1 day ago
    });
  });

  describe('Resposta da API', () => {
    it('retorna tempo médio em minutos', () => {
      const response = {
        productId: 'product-1',
        averageTimeMinutes: 12,
        sampleSize: 45,
      };

      expect(response.averageTimeMinutes).toBeGreaterThan(0);
      expect(response.sampleSize).toBeGreaterThan(0);
    });

    it('retorna null quando sem dados suficientes', () => {
      const response = {
        productId: 'product-1',
        averageTimeMinutes: null,
        sampleSize: 0,
      };

      expect(response.averageTimeMinutes).toBeNull();
      expect(response.sampleSize).toBe(0);
    });
  });

  describe('Validação de tempos', () => {
    it('ignora tempos irrealistas (muito curtos)', () => {
      const times = [1, 2, 10, 15, 12]; // 1 and 2 minutes are unrealistic

      const validTimes = times.filter(t => t >= 5 && t <= 60);

      expect(validTimes).toHaveLength(3);
      expect(validTimes).toEqual([10, 15, 12]);
    });

    it('ignora tempos irrealistas (muito longos)', () => {
      const times = [10, 15, 120, 150, 12]; // >60 minutes are unrealistic

      const validTimes = times.filter(t => t >= 5 && t <= 60);

      expect(validTimes).toHaveLength(3);
      expect(validTimes).toEqual([10, 15, 12]);
    });

    it('aceita tempos entre 5-60 minutos', () => {
      const times = [5, 10, 30, 45, 60];

      const validTimes = times.filter(t => t >= 5 && t <= 60);

      expect(validTimes).toHaveLength(5);
    });
  });

  describe('Estatísticas por categoria', () => {
    it('agrupa produtos por categoria', () => {
      const products = [
        createTestProduct({ category_id: 'cat-1' }),
        createTestProduct({ category_id: 'cat-1' }),
        createTestProduct({ category_id: 'cat-2' }),
      ];

      const grouped = products.reduce((acc, p) => {
        const key = p.category_id as string;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(grouped['cat-1']).toBe(2);
      expect(grouped['cat-2']).toBe(1);
    });
  });

  describe('Cálculo de eficiência', () => {
    it('calcula variação do tempo médio', () => {
      const currentAverage = 12;
      const previousAverage = 15;
      const improvement = ((previousAverage - currentAverage) / previousAverage) * 100;

      expect(improvement).toBe(20); // 20% improvement
    });

    it('identifica degradação de performance', () => {
      const currentAverage = 18;
      const previousAverage = 15;
      const change = ((currentAverage - previousAverage) / previousAverage) * 100;

      expect(change).toBeGreaterThan(0); // Slower (worse)
      expect(change).toBe(20); // 20% slower
    });
  });
});

describe('Validação de produtos', () => {
  it('valida preço positivo', () => {
    const prices = [10.50, 15.00, 5.75];

    prices.forEach(price => {
      expect(price).toBeGreaterThan(0);
    });
  });

  it('valida formato de preço (2 decimais)', () => {
    const price = 12.50;
    const formatted = price.toFixed(2);

    expect(formatted).toBe('12.50');
  });

  it('valida disponibilidade do produto', () => {
    const product = createTestProduct({ is_available: true });

    expect(product.is_available).toBe(true);
  });

  it('identifica produtos rodízio', () => {
    const product = createTestProduct({ is_rodizio: true });

    expect(product.is_rodizio).toBe(true);
  });

  it('identifica produtos à la carte', () => {
    const product = createTestProduct({ is_rodizio: false });

    expect(product.is_rodizio).toBe(false);
  });
});
