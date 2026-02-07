import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseRestaurantClosureRepository } from '@/infrastructure/repositories/SupabaseRestaurantClosureRepository';

/**
 * Tests for SupabaseRestaurantClosureRepository
 *
 * These tests verify the repository's data mapping and query logic.
 * They use a mocked Supabase client to test without database dependencies.
 */

// Helper to create database row format
function createDatabaseClosure(overrides: Partial<{
  id: number;
  closure_date: string;
  location: string | null;
  reason: string | null;
  is_recurring: boolean;
  recurring_day_of_week: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: 1,
    closure_date: '2024-12-25',
    location: null,
    reason: 'Natal',
    is_recurring: false,
    recurring_day_of_week: null,
    created_by: 'admin-1',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    ...overrides,
  };
}

// Create a mock that supports Supabase's fluent API pattern
function createMockSupabaseClient() {
  const createQueryBuilder = (defaultResult: any = { data: [], error: null }) => {
    const builder: any = {};

    // Store the result to return
    let result = defaultResult;

    // All methods return the builder for chaining
    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'or', 'order', 'single'];
    chainMethods.forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    // Make the builder a promise-like object (thenable)
    builder.then = (onFulfilled: (value: any) => any) => Promise.resolve(result).then(onFulfilled);
    builder.catch = (onRejected: (reason: any) => any) => Promise.resolve(result).catch(onRejected);

    // Helper to set what the query will resolve to
    builder.mockResolvedValue = (value: any) => {
      result = value;
      return builder;
    };

    return builder;
  };

  let currentBuilder = createQueryBuilder();

  const mockClient = {
    from: vi.fn(() => currentBuilder),
    _setBuilder: (builder: any) => { currentBuilder = builder; },
    _getBuilder: () => currentBuilder,
    _createBuilder: createQueryBuilder,
  };

  return mockClient;
}

describe('SupabaseRestaurantClosureRepository', () => {
  let repository: SupabaseRestaurantClosureRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseRestaurantClosureRepository(mockClient as any);
  });

  describe('findAll', () => {
    it('deve retornar lista de folgas mapeadas', async () => {
      const dbRows = [
        createDatabaseClosure({ id: 1, reason: 'Natal' }),
        createDatabaseClosure({ id: 2, reason: 'Ano Novo', closure_date: '2024-12-31' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].reason).toBe('Natal');
      expect(result[0].closureDate).toBe('2024-12-25'); // snake_case -> camelCase
      expect(result[1].closureDate).toBe('2024-12-31');
      expect(mockClient.from).toHaveBeenCalledWith('restaurant_closures');
    });

    it('deve aplicar filtro de localização', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ location: 'boavista' });

      expect(builder.or).toHaveBeenCalled();
    });

    it('deve aplicar filtro de isRecurring', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ isRecurring: true });

      expect(builder.eq).toHaveBeenCalledWith('is_recurring', true);
    });

    it('deve aplicar filtros de data', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ dateFrom: '2024-01-01', dateTo: '2024-12-31' });

      expect(builder.gte).toHaveBeenCalledWith('closure_date', '2024-01-01');
      expect(builder.lte).toHaveBeenCalledWith('closure_date', '2024-12-31');
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      await expect(repository.findAll()).rejects.toThrow('DB Error');
    });
  });

  describe('findById', () => {
    it('deve retornar folga por ID', async () => {
      const dbRow = createDatabaseClosure({ id: 1 });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.closureDate).toBe('2024-12-25');
    });

    it('deve retornar null se não encontrada', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'Other error' } });

      await expect(repository.findById(1)).rejects.toThrow('Other error');
    });
  });

  describe('findRecurring', () => {
    it('deve retornar apenas folgas recorrentes', async () => {
      const dbRows = [
        createDatabaseClosure({ id: 1, is_recurring: true, recurring_day_of_week: 0 }),
        createDatabaseClosure({ id: 2, is_recurring: true, recurring_day_of_week: 1 }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findRecurring();

      expect(result).toHaveLength(2);
      expect(result.every(c => c.isRecurring)).toBe(true);
    });
  });

  describe('create', () => {
    it('deve criar folga com dados mapeados correctamente', async () => {
      const dbRow = createDatabaseClosure({ id: 1 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.create({
        closureDate: '2024-12-25',
        reason: 'Natal',
        isRecurring: false,
      }, 'admin-1');

      expect(result.id).toBe(1);
      expect(builder.insert).toHaveBeenCalledWith({
        closure_date: '2024-12-25',
        location: null,
        reason: 'Natal',
        is_recurring: false,
        recurring_day_of_week: null,
        created_by: 'admin-1',
      });
    });

    it('deve criar folga recorrente', async () => {
      const dbRow = createDatabaseClosure({ id: 2, is_recurring: true, recurring_day_of_week: 0 });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.create({
        closureDate: '1970-01-01',
        reason: 'Domingo',
        isRecurring: true,
        recurringDayOfWeek: 0,
      });

      expect(result.isRecurring).toBe(true);
      expect(result.recurringDayOfWeek).toBe(0);
    });

    it('deve lançar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Constraint violation' } });

      await expect(repository.create({ closureDate: '2024-12-25' })).rejects.toThrow('Constraint violation');
    });
  });

  describe('update', () => {
    it('deve atualizar folga com dados mapeados', async () => {
      const dbRow = createDatabaseClosure({ id: 1, reason: 'Novo motivo' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update(1, { reason: 'Novo motivo' });

      expect(result.reason).toBe('Novo motivo');
      expect(builder.update).toHaveBeenCalledWith({ reason: 'Novo motivo' });
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const dbRow = createDatabaseClosure({ id: 1 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update(1, { location: 'boavista', closureDate: '2024-12-26' });

      expect(builder.update).toHaveBeenCalledWith({
        location: 'boavista',
        closure_date: '2024-12-26',
      });
    });
  });

  describe('delete', () => {
    it('deve eliminar folga por ID', async () => {
      const builder = mockClient._createBuilder({ error: null });
      mockClient._setBuilder(builder);

      await repository.delete(1);

      expect(mockClient.from).toHaveBeenCalledWith('restaurant_closures');
      expect(builder.delete).toHaveBeenCalled();
    });

    it('deve lançar erro se delete falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ error: { message: 'FK constraint' } });

      await expect(repository.delete(1)).rejects.toThrow('FK constraint');
    });
  });

  describe('checkClosure', () => {
    it('deve retornar fechado para data específica', async () => {
      const dbRow = createDatabaseClosure({ reason: 'Natal' });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.checkClosure('2024-12-25', 'circunvalacao');

      expect(result.isClosed).toBe(true);
      expect(result.reason).toBe('Natal');
      expect(result.closure).toBeDefined();
    });

    it('deve retornar aberto se não há folga', async () => {
      // First query returns empty (no specific closure)
      const builder1 = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder1);

      const result = await repository.checkClosure('2024-06-15');

      expect(result.isClosed).toBe(false);
    });
  });

  describe('mapToEntity', () => {
    it('deve mapear snake_case para camelCase correctamente', async () => {
      const dbRow = createDatabaseClosure({
        id: 1,
        closure_date: '2024-12-25',
        is_recurring: true,
        recurring_day_of_week: 0,
        created_by: 'admin-1',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-02T12:00:00Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById(1);

      expect(result?.closureDate).toBe('2024-12-25');
      expect(result?.isRecurring).toBe(true);
      expect(result?.recurringDayOfWeek).toBe(0);
      expect(result?.createdBy).toBe('admin-1');
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });
});
