import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/SupabaseRestaurantRepository';
import type { CreateRestaurantData, UpdateRestaurantData } from '@/domain/entities/Restaurant';

/**
 * Tests for SupabaseRestaurantRepository
 *
 * These tests verify the repository's data mapping and query logic.
 * They use a mocked Supabase client to test without database dependencies.
 */

// Helper to create database row format (snake_case)
function createDatabaseRestaurant(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  default_people_per_table: number;
  auto_table_assignment: boolean;
  auto_reservations: boolean;
  order_cooldown_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Circunvalação',
    slug: 'circunvalacao',
    address: 'Via de Circunvalação, Porto',
    latitude: 41.1621,
    longitude: -8.6369,
    max_capacity: 50,
    default_people_per_table: 4,
    auto_table_assignment: false,
    auto_reservations: false,
    order_cooldown_minutes: 0,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
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
    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'single'];
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

describe('SupabaseRestaurantRepository', () => {
  let repository: SupabaseRestaurantRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseRestaurantRepository(mockClient as any);
  });

  // =====================================================
  // findAll()
  // =====================================================
  describe('findAll', () => {
    it('deve retornar todos os restaurantes mapeados', async () => {
      const dbRows = [
        createDatabaseRestaurant({ id: '1', name: 'Circunvalação' }),
        createDatabaseRestaurant({ id: '2', name: 'Boavista', slug: 'boavista' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Circunvalação');
      expect(result[0].maxCapacity).toBe(50); // snake_case -> camelCase
      expect(result[0].defaultPeoplePerTable).toBe(4);
      expect(result[0].isActive).toBe(true);
      expect(result[1].slug).toBe('boavista');
      expect(mockClient.from).toHaveBeenCalledWith('restaurants');
    });

    it('deve converter datas corretamente', async () => {
      const dbRows = [createDatabaseRestaurant()];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('deve retornar array vazio quando não há dados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('deve lançar erro quando Supabase retorna erro', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(repository.findAll()).rejects.toThrow('Database error');
    });

    it('deve filtrar por isActive', async () => {
      const dbRows = [createDatabaseRestaurant({ is_active: true })];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ isActive: true });

      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('deve filtrar por slug', async () => {
      const dbRows = [createDatabaseRestaurant({ slug: 'circunvalacao' })];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ slug: 'circunvalacao' });

      expect(builder.eq).toHaveBeenCalledWith('slug', 'circunvalacao');
    });
  });

  // =====================================================
  // findActive()
  // =====================================================
  describe('findActive', () => {
    it('deve retornar apenas restaurantes ativos', async () => {
      const dbRows = [createDatabaseRestaurant({ is_active: true })];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findActive();

      expect(result.every((r) => r.isActive)).toBe(true);
      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar restaurante por ID', async () => {
      const dbRow = createDatabaseRestaurant();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(builder.eq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000');
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve retornar null quando restaurante não existe (PGRST116)', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      mockClient._setBuilder(builder);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve lançar erro para erros diferentes de PGRST116', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.findById('some-id')).rejects.toThrow('Database error');
    });
  });

  // =====================================================
  // findBySlug()
  // =====================================================
  describe('findBySlug', () => {
    it('deve retornar restaurante por slug', async () => {
      const dbRow = createDatabaseRestaurant({ slug: 'circunvalacao' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findBySlug('circunvalacao');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('circunvalacao');
      expect(builder.eq).toHaveBeenCalledWith('slug', 'circunvalacao');
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve retornar null quando slug não existe', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'PGRST116' },
      });
      mockClient._setBuilder(builder);

      const result = await repository.findBySlug('non-existent-slug');

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    const createData: CreateRestaurantData = {
      name: 'Matosinhos',
      slug: 'matosinhos',
      address: 'Avenida de Matosinhos, Porto',
      latitude: 41.1803,
      longitude: -8.6891,
      maxCapacity: 35,
      defaultPeoplePerTable: 4,
      autoTableAssignment: false,
      autoReservations: false,
      orderCooldownMinutes: 0,
      isActive: true,
    };

    it('deve criar restaurante com sucesso', async () => {
      const dbRow = createDatabaseRestaurant({
        name: 'Matosinhos',
        slug: 'matosinhos',
        max_capacity: 35,
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.create(createData);

      expect(result.name).toBe('Matosinhos');
      expect(result.slug).toBe('matosinhos');
      expect(result.maxCapacity).toBe(35);
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Matosinhos',
          slug: 'matosinhos',
          max_capacity: 35,
          default_people_per_table: 4,
          auto_table_assignment: false,
          auto_reservations: false,
          is_active: true,
        })
      );
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve mapear order_cooldown_minutes na criação', async () => {
      const dataWithCooldown: CreateRestaurantData = {
        name: 'Cooldown Test',
        slug: 'cooldown-test',
        address: 'Address',
        maxCapacity: 30,
        defaultPeoplePerTable: 3,
        orderCooldownMinutes: 5,
      };

      const dbRow = createDatabaseRestaurant({
        name: 'Cooldown Test',
        slug: 'cooldown-test',
        order_cooldown_minutes: 5,
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.create(dataWithCooldown);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_cooldown_minutes: 5,
        })
      );
      expect(result.orderCooldownMinutes).toBe(5);
    });

    it('deve usar 0 como padrão para order_cooldown_minutes', async () => {
      const minimalData: CreateRestaurantData = {
        name: 'No Cooldown',
        slug: 'no-cooldown',
        address: 'Address',
        maxCapacity: 20,
        defaultPeoplePerTable: 2,
      };

      const dbRow = createDatabaseRestaurant({ order_cooldown_minutes: 0 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create(minimalData);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_cooldown_minutes: 0,
        })
      );
    });

    it('deve mapear latitude e longitude null corretamente', async () => {
      const minimalData: CreateRestaurantData = {
        name: 'Minimal',
        slug: 'minimal',
        address: 'Address',
        maxCapacity: 20,
        defaultPeoplePerTable: 2,
      };

      const dbRow = createDatabaseRestaurant({
        latitude: null,
        longitude: null,
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create(minimalData);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: null,
          longitude: null,
        })
      );
    });

    it('deve lançar erro quando insert falha', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Unique constraint violation' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.create(createData)).rejects.toThrow('Unique constraint violation');
    });
  });

  // =====================================================
  // update()
  // =====================================================
  describe('update', () => {
    const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
    const updateData: UpdateRestaurantData = {
      name: 'Circunvalação Atualizado',
      maxCapacity: 60,
    };

    it('deve atualizar restaurante com sucesso', async () => {
      const dbRow = createDatabaseRestaurant({
        name: 'Circunvalação Atualizado',
        max_capacity: 60,
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update(restaurantId, updateData);

      expect(result.name).toBe('Circunvalação Atualizado');
      expect(result.maxCapacity).toBe(60);
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Circunvalação Atualizado',
          max_capacity: 60,
        })
      );
      expect(builder.eq).toHaveBeenCalledWith('id', restaurantId);
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve mapear orderCooldownMinutes no update', async () => {
      const updateData: UpdateRestaurantData = {
        orderCooldownMinutes: 15,
      };

      const dbRow = createDatabaseRestaurant({ order_cooldown_minutes: 15 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update(restaurantId, updateData);

      expect(builder.update).toHaveBeenCalledWith({
        order_cooldown_minutes: 15,
      });
      expect(result.orderCooldownMinutes).toBe(15);
    });

    it('deve mapear apenas campos definidos', async () => {
      const partialUpdate: UpdateRestaurantData = {
        isActive: false,
      };

      const dbRow = createDatabaseRestaurant({ is_active: false });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update(restaurantId, partialUpdate);

      expect(builder.update).toHaveBeenCalledWith({
        is_active: false,
      });
    });

    it('deve lançar erro quando update falha', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Update failed' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.update(restaurantId, updateData)).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // delete()
  // =====================================================
  describe('delete', () => {
    const restaurantId = '123e4567-e89b-12d3-a456-426614174000';

    it('deve eliminar restaurante com sucesso', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      await repository.delete(restaurantId);

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', restaurantId);
    });

    it('deve lançar erro quando delete falha', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Foreign key constraint' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.delete(restaurantId)).rejects.toThrow('Foreign key constraint');
    });
  });

  // =====================================================
  // validateSlugUnique()
  // =====================================================
  describe('validateSlugUnique', () => {
    it('deve retornar true quando slug é único', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      const result = await repository.validateSlugUnique('novo-slug');

      expect(result).toBe(true);
      expect(builder.eq).toHaveBeenCalledWith('slug', 'novo-slug');
    });

    it('deve retornar false quando slug já existe', async () => {
      const builder = mockClient._createBuilder({
        data: [{ id: '123e4567-e89b-12d3-a456-426614174000' }],
        error: null,
      });
      mockClient._setBuilder(builder);

      const result = await repository.validateSlugUnique('circunvalacao');

      expect(result).toBe(false);
    });

    it('deve excluir ID específico na validação', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      const excludeId = '123e4567-e89b-12d3-a456-426614174000';
      const result = await repository.validateSlugUnique('circunvalacao', excludeId);

      expect(result).toBe(true);
      expect(builder.neq).toHaveBeenCalledWith('id', excludeId);
    });

    it('deve lançar erro quando query falha', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Query error' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.validateSlugUnique('slug')).rejects.toThrow('Query error');
    });
  });

  // =====================================================
  // Mappers (snake_case ↔ camelCase)
  // =====================================================
  describe('Data mapping', () => {
    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDatabaseRestaurant({
        max_capacity: 100,
        default_people_per_table: 6,
        auto_table_assignment: true,
        auto_reservations: true,
        is_active: false,
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0]).toMatchObject({
        maxCapacity: 100,
        defaultPeoplePerTable: 6,
        autoTableAssignment: true,
        autoReservations: true,
        orderCooldownMinutes: 0,
        isActive: false,
      });
      expect(result[0]).not.toHaveProperty('max_capacity');
      expect(result[0]).not.toHaveProperty('is_active');
    });
  });
});
