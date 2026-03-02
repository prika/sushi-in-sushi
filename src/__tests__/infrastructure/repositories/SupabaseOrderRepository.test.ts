import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseOrderRepository } from '@/infrastructure/repositories/SupabaseOrderRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Tests for SupabaseOrderRepository
 *
 * Verifica mapeamento de dados, lógica de queries e enriquecimento
 * de pedidos para a cozinha usando um cliente Supabase mockado.
 */

function createDbOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    session_id: 'session-1',
    product_id: 'prod-1',
    quantity: 2,
    unit_price: 12.50,
    notes: null,
    status: 'pending',
    session_customer_id: null,
    prepared_by: null,
    preparing_started_at: null,
    ready_at: null,
    delivered_at: null,
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseOrderRepository', () => {
  let repository: SupabaseOrderRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseOrderRepository(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('deve retornar pedido mapeado quando encontrado', async () => {
      const dbRow = createDbOrder({
        preparing_started_at: '2026-01-01T12:05:00.000Z',
        ready_at: '2026-01-01T12:15:00.000Z',
        delivered_at: '2026-01-01T12:20:00.000Z',
        prepared_by: 'staff-1',
        session_customer_id: 'cust-1',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('order-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('order-1');
      expect(result!.sessionId).toBe('session-1');
      expect(result!.productId).toBe('prod-1');
      expect(result!.quantity).toBe(2);
      expect(result!.unitPrice).toBe(12.50);
      expect(result!.notes).toBeNull();
      expect(result!.status).toBe('pending');
      expect(result!.sessionCustomerId).toBe('cust-1');
      expect(result!.preparedBy).toBe('staff-1');
      expect(result!.preparingStartedAt).toBeInstanceOf(Date);
      expect(result!.readyAt).toBeInstanceOf(Date);
      expect(result!.deliveredAt).toBeInstanceOf(Date);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(mockClient.from).toHaveBeenCalledWith('orders');
    });

    it('deve retornar null quando pedido nao existe', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('deve mapear timestamps nulos correctamente', async () => {
      const dbRow = createDbOrder();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('order-1');

      expect(result!.preparingStartedAt).toBeNull();
      expect(result!.readyAt).toBeNull();
      expect(result!.deliveredAt).toBeNull();
      expect(result!.preparedBy).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByIdWithProduct
  // ---------------------------------------------------------------------------
  describe('findByIdWithProduct', () => {
    it('deve retornar pedido com dados do produto', async () => {
      const dbRow = {
        ...createDbOrder(),
        product: { id: 'prod-1', name: 'Salmao', image_url: 'https://img/salmao.jpg' },
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithProduct('order-1');

      expect(result).not.toBeNull();
      expect(result!.product.id).toBe('prod-1');
      expect(result!.product.name).toBe('Salmao');
      expect(result!.product.imageUrl).toBe('https://img/salmao.jpg');
    });

    it('deve usar fallback "Produto desconhecido" quando produto e null', async () => {
      const dbRow = {
        ...createDbOrder(),
        product: null,
      };
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByIdWithProduct('order-1');

      expect(result).not.toBeNull();
      expect(result!.product.id).toBe('');
      expect(result!.product.name).toBe('Produto desconhecido');
      expect(result!.product.imageUrl).toBeNull();
    });

    it('deve retornar null quando pedido nao existe', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findByIdWithProduct('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('deve retornar lista de pedidos sem filtros', async () => {
      const dbRows = [
        createDbOrder({ id: 'order-1' }),
        createDbOrder({ id: 'order-2', status: 'preparing' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
      expect(mockClient.from).toHaveBeenCalledWith('orders');
    });

    it('deve aplicar filtro de sessionId', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ sessionId: 'session-1' });

      expect(builder.eq).toHaveBeenCalledWith('session_id', 'session-1');
    });

    it('deve aplicar filtro de statuses', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ statuses: ['pending', 'preparing'] });

      expect(builder.in).toHaveBeenCalledWith('status', ['pending', 'preparing']);
    });

    it('deve aplicar filtro fromDate', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });
      const fromDate = new Date('2026-01-01');

      await repository.findAll({ fromDate });

      expect(builder.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
    });

    it('deve aplicar filtro toDate', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });
      const toDate = new Date('2026-01-31');

      await repository.findAll({ toDate });

      expect(builder.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
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
  });

  // ---------------------------------------------------------------------------
  // findBySession
  // ---------------------------------------------------------------------------
  describe('findBySession', () => {
    it('deve retornar pedidos com produto para uma sessao', async () => {
      const dbRows = [
        {
          ...createDbOrder({ id: 'order-1' }),
          product: { id: 'prod-1', name: 'Salmao', image_url: null },
        },
        {
          ...createDbOrder({ id: 'order-2' }),
          product: { id: 'prod-2', name: 'Atum', image_url: 'https://img/atum.jpg' },
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findBySession('session-1');

      expect(result).toHaveLength(2);
      expect(result[0].product.name).toBe('Salmao');
      expect(result[1].product.name).toBe('Atum');
      expect(result[1].product.imageUrl).toBe('https://img/atum.jpg');
    });

    it('deve usar fallback para produto null', async () => {
      const dbRows = [
        { ...createDbOrder(), product: null },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findBySession('session-1');

      expect(result[0].product.name).toBe('Produto desconhecido');
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Session error' } });

      await expect(repository.findBySession('session-1')).rejects.toThrow('Session error');
    });
  });

  // ---------------------------------------------------------------------------
  // findForKitchen
  // ---------------------------------------------------------------------------
  describe('findForKitchen', () => {
    it('deve retornar pedidos enriquecidos para a cozinha sem dados extra', async () => {
      const kitchenRow = {
        ...createDbOrder({ id: 'order-1', status: 'pending' }),
        product: { id: 'prod-1', name: 'Salmao', image_url: null },
        session: {
          id: 'session-1',
          table: { id: 'table-1', number: 5, location: 'circunvalacao' },
        },
      };

      // Main kitchen query returns orders
      const _builder = mockClient._newBuilder({ data: [kitchenRow], error: null });

      const result = await repository.findForKitchen();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-1');
      expect(result[0].product.name).toBe('Salmao');
      expect(result[0].table).not.toBeNull();
      expect(result[0].table!.number).toBe(5);
      expect(result[0].table!.location).toBe('circunvalacao');
      // Without enrichment data, names should be null
      expect(result[0].customerName).toBeNull();
      expect(result[0].waiterName).toBeNull();
      expect(result[0].preparerName).toBeNull();
    });

    it('deve filtrar por localizacao apos fetch', async () => {
      const order1 = {
        ...createDbOrder({ id: 'order-1' }),
        product: { id: 'prod-1', name: 'Salmao', image_url: null },
        session: {
          id: 'session-1',
          table: { id: 'table-1', number: 1, location: 'circunvalacao' },
        },
      };
      const order2 = {
        ...createDbOrder({ id: 'order-2' }),
        product: { id: 'prod-2', name: 'Atum', image_url: null },
        session: {
          id: 'session-2',
          table: { id: 'table-2', number: 2, location: 'boavista' },
        },
      };

      mockClient._newBuilder({ data: [order1, order2], error: null });

      const result = await repository.findForKitchen({ location: 'circunvalacao' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-1');
      expect(result[0].table!.location).toBe('circunvalacao');
    });

    it('deve lancar erro se query principal falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Kitchen query error' } });

      await expect(repository.findForKitchen()).rejects.toThrow('Kitchen query error');
    });

    it('deve lidar com sessao ou mesa null', async () => {
      const orderNoSession = {
        ...createDbOrder({ id: 'order-1' }),
        product: { id: 'prod-1', name: 'Salmao', image_url: null },
        session: null,
      };

      mockClient._newBuilder({ data: [orderNoSession], error: null });

      const result = await repository.findForKitchen();

      expect(result).toHaveLength(1);
      expect(result[0].table).toBeNull();
      expect(result[0].waiterName).toBeNull();
    });

    it('deve usar statuses padrao se nao fornecidos', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findForKitchen();

      expect(builder.in).toHaveBeenCalledWith('status', ['pending', 'preparing', 'ready']);
    });

    it('deve usar statuses personalizados se fornecidos', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findForKitchen({ statuses: ['pending'] });

      expect(builder.in).toHaveBeenCalledWith('status', ['pending']);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('deve criar pedido com dados mapeados correctamente', async () => {
      const dbRow = createDbOrder({ id: 'new-order' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        sessionId: 'session-1',
        productId: 'prod-1',
        quantity: 3,
        unitPrice: 15.00,
        notes: 'Sem wasabi',
        sessionCustomerId: 'cust-1',
      });

      expect(result.id).toBe('new-order');
      expect(builder.insert).toHaveBeenCalledWith({
        session_id: 'session-1',
        product_id: 'prod-1',
        quantity: 3,
        unit_price: 15.00,
        notes: 'Sem wasabi',
        session_customer_id: 'cust-1',
        status: 'pending',
      });
      expect(mockClient.from).toHaveBeenCalledWith('orders');
    });

    it('deve mapear notes e sessionCustomerId null quando nao fornecidos', async () => {
      const dbRow = createDbOrder();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        sessionId: 'session-1',
        productId: 'prod-1',
        quantity: 1,
        unitPrice: 10.00,
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null,
          session_customer_id: null,
        })
      );
    });

    it('deve lancar erro se insert falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Insert failed' } });

      await expect(
        repository.create({
          sessionId: 'session-1',
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 10.00,
        })
      ).rejects.toThrow('Insert failed');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('deve atualizar pedido com campos parciais', async () => {
      const dbRow = createDbOrder({ quantity: 5, notes: 'Extra gengibre' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('order-1', { quantity: 5, notes: 'Extra gengibre' });

      expect(result.quantity).toBe(5);
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 5,
          notes: 'Extra gengibre',
        })
      );
    });

    it('deve incluir updated_at na atualizacao', async () => {
      const dbRow = createDbOrder();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('order-1', { quantity: 3 });

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.updated_at).toBeDefined();
    });

    it('deve mapear status correctamente', async () => {
      const dbRow = createDbOrder({ status: 'preparing' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('order-1', { status: 'preparing' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'preparing' })
      );
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Update failed' } });

      await expect(repository.update('order-1', { quantity: 1 })).rejects.toThrow('Update failed');
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------
  describe('updateStatus', () => {
    it('deve definir preparing_started_at ao mudar para preparing', async () => {
      const dbRow = createDbOrder({ status: 'preparing', preparing_started_at: '2026-01-01T12:05:00.000Z' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.updateStatus('order-1', 'preparing');

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.status).toBe('preparing');
      expect(callArgs.preparing_started_at).toBeDefined();
      expect(result.status).toBe('preparing');
    });

    it('deve definir prepared_by quando fornecido ao mudar para preparing', async () => {
      const dbRow = createDbOrder({ status: 'preparing', prepared_by: 'chef-1' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('order-1', 'preparing', 'chef-1');

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.prepared_by).toBe('chef-1');
    });

    it('nao deve definir prepared_by quando nao fornecido', async () => {
      const dbRow = createDbOrder({ status: 'preparing' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('order-1', 'preparing');

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.prepared_by).toBeUndefined();
    });

    it('deve definir ready_at ao mudar para ready', async () => {
      const dbRow = createDbOrder({ status: 'ready', ready_at: '2026-01-01T12:15:00.000Z' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('order-1', 'ready');

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.status).toBe('ready');
      expect(callArgs.ready_at).toBeDefined();
    });

    it('deve definir delivered_at ao mudar para delivered', async () => {
      const dbRow = createDbOrder({ status: 'delivered', delivered_at: '2026-01-01T12:20:00.000Z' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('order-1', 'delivered');

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.status).toBe('delivered');
      expect(callArgs.delivered_at).toBeDefined();
    });

    it('nao deve definir timestamps extra para status cancelled', async () => {
      const dbRow = createDbOrder({ status: 'cancelled' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.updateStatus('order-1', 'cancelled');

      const callArgs = builder.update.mock.calls[0][0];
      expect(callArgs.status).toBe('cancelled');
      expect(callArgs.preparing_started_at).toBeUndefined();
      expect(callArgs.ready_at).toBeUndefined();
      expect(callArgs.delivered_at).toBeUndefined();
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Status update failed' } });

      await expect(repository.updateStatus('order-1', 'ready')).rejects.toThrow('Status update failed');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('deve eliminar pedido com sucesso', async () => {
      const builder = mockClient._newBuilder({ error: null });

      await repository.delete('order-1');

      expect(mockClient.from).toHaveBeenCalledWith('orders');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'order-1');
    });

    it('deve lancar erro se delete falhar', async () => {
      mockClient._newBuilder({ error: { message: 'FK constraint' } });

      await expect(repository.delete('order-1')).rejects.toThrow('FK constraint');
    });
  });

  // ---------------------------------------------------------------------------
  // countByStatus
  // ---------------------------------------------------------------------------
  describe('countByStatus', () => {
    it('deve contar pedidos agrupados por status', async () => {
      const dbRows = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'preparing' },
        { status: 'ready' },
        { status: 'delivered' },
        { status: 'delivered' },
        { status: 'delivered' },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus();

      expect(result.pending).toBe(2);
      expect(result.preparing).toBe(1);
      expect(result.ready).toBe(1);
      expect(result.delivered).toBe(3);
      expect(result.cancelled).toBe(0);
    });

    it('deve aplicar filtro de sessionId', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.countByStatus('session-1');

      expect(builder.eq).toHaveBeenCalledWith('session_id', 'session-1');
    });

    it('deve retornar zeros quando nao ha pedidos', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.countByStatus();

      expect(result.pending).toBe(0);
      expect(result.preparing).toBe(0);
      expect(result.ready).toBe(0);
      expect(result.delivered).toBe(0);
      expect(result.cancelled).toBe(0);
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Count error' } });

      await expect(repository.countByStatus()).rejects.toThrow('Count error');
    });
  });

  // ---------------------------------------------------------------------------
  // getAveragePreparationTime
  // ---------------------------------------------------------------------------
  describe('getAveragePreparationTime', () => {
    it('deve calcular tempo medio de preparacao em minutos', async () => {
      const dbRows = [
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T12:10:00.000Z', // 10 minutos
        },
        {
          preparing_started_at: '2026-01-01T13:00:00.000Z',
          ready_at: '2026-01-01T13:20:00.000Z', // 20 minutos
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.getAveragePreparationTime('prod-1');

      // Média: (10 + 20) / 2 = 15 minutos
      expect(result).toBe(15);
    });

    it('deve retornar null quando nao ha dados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.getAveragePreparationTime('prod-1');

      expect(result).toBeNull();
    });

    it('deve retornar null em caso de erro', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await repository.getAveragePreparationTime('prod-1');

      expect(result).toBeNull();
    });

    it('deve filtrar tempos anomalos (0 ou >180 minutos)', async () => {
      const dbRows = [
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T12:00:00.000Z', // 0 minutos (anomalia)
        },
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T16:01:00.000Z', // 241 minutos (> 180, anomalia)
        },
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T12:15:00.000Z', // 15 minutos (valido)
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.getAveragePreparationTime('prod-1');

      expect(result).toBe(15);
    });

    it('deve retornar null se todos os tempos forem anomalos', async () => {
      const dbRows = [
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T12:00:00.000Z', // 0 min
        },
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T20:00:00.000Z', // 480 min
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.getAveragePreparationTime('prod-1');

      expect(result).toBeNull();
    });

    it('deve aplicar filtros corretos na query', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.getAveragePreparationTime('prod-1');

      expect(builder.eq).toHaveBeenCalledWith('product_id', 'prod-1');
      expect(builder.in).toHaveBeenCalledWith('status', ['ready', 'delivered']);
      expect(builder.not).toHaveBeenCalledWith('preparing_started_at', 'is', null);
      expect(builder.not).toHaveBeenCalledWith('ready_at', 'is', null);
      expect(builder.limit).toHaveBeenCalledWith(50);
    });

    it('deve arredondar o tempo medio', async () => {
      const dbRows = [
        {
          preparing_started_at: '2026-01-01T12:00:00.000Z',
          ready_at: '2026-01-01T12:07:00.000Z', // 7 minutos
        },
        {
          preparing_started_at: '2026-01-01T13:00:00.000Z',
          ready_at: '2026-01-01T13:08:00.000Z', // 8 minutos
        },
        {
          preparing_started_at: '2026-01-01T14:00:00.000Z',
          ready_at: '2026-01-01T14:10:00.000Z', // 10 minutos
        },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.getAveragePreparationTime('prod-1');

      // (7 + 8 + 10) / 3 = 8.333... -> arredondado para 8
      expect(result).toBe(8);
    });
  });

  // ---------------------------------------------------------------------------
  // toDomain - mapeamento geral
  // ---------------------------------------------------------------------------
  describe('toDomain (mapeamento)', () => {
    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbOrder({
        id: 'order-42',
        session_id: 'session-99',
        product_id: 'prod-7',
        quantity: 4,
        unit_price: 25.00,
        notes: 'Sem soja',
        status: 'delivered',
        session_customer_id: 'cust-5',
        prepared_by: 'staff-3',
        preparing_started_at: '2026-01-01T12:05:00.000Z',
        ready_at: '2026-01-01T12:15:00.000Z',
        delivered_at: '2026-01-01T12:20:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('order-42');

      expect(result).toEqual({
        id: 'order-42',
        sessionId: 'session-99',
        productId: 'prod-7',
        quantity: 4,
        unitPrice: 25.00,
        notes: 'Sem soja',
        status: 'delivered',
        sessionCustomerId: 'cust-5',
        preparedBy: 'staff-3',
        preparingStartedAt: new Date('2026-01-01T12:05:00.000Z'),
        readyAt: new Date('2026-01-01T12:15:00.000Z'),
        deliveredAt: new Date('2026-01-01T12:20:00.000Z'),
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        updatedAt: new Date('2026-01-01T12:00:00.000Z'),
      });
    });
  });
});
