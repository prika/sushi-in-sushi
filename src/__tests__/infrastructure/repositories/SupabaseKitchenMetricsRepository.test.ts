import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseKitchenMetricsRepository } from '@/infrastructure/repositories/SupabaseKitchenMetricsRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Testes para SupabaseKitchenMetricsRepository
 *
 * Verifica lógica de agregação de métricas, cálculos de tempo médio de preparação,
 * ratings, filtros por data/localização e ordenação.
 */

// Helpers para criar dados de teste
function createOrderRow(overrides: Partial<{
  id: string;
  prepared_by: string;
  preparing_started_at: string;
  ready_at: string;
  status: string;
}> = {}) {
  return {
    id: 'order-1',
    prepared_by: 'staff-1',
    preparing_started_at: '2026-02-10T12:00:00Z',
    ready_at: '2026-02-10T12:10:00Z',
    status: 'ready',
    ...overrides,
  };
}

function createStaffRow(overrides: Partial<{
  id: string;
  name: string;
}> = {}) {
  return {
    id: 'staff-1',
    name: 'Chef João',
    ...overrides,
  };
}

function createRatingRow(overrides: Partial<{
  order_id: string;
  rating: number;
}> = {}) {
  return {
    order_id: 'order-1',
    rating: 4,
    ...overrides,
  };
}

