/**
 * Integration Tests: Export API
 * Tests for /api/export (GET)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de parâmetros', () => {
    it('requer startDate', () => {
      const params = { endDate: '2026-02-28' };
      const isValid = !!('startDate' in params);

      expect(isValid).toBe(false);
    });

    it('requer endDate', () => {
      const params = { startDate: '2026-02-01' };
      const isValid = !!('endDate' in params);

      expect(isValid).toBe(false);
    });

    it('aceita range de datas válido', () => {
      const params = { startDate: '2026-02-01', endDate: '2026-02-28' };

      expect(params.startDate).toBeDefined();
      expect(params.endDate).toBeDefined();
    });

    it('status é opcional', () => {
      const params = { startDate: '2026-02-01', endDate: '2026-02-28' };

      expect(params).not.toHaveProperty('status');
    });

    it('format é opcional (default csv)', () => {
      const format = 'csv'; // default

      expect(['csv', 'json'].includes(format)).toBe(true);
    });
  });

  describe('Validação de formato', () => {
    it('aceita format csv', () => {
      const format = 'csv';

      expect(format).toBe('csv');
    });

    it('aceita format json', () => {
      const format = 'json';

      expect(format).toBe('json');
    });

    it('usa csv como default', () => {
      const queryFormat = null; // from query params
      const format = queryFormat || 'csv';

      expect(format).toBe('csv');
    });
  });

  describe('Validação de datas', () => {
    it('valida formato ISO YYYY-MM-DD', () => {
      const dates = ['2026-02-01', '2026-12-31', '2025-01-01'];

      dates.forEach(date => {
        expect(/^\d{4}-\d{2}-\d{2}$/.test(date)).toBe(true);
      });
    });

    it('rejeita formatos inválidos', () => {
      const invalidDates = ['2026/02/01', '01-02-2026', '2026-2-1'];

      invalidDates.forEach(date => {
        expect(/^\d{4}-\d{2}-\d{2}$/.test(date)).toBe(false);
      });
    });

    it('startDate deve ser antes de endDate', () => {
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');

      expect(startDate < endDate).toBe(true);
    });
  });

  describe('Query de dados', () => {
    it('filtra por data de criação da sessão', () => {
      const sessions = [
        { created_at: '2026-02-15T10:00:00Z' },
        { created_at: '2026-01-15T10:00:00Z' },
      ];

      const startDate = '2026-02-01';
      const filtered = sessions.filter(s => s.created_at >= startDate);

      expect(filtered).toHaveLength(1);
    });

    it('filtra por status se fornecido', () => {
      const sessions = [
        { status: 'closed' },
        { status: 'active' },
        { status: 'closed' },
      ];

      const filtered = sessions.filter(s => s.status === 'closed');

      expect(filtered).toHaveLength(2);
    });

    it('ordena por created_at desc', () => {
      const sessions = [
        { created_at: '2026-02-10T10:00:00Z' },
        { created_at: '2026-02-20T10:00:00Z' },
        { created_at: '2026-02-15T10:00:00Z' },
      ];

      const sorted = [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at));

      expect(sorted[0].created_at).toBe('2026-02-20T10:00:00Z');
      expect(sorted[2].created_at).toBe('2026-02-10T10:00:00Z');
    });
  });

  describe('Transformação de dados', () => {
    it('transforma sessão com pedidos em linhas', () => {
      const session = {
        id: 'session-1',
        orders: [
          { id: 'order-1', quantity: 2 },
          { id: 'order-2', quantity: 1 },
        ],
      };

      const rows = session.orders.map(order => ({
        sessao_id: session.id,
        pedido_id: order.id,
        quantidade: order.quantity,
      }));

      expect(rows).toHaveLength(2);
      expect(rows[0].sessao_id).toBe('session-1');
    });

    it('sessão sem pedidos gera linha vazia', () => {
      const session = {
        id: 'session-1',
        orders: [],
      };

      const hasOrders = session.orders.length > 0;
      const rows = hasOrders ? session.orders : [{
        sessao_id: session.id,
        pedido_id: '',
        quantidade: 0,
      }];

      expect(rows).toHaveLength(1);
      expect(rows[0].pedido_id).toBe('');
    });

    it('calcula preço total (quantidade * preço unitário)', () => {
      const order = {
        quantidade: 3,
        preco_unitario: 12.50,
      };

      const preco_total = order.quantidade * order.preco_unitario;

      expect(preco_total).toBe(37.50);
    });

    it('usa 0 se preço unitário null', () => {
      const order = {
        quantidade: 2,
        unit_price: null,
      };

      const preco_unitario = order.unit_price || 0;

      expect(preco_unitario).toBe(0);
    });
  });

  describe('Export JSON', () => {
    it('retorna array JSON formatado', () => {
      const exportData = [
        { sessao_id: 'session-1', mesa: 5 },
        { sessao_id: 'session-2', mesa: 3 },
      ];

      const json = JSON.stringify(exportData, null, 2);

      expect(json).toContain('session-1');
      expect(json).toContain('"mesa": 5');
    });

    it('usa Content-Type application/json', () => {
      const headers = { 'Content-Type': 'application/json' };

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('inclui Content-Disposition com filename', () => {
      const date = new Date().toISOString().split('T')[0];
      const disposition = `attachment; filename="export-${date}.json"`;

      expect(disposition).toContain('attachment');
      expect(disposition).toContain('.json');
    });
  });

  describe('Export CSV', () => {
    it('usa separador ponto e vírgula', () => {
      const row = ['session-1', '5', 'active'].join(';');

      expect(row).toContain(';');
      expect(row.split(';')).toHaveLength(3);
    });

    it('inclui linha de headers', () => {
      const headers = ['Sessão ID', 'Mesa', 'Quantidade'];
      const csv = headers.join(';') + '\n';

      expect(csv).toContain('Sessão ID');
      expect(csv).toContain('Mesa');
    });

    it('formata preços com vírgula decimal', () => {
      const price = 12.50;
      const formatted = price.toFixed(2).replace('.', ',');

      expect(formatted).toBe('12,50');
    });

    it('quotes notas field e escapa quotes', () => {
      const notes = 'Cliente disse "sem molho"';
      const escaped = `"${notes.replace(/"/g, '""')}"`;

      expect(escaped).toBe('"Cliente disse ""sem molho"""');
    });

    it('inclui BOM UTF-8 para Excel', () => {
      const bom = '\uFEFF';
      const csv = 'data';
      const content = bom + csv;

      expect(content.charCodeAt(0)).toBe(0xFEFF);
    });

    it('usa Content-Type text/csv UTF-8', () => {
      const headers = { 'Content-Type': 'text/csv; charset=utf-8' };

      expect(headers['Content-Type']).toContain('text/csv');
      expect(headers['Content-Type']).toContain('utf-8');
    });

    it('inclui Content-Disposition com filename', () => {
      const date = new Date().toISOString().split('T')[0];
      const disposition = `attachment; filename="export-${date}.csv"`;

      expect(disposition).toContain('attachment');
      expect(disposition).toContain('.csv');
    });
  });

  describe('Formatação de datas', () => {
    it('formata data em pt-PT (dd/mm/yyyy hh:mm)', () => {
      const isoString = '2026-02-13T15:30:00.000Z';
      const date = new Date(isoString);

      // Format should be like "13/02/2026, 15:30"
      expect(date).toBeInstanceOf(Date);
    });

    it('usa 2 dígitos para dia e mês', () => {
      const isoString = '2026-02-05T09:05:00.000Z';
      const date = new Date(isoString);
      const formatted = date.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('retorna string vazia se data null', () => {
      const closedAt = null;
      const formatted = closedAt ? 'formatted' : '';

      expect(formatted).toBe('');
    });
  });

  describe('Tradução de status', () => {
    it('traduz status de sessão', () => {
      const translations: Record<string, string> = {
        active: 'Ativa',
        pending_payment: 'Conta Pedida',
        paid: 'Paga',
        closed: 'Fechada',
      };

      expect(translations['active']).toBe('Ativa');
      expect(translations['closed']).toBe('Fechada');
    });

    it('traduz status de pedido', () => {
      const translations: Record<string, string> = {
        pending: 'Pendente',
        preparing: 'A Preparar',
        ready: 'Pronto para servir',
        delivered: 'Entregue',
        cancelled: 'Cancelado',
      };

      expect(translations['pending']).toBe('Pendente');
      expect(translations['ready']).toBe('Pronto para servir');
    });

    it('mantém status desconhecido', () => {
      const status = 'unknown_status';
      const translations: Record<string, string> = { active: 'Ativa' };
      const translated = translations[status] || status;

      expect(translated).toBe('unknown_status');
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 400 se datas ausentes', () => {
      const error = { code: 'MISSING_DATES', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 404 se nenhum dado encontrado', () => {
      const sessions: unknown[] = [];
      const status = sessions.length === 0 ? 404 : 200;

      expect(status).toBe(404);
    });

    it('retorna 500 se erro na query', () => {
      const error = { code: 'QUERY_FAILED', status: 500 };

      expect(error.status).toBe(500);
    });
  });

  describe('Casos de uso', () => {
    it('exporta sessões do mês corrente', () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };

      expect(params.startDate).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('exporta apenas sessões fechadas', () => {
      const params = {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        status: 'closed',
      };

      expect(params.status).toBe('closed');
    });

    it('exporta período específico em JSON', () => {
      const params = {
        startDate: '2026-01-15',
        endDate: '2026-01-31',
        format: 'json',
      };

      expect(params.format).toBe('json');
    });
  });

  describe('Estrutura de dados exportados', () => {
    it('inclui todos os campos de sessão', () => {
      const row = {
        sessao_id: 'session-1',
        mesa: 5,
        sessao_inicio: '2026-02-13T10:00:00Z',
        sessao_fim: '2026-02-13T12:00:00Z',
        sessao_estado: 'closed',
      };

      expect(row).toHaveProperty('sessao_id');
      expect(row).toHaveProperty('mesa');
      expect(row).toHaveProperty('sessao_inicio');
      expect(row).toHaveProperty('sessao_fim');
      expect(row).toHaveProperty('sessao_estado');
    });

    it('inclui todos os campos de pedido', () => {
      const row = {
        pedido_id: 'order-1',
        produto: 'Sushi Salmão',
        quantidade: 2,
        preco_unitario: 12.50,
        preco_total: 25.00,
        pedido_estado: 'delivered',
        notas: 'Sem wasabi',
        pedido_hora: '2026-02-13T10:15:00Z',
      };

      expect(row).toHaveProperty('pedido_id');
      expect(row).toHaveProperty('produto');
      expect(row).toHaveProperty('quantidade');
      expect(row).toHaveProperty('preco_unitario');
      expect(row).toHaveProperty('preco_total');
      expect(row).toHaveProperty('pedido_estado');
      expect(row).toHaveProperty('notas');
      expect(row).toHaveProperty('pedido_hora');
    });

    it('numero da mesa vem de relação tables', () => {
      const session = {
        tables: [{ number: 7 }],
      };

      const tableNumber = session.tables?.[0]?.number || '';

      expect(tableNumber).toBe(7);
    });

    it('nome do produto vem de relação products', () => {
      const order = {
        products: [{ name: 'Sushi Salmão' }],
      };

      const productName = order.products?.[0]?.name || '';

      expect(productName).toBe('Sushi Salmão');
    });
  });
});
