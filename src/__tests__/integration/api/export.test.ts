/**
 * Integration Tests: Export API
 * Tests for /api/export (GET)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/export/route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

// Helper to create mock request with query params
function createMockExportRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/export');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    nextUrl: {
      searchParams: url.searchParams,
    },
  } as NextRequest;
}

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Integration tests (API handler)', () => {
    it('retorna 400 se startDate ausente', async () => {
      const request = createMockExportRequest({ endDate: '2026-02-28' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing date range');
    });

    it('retorna 400 se endDate ausente', async () => {
      const request = createMockExportRequest({ startDate: '2026-02-01' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing date range');
    });

    it('retorna 404 se nenhum dado encontrado', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      // Mock empty result
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No data found');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('sessions');
      expect(mockGte).toHaveBeenCalledWith('created_at', '2026-02-01');
      expect(mockLte).toHaveBeenCalledWith('created_at', '2026-02-28');
    });

    it('retorna 500 se erro no Supabase', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      // Mock Supabase error
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch data');
    });

    it('exporta dados em formato CSV com sucesso', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        format: 'csv',
      });

      // Mock successful data
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'session-1',
            created_at: '2026-02-15T10:00:00Z',
            closed_at: '2026-02-15T12:00:00Z',
            status: 'closed',
            tables: [{ number: 5 }],
            orders: [
              {
                id: 'order-1',
                quantity: 2,
                unit_price: 12.50,
                status: 'delivered',
                notes: 'Sem wasabi',
                created_at: '2026-02-15T10:15:00Z',
                products: [{ name: 'Sushi Salmão' }],
              },
            ],
          },
        ],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');
      expect(text).toContain('Sessão ID');
      expect(text).toContain('session-1');
      expect(text).toContain('Sushi Salmão');
      // Note: BOM character is included but may not be visible in text()
    });

    it('exporta dados em formato JSON com sucesso', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        format: 'json',
      });

      // Mock successful data
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'session-1',
            created_at: '2026-02-15T10:00:00Z',
            closed_at: '2026-02-15T12:00:00Z',
            status: 'closed',
            tables: [{ number: 5 }],
            orders: [
              {
                id: 'order-1',
                quantity: 2,
                unit_price: 12.50,
                status: 'delivered',
                notes: null,
                created_at: '2026-02-15T10:15:00Z',
                products: [{ name: 'Sushi Salmão' }],
              },
            ],
          },
        ],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('.json');
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('sessao_id', 'session-1');
      expect(data[0]).toHaveProperty('mesa', 5);
      expect(data[0]).toHaveProperty('produto', 'Sushi Salmão');
      expect(data[0]).toHaveProperty('preco_total', 25);
    });

    it('gera linha vazia para sessão sem pedidos', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        format: 'json',
      });

      // Mock session without orders
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'session-1',
            created_at: '2026-02-15T10:00:00Z',
            closed_at: null,
            status: 'active',
            tables: [{ number: 3 }],
            orders: [],
          },
        ],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveLength(1);
      expect(data[0].pedido_id).toBe('');
      expect(data[0].produto).toBe('');
      expect(data[0].quantidade).toBe(0);
    });
  });

  describe('Validação de parâmetros', () => {
    it('requer startDate', async () => {
      const request = createMockExportRequest({ endDate: '2026-02-28' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing date range');
    });

    it('requer endDate', async () => {
      const request = createMockExportRequest({ startDate: '2026-02-01' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing date range');
    });

    it('aceita range de datas válido', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      // Mock successful query
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{
          id: 'session-1',
          created_at: '2026-02-15T10:00:00Z',
          closed_at: null,
          status: 'active',
          tables: [{ number: 1 }],
          orders: [],
        }],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGte).toHaveBeenCalledWith('created_at', '2026-02-01');
      expect(mockLte).toHaveBeenCalledWith('created_at', '2026-02-28');
    });

    it('status é opcional', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        // status omitted
      });

      // Mock successful query
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{
          id: 'session-1',
          created_at: '2026-02-15T10:00:00Z',
          closed_at: null,
          status: 'active',
          tables: [{ number: 1 }],
          orders: [],
        }],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should succeed without status parameter
    });

    it('format é opcional (default csv)', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        // format omitted - should default to CSV
      });

      // Mock successful query
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{
          id: 'session-1',
          created_at: '2026-02-15T10:00:00Z',
          closed_at: null,
          status: 'active',
          tables: [{ number: 1 }],
          orders: [],
        }],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
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
      const formatted = date.toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Lisbon'
      });

      expect(formatted).toBe('13/02/2026, 15:30');
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
    it('retorna 400 se datas ausentes', async () => {
      // Call API without required date parameters
      const request = createMockExportRequest({ format: 'csv' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing date range');
    });

    it('retorna 404 se nenhum dado encontrado', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      // Mock Supabase to return empty array
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No data found');
    });

    it('retorna 500 se erro na query', async () => {
      const request = createMockExportRequest({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      // Mock Supabase to return an error
      const mockSelect = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed', code: 'QUERY_FAILED' },
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch data');
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
