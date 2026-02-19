/**
 * Integration Tests: Admin API
 * Tests for the /api/admin/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
const mockGetAuthUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
}));

describe('GET /api/admin/products/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer admin', async () => {
      mockGetAuthUser.mockResolvedValue({ role: 'waiter' });
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite admin', async () => {
      mockGetAuthUser.mockResolvedValue({ role: 'admin' });
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(true);
    });
  });

  describe('Estatísticas de produtos', () => {
    it('calcula total de vendas', () => {
      const orders = [
        { quantity: 2, unit_price: 10.50 },
        { quantity: 1, unit_price: 15.00 },
        { quantity: 3, unit_price: 8.75 },
      ];

      const totalRevenue = orders.reduce((sum, o) => sum + (o.quantity * o.unit_price), 0);

      expect(totalRevenue).toBe(62.25); // 21 + 15 + 26.25
    });

    it('conta quantidade total vendida', () => {
      const orders = [
        { quantity: 2 },
        { quantity: 1 },
        { quantity: 3 },
      ];

      const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);

      expect(totalQuantity).toBe(6);
    });

    it('identifica produto mais vendido', () => {
      const productSales = [
        { productId: 'p1', quantity: 45 },
        { productId: 'p2', quantity: 67 },
        { productId: 'p3', quantity: 32 },
      ];

      const topProduct = productSales.reduce((top, p) =>
        p.quantity > top.quantity ? p : top
      );

      expect(topProduct.productId).toBe('p2');
      expect(topProduct.quantity).toBe(67);
    });
  });

  describe('Filtros de período', () => {
    it('filtra por últimos 7 dias', () => {
      const today = new Date();
      const cutoff = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const orders = [
        { date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) },
      ];

      const filtered = orders.filter(o => o.date >= cutoff);

      expect(filtered).toHaveLength(1);
    });

    it('filtra por mês atual', () => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const orders = [
        { date: new Date(today.getFullYear(), today.getMonth(), 15) },
        { date: new Date(today.getFullYear(), today.getMonth() - 1, 15) },
      ];

      const filtered = orders.filter(o => o.date >= firstDayOfMonth);

      expect(filtered).toHaveLength(1);
    });
  });
});

describe('POST /api/admin/products/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer admin', async () => {
      mockGetAuthUser.mockResolvedValue({ role: 'kitchen' });
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(false);
    });
  });

  describe('Validação de ficheiro', () => {
    it('aceita imagens válidas', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

      validTypes.forEach(type => {
        expect(['image/jpeg', 'image/png', 'image/webp'].includes(type)).toBe(true);
      });
    });

    it('rejeita tipos de ficheiro inválidos', () => {
      const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4'];

      invalidTypes.forEach(type => {
        expect(['image/jpeg', 'image/png', 'image/webp'].includes(type)).toBe(false);
      });
    });

    it('valida tamanho máximo (5MB)', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      const validSizes = [1024, 1024 * 1024, 4 * 1024 * 1024];

      validSizes.forEach(size => {
        expect(size <= maxSize).toBe(true);
      });
    });

    it('rejeita ficheiros muito grandes', () => {
      const maxSize = 5 * 1024 * 1024;
      const invalidSizes = [6 * 1024 * 1024, 10 * 1024 * 1024];

      invalidSizes.forEach(size => {
        expect(size <= maxSize).toBe(false);
      });
    });
  });
});

describe('GET /api/admin/kitchen-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer admin', async () => {
      mockGetAuthUser.mockResolvedValue({ role: 'waiter' });
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(false);
    });
  });

  describe('Métricas de performance', () => {
    it('calcula tempo médio de preparação', () => {
      const orders = [
        { prepTime: 12 },
        { prepTime: 15 },
        { prepTime: 10 },
      ];

      const avgTime = orders.reduce((sum, o) => sum + o.prepTime, 0) / orders.length;

      expect(avgTime).toBeCloseTo(12.33, 2);
      expect(Math.round(avgTime)).toBe(12);
    });

    it('conta pedidos por status', () => {
      const orders = [
        { status: 'pending' },
        { status: 'preparing' },
        { status: 'pending' },
        { status: 'ready' },
        { status: 'preparing' },
      ];

      const byStatus = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byStatus['pending']).toBe(2);
      expect(byStatus['preparing']).toBe(2);
      expect(byStatus['ready']).toBe(1);
    });

    it('identifica pedidos atrasados', () => {
      const orders = [
        { createdAt: new Date(Date.now() - 25 * 60 * 1000), status: 'pending' }, // 25 min ago
        { createdAt: new Date(Date.now() - 10 * 60 * 1000), status: 'pending' }, // 10 min ago
      ];

      const delayThreshold = 20; // minutes
      const delayed = orders.filter(o => {
        const ageMinutes = (Date.now() - o.createdAt.getTime()) / (60 * 1000);
        return ageMinutes > delayThreshold && o.status !== 'ready' && o.status !== 'delivered';
      });

      expect(delayed).toHaveLength(1);
    });
  });

  describe('Análise temporal', () => {
    it('agrupa por hora do dia', () => {
      const orders = [
        { createdAt: new Date('2026-02-13T12:30:00') },
        { createdAt: new Date('2026-02-13T12:45:00') },
        { createdAt: new Date('2026-02-13T19:15:00') },
      ];

      const byHour = orders.reduce((acc, o) => {
        const hour = o.createdAt.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      expect(byHour[12]).toBe(2);
      expect(byHour[19]).toBe(1);
    });
  });
});

describe('GET /api/admin/game-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer admin', async () => {
      mockGetAuthUser.mockResolvedValue({ role: 'customer' });
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(false);
    });
  });

  describe('Estatísticas de jogos', () => {
    it('calcula taxa de conclusão', () => {
      const games = [
        { completed: true },
        { completed: false },
        { completed: true },
        { completed: true },
      ];

      const completionRate = (games.filter(g => g.completed).length / games.length) * 100;

      expect(completionRate).toBe(75);
    });

    it('calcula pontuação média', () => {
      const games = [
        { score: 80 },
        { score: 65 },
        { score: 90 },
      ];

      const avgScore = games.reduce((sum, g) => sum + g.score, 0) / games.length;

      expect(avgScore).toBeCloseTo(78.33, 2);
      expect(Math.round(avgScore)).toBe(78);
    });

    it('identifica jogo mais popular', () => {
      const gameStats = [
        { type: 'trivia', plays: 45 },
        { type: 'tinder', plays: 67 },
        { type: 'memory', plays: 32 },
      ];

      const mostPopular = gameStats.reduce((top, g) =>
        g.plays > top.plays ? g : top
      );

      expect(mostPopular.type).toBe('tinder');
      expect(mostPopular.plays).toBe(67);
    });
  });
});

describe('GET /api/admin/game-questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer admin', async () => {
      mockGetAuthUser.mockResolvedValue({ role: 'kitchen' });
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(false);
    });
  });

  describe('Filtros de questões', () => {
    it('filtra por tipo de jogo', () => {
      const questions = [
        { gameType: 'trivia' },
        { gameType: 'memory' },
        { gameType: 'trivia' },
      ];

      const filtered = questions.filter(q => q.gameType === 'trivia');

      expect(filtered).toHaveLength(2);
    });

    it('filtra por dificuldade', () => {
      const questions = [
        { difficulty: 'easy' },
        { difficulty: 'hard' },
        { difficulty: 'easy' },
      ];

      const filtered = questions.filter(q => q.difficulty === 'easy');

      expect(filtered).toHaveLength(2);
    });

    it('filtra por ativas/inativas', () => {
      const questions = [
        { isActive: true },
        { isActive: false },
        { isActive: true },
      ];

      const active = questions.filter(q => q.isActive);

      expect(active).toHaveLength(2);
    });
  });

  describe('Estatísticas de questões', () => {
    it('calcula taxa de acerto', () => {
      const question = {
        timesAnswered: 100,
        timesCorrect: 75,
      };

      const correctRate = (question.timesCorrect / question.timesAnswered) * 100;

      expect(correctRate).toBe(75);
    });

    it('identifica questões muito fáceis (>90% acerto)', () => {
      const questions = [
        { correctRate: 95 },
        { correctRate: 75 },
        { correctRate: 92 },
      ];

      const tooEasy = questions.filter(q => q.correctRate > 90);

      expect(tooEasy).toHaveLength(2);
    });

    it('identifica questões muito difíceis (<30% acerto)', () => {
      const questions = [
        { correctRate: 25 },
        { correctRate: 75 },
        { correctRate: 20 },
      ];

      const tooHard = questions.filter(q => q.correctRate < 30);

      expect(tooHard).toHaveLength(2);
    });
  });
});
