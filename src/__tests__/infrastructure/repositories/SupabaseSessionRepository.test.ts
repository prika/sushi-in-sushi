import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import { SupabaseSessionRepository } from '@/infrastructure/repositories/SupabaseSessionRepository';

/**
 * Tests for SupabaseSessionRepository
 *
 * Verifica mapeamento de dados, queries com filtros, joins com tabelas e pedidos,
 * e operacoes CRUD de sessoes. Usa mock do Supabase client.
 */

function createDbSession(overrides: Partial<any> = {}) {
  return {
    id: 'session-1',
    table_id: 'table-1',
    status: 'active',
    is_rodizio: true,
    num_people: 4,
    total_amount: 0,
    ordering_mode: 'client',
    started_at: '2026-01-01T12:00:00.000Z',
    closed_at: null,
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseSessionRepository', () => {
  let repository: SupabaseSessionRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseSessionRepository(mockClient as any);
  });

  describe('findById', () => {
    it('deve retornar sessao quando encontrada', async () => {
      const dbRow = createDbSession();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('session-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('session-1');
      expect(result!.tableId).toBe('table-1');
      expect(result!.status).toBe('active');
      expect(result!.isRodizio).toBe(true);
      expect(result!.numPeople).toBe(4);
      expect(result!.totalAmount).toBe(0);
      expect(result!.orderingMode).toBe('client');
      expect(result!.startedAt).toBeInstanceOf(Date);
      expect(result!.closedAt).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith('sessions');
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('id', 'session-1');
      expect(mockClient._getBuilder().single).toHaveBeenCalled();
    });

    it('deve retornar null quando nao encontrada', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('deve retornar null quando error ocorre', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await repository.findById('session-1');

      expect(result).toBeNull();
    });

    it('deve mapear ordering_mode via toOrderingMode', async () => {
      const dbRow = createDbSession({ ordering_mode: 'waiter_only' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('session-1');

      expect(result!.orderingMode).toBe('waiter_only');
    });

    it('deve usar default client quando ordering_mode e invalido', async () => {
      const dbRow = createDbSession({ ordering_mode: 'invalid_mode' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('session-1');

      expect(result!.orderingMode).toBe('client');
    });

    it('deve converter closed_at quando presente', async () => {
      const dbRow = createDbSession({ closed_at: '2026-01-01T14:00:00.000Z' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('session-1');

      expect(result!.closedAt).toBeInstanceOf(Date);
      expect(result!.closedAt!.toISOString()).toBe('2026-01-01T14:00:00.000Z');
    });
  });

  describe('findByIdWithTable', () => {
    it('deve retornar sessao com dados da mesa', async () => {
      const dbRow = {
        ...createDbSession(),
        table: { id: 'table-1', number: 5, name: 'Mesa 5', location: 'circunvalacao' },
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithTable('session-1');

      expect(result).not.toBeNull();
      expect(result!.table.id).toBe('table-1');
      expect(result!.table.number).toBe(5);
      expect(result!.table.name).toBe('Mesa 5');
      expect(result!.table.location).toBe('circunvalacao');
      expect(result!.id).toBe('session-1');
      expect(result!.status).toBe('active');
    });

    it('deve retornar mesa desconhecida quando table e null', async () => {
      const dbRow = {
        ...createDbSession(),
        table: null,
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithTable('session-1');

      expect(result).not.toBeNull();
      expect(result!.table).toEqual({
        id: '',
        number: 0,
        name: 'Mesa desconhecida',
        location: '',
      });
    });

    it('deve retornar null quando nao encontrada', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await repository.findByIdWithTable('nonexistent');

      expect(result).toBeNull();
    });

    it('deve fazer select com join de tabela', async () => {
      const dbRow = {
        ...createDbSession(),
        table: { id: 'table-1', number: 1, name: 'Mesa 1', location: 'boavista' },
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      await repository.findByIdWithTable('session-1');

      const selectCall = mockClient._getBuilder().select.mock.calls[0][0];
      expect(selectCall).toContain('table:tables');
    });
  });

  describe('findByIdWithOrders', () => {
    it('deve retornar sessao com pedidos e produtos', async () => {
      const dbRow = {
        ...createDbSession(),
        table: { id: 'table-1', number: 3, name: 'Mesa 3', location: 'circunvalacao' },
        orders: [
          {
            id: 'order-1',
            product_id: 'prod-1',
            quantity: 2,
            unit_price: 12.50,
            status: 'delivered',
            product: { name: 'Sashimi Salmao' },
          },
          {
            id: 'order-2',
            product_id: 'prod-2',
            quantity: 1,
            unit_price: 8.00,
            status: 'pending',
            product: { name: 'Miso Soup' },
          },
        ],
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithOrders('session-1');

      expect(result).not.toBeNull();
      expect(result!.orders).toHaveLength(2);
      expect(result!.orders[0]).toEqual({
        id: 'order-1',
        productId: 'prod-1',
        productName: 'Sashimi Salmao',
        quantity: 2,
        unitPrice: 12.50,
        status: 'delivered',
      });
      expect(result!.orders[1].productName).toBe('Miso Soup');
    });

    it('deve usar nome padrao quando product e null', async () => {
      const dbRow = {
        ...createDbSession(),
        table: { id: 'table-1', number: 1, name: 'Mesa 1', location: 'circunvalacao' },
        orders: [
          {
            id: 'order-1',
            product_id: 'prod-deleted',
            quantity: 1,
            unit_price: 5.00,
            status: 'pending',
            product: null,
          },
        ],
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithOrders('session-1');

      expect(result!.orders[0].productName).toBe('Produto desconhecido');
    });

    it('deve retornar null quando nao encontrada', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await repository.findByIdWithOrders('nonexistent');

      expect(result).toBeNull();
    });

    it('deve tratar orders vazio', async () => {
      const dbRow = {
        ...createDbSession(),
        table: { id: 'table-1', number: 1, name: 'Mesa 1', location: 'circunvalacao' },
        orders: [],
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithOrders('session-1');

      expect(result!.orders).toEqual([]);
    });

    it('deve mapear product_id para productId e unit_price para unitPrice', async () => {
      const dbRow = {
        ...createDbSession(),
        table: null,
        orders: [
          {
            id: 'order-1',
            product_id: 'prod-99',
            quantity: 3,
            unit_price: 15.75,
            status: 'preparing',
            product: { name: 'Tempura' },
          },
        ],
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithOrders('session-1');

      expect(result!.orders[0].productId).toBe('prod-99');
      expect(result!.orders[0].unitPrice).toBe(15.75);
    });
  });

  describe('findActiveByTable', () => {
    it('deve retornar sessao activa da mesa', async () => {
      const dbRow = createDbSession({ status: 'active' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findActiveByTable('table-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('active');
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('table_id', 'table-1');
      expect(mockClient._getBuilder().in).toHaveBeenCalledWith('status', ['active', 'pending_payment']);
      expect(mockClient._getBuilder().limit).toHaveBeenCalledWith(1);
      expect(mockClient._getBuilder().single).toHaveBeenCalled();
    });

    it('deve retornar null quando nao ha sessao activa', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findActiveByTable('table-empty');

      expect(result).toBeNull();
    });

    it('deve ordenar por created_at descendente', async () => {
      const dbRow = createDbSession();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      await repository.findActiveByTable('table-1');

      expect(mockClient._getBuilder().order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de sessoes sem filtro', async () => {
      const dbRows = [
        createDbSession({ id: 'session-1' }),
        createDbSession({ id: 'session-2', status: 'closed' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
      expect(mockClient.from).toHaveBeenCalledWith('sessions');
    });

    it('deve aplicar filtro de tableId', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ tableId: 'table-5' });

      expect(builder.eq).toHaveBeenCalledWith('table_id', 'table-5');
    });

    it('deve aplicar filtro de status unico', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ status: 'active' });

      expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('deve aplicar filtro de statuses multiplos', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ statuses: ['active', 'pending_payment'] });

      expect(builder.in).toHaveBeenCalledWith('status', ['active', 'pending_payment']);
    });

    it('deve aplicar filtro fromDate', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });
      const fromDate = new Date('2026-01-01');

      await repository.findAll({ fromDate });

      expect(builder.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
    });

    it('deve aplicar filtro toDate', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });
      const toDate = new Date('2026-12-31');

      await repository.findAll({ toDate });

      expect(builder.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
    });

    it('deve aplicar filtro isRodizio', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ isRodizio: true });

      expect(builder.eq).toHaveBeenCalledWith('is_rodizio', true);
    });

    it('deve aplicar filtro isRodizio false', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ isRodizio: false });

      expect(builder.eq).toHaveBeenCalledWith('is_rodizio', false);
    });

    it('deve ordenar por created_at descendente', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      await repository.findAll();

      expect(mockClient._getBuilder().order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      await expect(repository.findAll()).rejects.toThrow('DB Error');
    });

    it('deve retornar array vazio se data for null', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('deve nao aplicar filtro statuses se array vazio', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ statuses: [] });

      expect(builder.in).not.toHaveBeenCalled();
    });
  });

  describe('findActive', () => {
    it('deve retornar sessoes activas com dados de mesa', async () => {
      const dbRows = [
        {
          ...createDbSession({ id: 'session-1', status: 'active' }),
          table: { id: 'table-1', number: 1, name: 'Mesa 1', location: 'circunvalacao' },
        },
        {
          ...createDbSession({ id: 'session-2', status: 'pending_payment' }),
          table: { id: 'table-2', number: 2, name: 'Mesa 2', location: 'boavista' },
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findActive();

      expect(result).toHaveLength(2);
      expect(result[0].table.name).toBe('Mesa 1');
      expect(result[1].table.name).toBe('Mesa 2');
    });

    it('deve filtrar por localizacao post-query', async () => {
      const dbRows = [
        {
          ...createDbSession({ id: 'session-1' }),
          table: { id: 'table-1', number: 1, name: 'Mesa 1', location: 'circunvalacao' },
        },
        {
          ...createDbSession({ id: 'session-2' }),
          table: { id: 'table-2', number: 2, name: 'Mesa 2', location: 'boavista' },
        },
        {
          ...createDbSession({ id: 'session-3' }),
          table: { id: 'table-3', number: 3, name: 'Mesa 3', location: 'circunvalacao' },
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findActive('circunvalacao');

      expect(result).toHaveLength(2);
      expect(result.every(s => s.table.location === 'circunvalacao')).toBe(true);
    });

    it('deve usar in com status active e pending_payment', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      await repository.findActive();

      expect(mockClient._getBuilder().in).toHaveBeenCalledWith('status', ['active', 'pending_payment']);
    });

    it('deve ordenar por started_at ascendente', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      await repository.findActive();

      expect(mockClient._getBuilder().order).toHaveBeenCalledWith('started_at', { ascending: true });
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Connection lost' } });

      await expect(repository.findActive()).rejects.toThrow('Connection lost');
    });

    it('deve retornar array vazio sem localizacao e sem dados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.findActive();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('deve criar sessao com mapeamento correcto de campos', async () => {
      const dbRow = createDbSession();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        tableId: 'table-1',
        isRodizio: true,
        numPeople: 4,
        orderingMode: 'client',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          table_id: 'table-1',
          is_rodizio: true,
          num_people: 4,
          ordering_mode: 'client',
          status: 'active',
          total_amount: 0,
        })
      );
      expect(result.id).toBe('session-1');
      expect(result.tableId).toBe('table-1');
    });

    it('deve usar ordering_mode client por defeito', async () => {
      const dbRow = createDbSession();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        tableId: 'table-1',
        isRodizio: false,
        numPeople: 2,
      });

      const insertArg = builder.insert.mock.calls[0][0];
      expect(insertArg.ordering_mode).toBe('client');
    });

    it('deve definir status active e total_amount 0 por defeito', async () => {
      const dbRow = createDbSession();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        tableId: 'table-1',
        isRodizio: true,
        numPeople: 4,
      });

      const insertArg = builder.insert.mock.calls[0][0];
      expect(insertArg.status).toBe('active');
      expect(insertArg.total_amount).toBe(0);
    });

    it('deve incluir started_at como ISO string', async () => {
      const dbRow = createDbSession();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        tableId: 'table-1',
        isRodizio: true,
        numPeople: 4,
      });

      const insertArg = builder.insert.mock.calls[0][0];
      expect(insertArg.started_at).toBeDefined();
      // Deve ser um ISO string valido
      expect(() => new Date(insertArg.started_at)).not.toThrow();
    });

    it('deve lancar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Insert error' } });

      await expect(
        repository.create({ tableId: 'table-1', isRodizio: true, numPeople: 4 })
      ).rejects.toThrow('Insert error');
    });
  });

  describe('update', () => {
    it('deve atualizar com mapeamento parcial de campos', async () => {
      const dbRow = createDbSession({ status: 'pending_payment', num_people: 6 });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('session-1', {
        status: 'pending_payment',
        numPeople: 6,
      });

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.status).toBe('pending_payment');
      expect(updateArg.num_people).toBe(6);
      expect(updateArg.updated_at).toBeDefined();
      expect(result.status).toBe('pending_payment');
    });

    it('deve mapear totalAmount para total_amount', async () => {
      const dbRow = createDbSession({ total_amount: 150.00 });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('session-1', { totalAmount: 150.00 });

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.total_amount).toBe(150.00);
    });

    it('deve converter closedAt para ISO string', async () => {
      const closedAt = new Date('2026-01-01T15:00:00.000Z');
      const dbRow = createDbSession({ closed_at: closedAt.toISOString() });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('session-1', { closedAt });

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.closed_at).toBe('2026-01-01T15:00:00.000Z');
    });

    it('deve tratar closedAt null', async () => {
      const dbRow = createDbSession({ closed_at: null });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('session-1', { closedAt: null });

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.closed_at).toBeNull();
    });

    it('deve mapear orderingMode para ordering_mode', async () => {
      const dbRow = createDbSession({ ordering_mode: 'waiter_only' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('session-1', { orderingMode: 'waiter_only' });

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.ordering_mode).toBe('waiter_only');
    });

    it('deve sempre incluir updated_at', async () => {
      const dbRow = createDbSession();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('session-1', { numPeople: 3 });

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.updated_at).toBeDefined();
      expect(() => new Date(updateArg.updated_at)).not.toThrow();
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      await expect(repository.update('session-1', { status: 'closed' })).rejects.toThrow('Update failed');
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status da sessao', async () => {
      const dbRow = createDbSession({ status: 'pending_payment' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.updateStatus('session-1', 'pending_payment');

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.status).toBe('pending_payment');
      expect(updateArg.updated_at).toBeDefined();
      expect(result.status).toBe('pending_payment');
    });

    it('deve adicionar closed_at quando status e closed', async () => {
      const dbRow = createDbSession({ status: 'closed', closed_at: '2026-01-01T15:00:00.000Z' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('session-1', 'closed');

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.status).toBe('closed');
      expect(updateArg.closed_at).toBeDefined();
      expect(() => new Date(updateArg.closed_at)).not.toThrow();
    });

    it('deve nao adicionar closed_at para outros status', async () => {
      const dbRow = createDbSession({ status: 'paid' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('session-1', 'paid');

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.status).toBe('paid');
      expect(updateArg.closed_at).toBeUndefined();
    });

    it('deve chamar eq com id correcto', async () => {
      const dbRow = createDbSession();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('session-99', 'active');

      expect(builder.eq).toHaveBeenCalledWith('id', 'session-99');
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Status update error' } });

      await expect(repository.updateStatus('session-1', 'closed')).rejects.toThrow('Status update error');
    });
  });

  describe('close', () => {
    it('deve delegar para updateStatus com status closed', async () => {
      const dbRow = createDbSession({ status: 'closed', closed_at: '2026-01-01T15:00:00.000Z' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.close('session-1');

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg.status).toBe('closed');
      expect(updateArg.closed_at).toBeDefined();
      expect(result.status).toBe('closed');
    });

    it('deve lancar erro se close falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Close error' } });

      await expect(repository.close('session-1')).rejects.toThrow('Close error');
    });
  });

  describe('countByStatus', () => {
    it('deve contar sessoes por status', async () => {
      const dbRows = [
        { status: 'active', table: { location: 'circunvalacao' } },
        { status: 'active', table: { location: 'circunvalacao' } },
        { status: 'pending_payment', table: { location: 'circunvalacao' } },
        { status: 'closed', table: { location: 'boavista' } },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus();

      expect(result.active).toBe(2);
      expect(result.pending_payment).toBe(1);
      expect(result.closed).toBe(1);
      expect(result.paid).toBe(0);
    });

    it('deve filtrar por localizacao', async () => {
      const dbRows = [
        { status: 'active', table: { location: 'circunvalacao' } },
        { status: 'active', table: { location: 'boavista' } },
        { status: 'pending_payment', table: { location: 'circunvalacao' } },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus('circunvalacao');

      expect(result.active).toBe(1);
      expect(result.pending_payment).toBe(1);
      expect(result.paid).toBe(0);
      expect(result.closed).toBe(0);
    });

    it('deve normalizar table array para objecto', async () => {
      const dbRows = [
        { status: 'active', table: [{ location: 'circunvalacao' }] },
        { status: 'closed', table: [{ location: 'boavista' }] },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus('circunvalacao');

      expect(result.active).toBe(1);
      expect(result.closed).toBe(0);
    });

    it('deve retornar zeros quando nao ha sessoes', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.countByStatus();

      expect(result).toEqual({
        active: 0,
        pending_payment: 0,
        paid: 0,
        closed: 0,
      });
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Count error' } });

      await expect(repository.countByStatus()).rejects.toThrow('Count error');
    });

    it('deve ignorar sessoes com table null quando localizacao e especificada', async () => {
      const dbRows = [
        { status: 'active', table: null },
        { status: 'active', table: { location: 'circunvalacao' } },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus('circunvalacao');

      expect(result.active).toBe(1);
    });

    it('deve contar sessoes com table null quando sem filtro de localizacao', async () => {
      const dbRows = [
        { status: 'active', table: null },
        { status: 'active', table: { location: 'circunvalacao' } },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus();

      expect(result.active).toBe(2);
    });

    it('deve ignorar status desconhecidos', async () => {
      const dbRows = [
        { status: 'active', table: { location: 'circunvalacao' } },
        { status: 'unknown_status', table: { location: 'circunvalacao' } },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus();

      expect(result.active).toBe(1);
      expect((result as any).unknown_status).toBeUndefined();
    });
  });

  describe('calculateTotal', () => {
    it('deve calcular total somando quantity * unit_price', async () => {
      const orderRows = [
        { quantity: 2, unit_price: 10.00, status: 'delivered' },
        { quantity: 1, unit_price: 15.50, status: 'ready' },
        { quantity: 3, unit_price: 5.00, status: 'pending' },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: orderRows, error: null });

      const result = await repository.calculateTotal('session-1');

      expect(result).toBe(2 * 10.00 + 1 * 15.50 + 3 * 5.00); // 50.50
    });

    it('deve consultar tabela orders com session_id', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      await repository.calculateTotal('session-1');

      expect(mockClient.from).toHaveBeenCalledWith('orders');
      expect(mockClient._getBuilder().select).toHaveBeenCalledWith('quantity, unit_price, status');
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('session_id', 'session-1');
      expect(mockClient._getBuilder().neq).toHaveBeenCalledWith('status', 'cancelled');
    });

    it('deve excluir pedidos cancelados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      await repository.calculateTotal('session-1');

      expect(mockClient._getBuilder().neq).toHaveBeenCalledWith('status', 'cancelled');
    });

    it('deve retornar 0 quando nao ha pedidos', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.calculateTotal('session-1');

      expect(result).toBe(0);
    });

    it('deve retornar 0 quando data e null', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.calculateTotal('session-1');

      expect(result).toBe(0);
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Calc error' } });

      await expect(repository.calculateTotal('session-1')).rejects.toThrow('Calc error');
    });
  });

  describe('mapeamento de dados', () => {
    it('deve converter todas as datas string para objectos Date', async () => {
      const dbRow = createDbSession({
        started_at: '2026-06-15T10:00:00.000Z',
        closed_at: '2026-06-15T14:00:00.000Z',
        created_at: '2026-06-15T09:55:00.000Z',
        updated_at: '2026-06-15T14:01:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('session-1');

      expect(result!.startedAt).toBeInstanceOf(Date);
      expect(result!.closedAt).toBeInstanceOf(Date);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(result!.startedAt.toISOString()).toBe('2026-06-15T10:00:00.000Z');
      expect(result!.closedAt!.toISOString()).toBe('2026-06-15T14:00:00.000Z');
    });

    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbSession({
        table_id: 'table-42',
        is_rodizio: false,
        num_people: 2,
        total_amount: 75.50,
        ordering_mode: 'waiter_only',
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0]).toEqual(
        expect.objectContaining({
          tableId: 'table-42',
          isRodizio: false,
          numPeople: 2,
          totalAmount: 75.50,
          orderingMode: 'waiter_only',
        })
      );
    });

    it('deve usar ordering_mode padrao client quando undefined', async () => {
      const dbRow = createDbSession({ ordering_mode: undefined });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('session-1');

      expect(result!.orderingMode).toBe('client');
    });
  });
});