describe('SupabaseKitchenMetricsRepository', () => {
  let mockClient: MockSupabaseClient;
  let repository: SupabaseKitchenMetricsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    repository = new SupabaseKitchenMetricsRepository(mockClient as any);
  });

  /**
   * Helper para configurar os 3 builders sequenciais (orders, staff, product_ratings)
   */
  function setupThreeQueries(
    ordersData: any[],
    staffData: any[],
    ratingsData: any[],
    errors?: { ordersError?: any; staffError?: any; ratingsError?: any }
  ) {
    const ordersBuilder = mockClient._createBuilder({
      data: ordersData,
      error: errors?.ordersError ?? null,
    });
    const staffBuilder = mockClient._createBuilder({
      data: staffData,
      error: errors?.staffError ?? null,
    });
    const ratingsBuilder = mockClient._createBuilder({
      data: ratingsData,
      error: errors?.ratingsError ?? null,
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'orders') return ordersBuilder;
      if (table === 'staff') return staffBuilder;
      if (table === 'product_ratings') return ratingsBuilder;
      return ordersBuilder;
    });

    return { ordersBuilder, staffBuilder, ratingsBuilder };
  }

  describe('getStaffMetrics', () => {
    it('deve retornar métricas para múltiplos cozinheiros, ordenadas por pedidos decrescente', async () => {
      // Staff-2 tem 3 pedidos, Staff-1 tem 2 pedidos
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
        createOrderRow({ id: 'o2', prepared_by: 'staff-1' }),
        createOrderRow({ id: 'o3', prepared_by: 'staff-2' }),
        createOrderRow({ id: 'o4', prepared_by: 'staff-2' }),
        createOrderRow({ id: 'o5', prepared_by: 'staff-2' }),
      ];

      const staffData = [
        createStaffRow({ id: 'staff-1', name: 'Chef João' }),
        createStaffRow({ id: 'staff-2', name: 'Chef Maria' }),
      ];

      setupThreeQueries(ordersData, staffData, []);

      const result = await repository.getStaffMetrics({});

      expect(result).toHaveLength(2);
      // Staff-2 primeiro (3 pedidos > 2 pedidos)
      expect(result[0].staffId).toBe('staff-2');
      expect(result[0].staffName).toBe('Chef Maria');
      expect(result[0].ordersPrepared).toBe(3);
      // Staff-1 segundo
      expect(result[1].staffId).toBe('staff-1');
      expect(result[1].staffName).toBe('Chef João');
      expect(result[1].ordersPrepared).toBe(2);
    });

    it('deve calcular tempo médio de preparação em minutos arredondado a 1 casa decimal', async () => {
      // Pedido 1: 10 minutos (12:00 -> 12:10)
      // Pedido 2: 15 minutos (13:00 -> 13:15)
      // Pedido 3: sem timestamps (não conta para média)
      // Média = (10 + 15) / 2 = 12.5 minutos
      const ordersData = [
        createOrderRow({
          id: 'o1',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T12:00:00Z',
          ready_at: '2026-02-10T12:10:00Z',
        }),
        createOrderRow({
          id: 'o2',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T13:00:00Z',
          ready_at: '2026-02-10T13:15:00Z',
        }),
        createOrderRow({
          id: 'o3',
          prepared_by: 'staff-1',
          preparing_started_at: null as any,
          ready_at: null as any,
        }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const result = await repository.getStaffMetrics({});

      expect(result).toHaveLength(1);
      expect(result[0].avgPrepTimeMinutes).toBe(12.5);
      expect(result[0].ordersPrepared).toBe(3);
    });

    it('deve calcular tempo médio com arredondamento correto (ex: 8.3 minutos)', async () => {
      // Pedido 1: 7 minutos
      // Pedido 2: 8 minutos
      // Pedido 3: 10 minutos
      // Média = 25/3 = 8.333... -> arredondado a 8.3
      const ordersData = [
        createOrderRow({
          id: 'o1',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T12:00:00Z',
          ready_at: '2026-02-10T12:07:00Z',
        }),
        createOrderRow({
          id: 'o2',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T13:00:00Z',
          ready_at: '2026-02-10T13:08:00Z',
        }),
        createOrderRow({
          id: 'o3',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T14:00:00Z',
          ready_at: '2026-02-10T14:10:00Z',
        }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const result = await repository.getStaffMetrics({});

      expect(result[0].avgPrepTimeMinutes).toBe(8.3);
    });

    it('deve retornar avgPrepTimeMinutes=0 quando nenhum pedido tem timestamps de preparação', async () => {
      const ordersData = [
        createOrderRow({
          id: 'o1',
          prepared_by: 'staff-1',
          preparing_started_at: null as any,
          ready_at: null as any,
        }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const result = await repository.getStaffMetrics({});

      expect(result[0].avgPrepTimeMinutes).toBe(0);
    });

    it('deve calcular média de rating arredondada a 1 casa decimal', async () => {
      // Ratings: 4, 5, 3 -> média = 12/3 = 4.0
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
        createOrderRow({ id: 'o2', prepared_by: 'staff-1' }),
      ];

      const ratingsData = [
        createRatingRow({ order_id: 'o1', rating: 4 }),
        createRatingRow({ order_id: 'o1', rating: 5 }),
        createRatingRow({ order_id: 'o2', rating: 3 }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        ratingsData
      );

      const result = await repository.getStaffMetrics({});

      expect(result[0].avgRating).toBe(4);
      expect(result[0].ratingsReceived).toBe(3);
    });

    it('deve retornar avgRating=null quando não existem ratings', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const result = await repository.getStaffMetrics({});

      expect(result[0].avgRating).toBeNull();
      expect(result[0].ratingsReceived).toBe(0);
    });

    it('deve calcular avgRating com arredondamento (ex: 3.7)', async () => {
      // Ratings: 3, 4, 4 -> média = 11/3 = 3.666... -> 3.7
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      const ratingsData = [
        createRatingRow({ order_id: 'o1', rating: 3 }),
        createRatingRow({ order_id: 'o1', rating: 4 }),
        createRatingRow({ order_id: 'o1', rating: 4 }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        ratingsData
      );

      const result = await repository.getStaffMetrics({});

      expect(result[0].avgRating).toBe(3.7);
    });

    it('deve aplicar filtros de data (fromDate e toDate)', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      const { ordersBuilder } = setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const fromDate = new Date('2026-02-01T00:00:00Z');
      const toDate = new Date('2026-02-28T23:59:59Z');

      await repository.getStaffMetrics({ fromDate, toDate });

      // Verificar que gte e lte foram chamados no builder de orders
      expect(ordersBuilder.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
      expect(ordersBuilder.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
    });

    it('deve não aplicar filtros de data quando não fornecidos', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      const { ordersBuilder } = setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      await repository.getStaffMetrics({});

      expect(ordersBuilder.gte).not.toHaveBeenCalled();
      expect(ordersBuilder.lte).not.toHaveBeenCalled();
    });

    it('deve filtrar por localização e excluir staff de outras localizações', async () => {
      // 2 staff prepararam pedidos, mas staff-2 é de outra localização
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
        createOrderRow({ id: 'o2', prepared_by: 'staff-2' }),
        createOrderRow({ id: 'o3', prepared_by: 'staff-2' }),
      ];

      // Apenas staff-1 é retornado pelo filtro de localização
      const staffData = [
        createStaffRow({ id: 'staff-1', name: 'Chef João' }),
      ];

      const { staffBuilder } = setupThreeQueries(ordersData, staffData, []);

      const result = await repository.getStaffMetrics({ location: 'circunvalacao' });

      // Deve aplicar filtro eq na query de staff
      expect(staffBuilder.eq).toHaveBeenCalledWith('location', 'circunvalacao');

      // Apenas staff-1 aparece nos resultados (staff-2 filtrado por localização)
      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('staff-1');
      expect(result[0].ordersPrepared).toBe(1);
    });

    it('deve retornar array vazio quando não existem pedidos', async () => {
      setupThreeQueries([], [], []);

      const result = await repository.getStaffMetrics({});

      expect(result).toEqual([]);
      // Deve ter chamado apenas a query de orders
      expect(mockClient.from).toHaveBeenCalledTimes(1);
      expect(mockClient.from).toHaveBeenCalledWith('orders');
    });

    it('deve retornar array vazio quando orders é null', async () => {
      const ordersBuilder = mockClient._createBuilder({ data: null, error: null });

      mockClient.from.mockImplementation(() => ordersBuilder);

      const result = await repository.getStaffMetrics({});

      expect(result).toEqual([]);
    });

    it('deve lançar erro quando a query de orders falha', async () => {
      setupThreeQueries(
        [],
        [],
        [],
        { ordersError: { message: 'Erro na query de orders' } }
      );

      await expect(repository.getStaffMetrics({}))
        .rejects
        .toThrow('Erro na query de orders');
    });

    it('deve lançar erro quando a query de staff falha', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      setupThreeQueries(
        ordersData,
        [],
        [],
        { staffError: { message: 'Erro na query de staff' } }
      );

      await expect(repository.getStaffMetrics({}))
        .rejects
        .toThrow('Erro na query de staff');
    });

    it('deve lançar erro quando a query de ratings falha', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        [],
        { ratingsError: { message: 'Erro na query de ratings' } }
      );

      await expect(repository.getStaffMetrics({}))
        .rejects
        .toThrow('Erro na query de ratings');
    });

    it('deve usar "Unknown" como nome quando staff não é encontrado no mapa', async () => {
      // Staff-1 preparou pedido mas não aparece na query de staff
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      setupThreeQueries(ordersData, [], []);

      const result = await repository.getStaffMetrics({});

      expect(result).toHaveLength(1);
      expect(result[0].staffName).toBe('Unknown');
    });

    it('deve ignorar tempos de preparação inválidos (ready_at <= preparing_started_at)', async () => {
      const ordersData = [
        // Tempo válido: 10 min
        createOrderRow({
          id: 'o1',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T12:00:00Z',
          ready_at: '2026-02-10T12:10:00Z',
        }),
        // Tempo inválido: ready_at antes de start (não deve contar)
        createOrderRow({
          id: 'o2',
          prepared_by: 'staff-1',
          preparing_started_at: '2026-02-10T13:10:00Z',
          ready_at: '2026-02-10T13:00:00Z',
        }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const result = await repository.getStaffMetrics({});

      // Apenas o pedido válido conta para a média: 10 min
      expect(result[0].avgPrepTimeMinutes).toBe(10);
    });

    it('deve chamar from() com as tabelas corretas na ordem esperada', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      await repository.getStaffMetrics({});

      expect(mockClient.from).toHaveBeenCalledWith('orders');
      expect(mockClient.from).toHaveBeenCalledWith('staff');
      expect(mockClient.from).toHaveBeenCalledWith('product_ratings');
    });
  });

  describe('getStaffMetricsById', () => {
    it('deve retornar métricas de um cozinheiro específico', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
        createOrderRow({ id: 'o2', prepared_by: 'staff-2' }),
      ];

      const staffData = [
        createStaffRow({ id: 'staff-1', name: 'Chef João' }),
        createStaffRow({ id: 'staff-2', name: 'Chef Maria' }),
      ];

      setupThreeQueries(ordersData, staffData, []);

      const result = await repository.getStaffMetricsById('staff-2', {});

      expect(result).not.toBeNull();
      expect(result!.staffId).toBe('staff-2');
      expect(result!.staffName).toBe('Chef Maria');
      expect(result!.ordersPrepared).toBe(1);
    });

    it('deve retornar null quando o staff não é encontrado nos resultados', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const result = await repository.getStaffMetricsById('staff-inexistente', {});

      expect(result).toBeNull();
    });

    it('deve retornar null quando não existem pedidos', async () => {
      setupThreeQueries([], [], []);

      const result = await repository.getStaffMetricsById('staff-1', {});

      expect(result).toBeNull();
    });

    it('deve respeitar filtros de data ao buscar por ID', async () => {
      const ordersData = [
        createOrderRow({ id: 'o1', prepared_by: 'staff-1' }),
      ];

      const { ordersBuilder } = setupThreeQueries(
        ordersData,
        [createStaffRow({ id: 'staff-1', name: 'Chef João' })],
        []
      );

      const fromDate = new Date('2026-02-01T00:00:00Z');
      const toDate = new Date('2026-02-28T23:59:59Z');

      await repository.getStaffMetricsById('staff-1', { fromDate, toDate });

      expect(ordersBuilder.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
      expect(ordersBuilder.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
    });
  });
});
