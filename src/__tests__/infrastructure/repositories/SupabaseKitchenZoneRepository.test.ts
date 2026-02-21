import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseKitchenZoneRepository } from '@/infrastructure/repositories/SupabaseKitchenZoneRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Tests for SupabaseKitchenZoneRepository
 */

// Helper to create database row format (snake_case)
function createDbZone(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: 'zone-1',
    name: 'Quentes',
    slug: 'quentes',
    color: '#EF4444',
    sort_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseKitchenZoneRepository', () => {
  let repository: SupabaseKitchenZoneRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseKitchenZoneRepository(mockClient as any);
  });

  // =====================================================
  // findAll()
  // =====================================================
  describe('findAll', () => {
    it('deve retornar todas as zonas mapeadas', async () => {
      const dbRows = [
        createDbZone({ id: 'zone-1', name: 'Quentes', sort_order: 1 }),
        createDbZone({ id: 'zone-2', name: 'Frios', slug: 'frios', sort_order: 2 }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Quentes');
      expect(result[0].sortOrder).toBe(1);
      expect(result[1].name).toBe('Frios');
      expect(mockClient.from).toHaveBeenCalledWith('kitchen_zones');
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

    it('deve ordenar por sort_order ascendente', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll();

      expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });
  });

  // =====================================================
  // findActive()
  // =====================================================
  describe('findActive', () => {
    it('deve filtrar por is_active=true', async () => {
      const dbRows = [createDbZone({ is_active: true })];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findActive();

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
      expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });

    it('deve retornar array vazio quando não há zonas ativas', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.findActive();

      expect(result).toEqual([]);
    });

    it('deve lançar erro quando query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Query error' },
      });

      await expect(repository.findActive()).rejects.toThrow('Query error');
    });
  });

  // =====================================================
  // findAllWithCategoryCount()
  // =====================================================
  describe('findAllWithCategoryCount', () => {
    it('deve retornar zonas com contagem de categorias', async () => {
      const zoneData = [
        createDbZone({ id: 'zone-1', name: 'Quentes' }),
        createDbZone({ id: 'zone-2', name: 'Frios', slug: 'frios' }),
      ];
      const catData = [
        { zone_id: 'zone-1' },
        { zone_id: 'zone-1' },
        { zone_id: 'zone-2' },
      ];

      const zoneBuilder = mockClient._createBuilder({ data: zoneData, error: null });
      const catBuilder = mockClient._createBuilder({ data: catData, error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? zoneBuilder : catBuilder;
      });

      const result = await repository.findAllWithCategoryCount();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Quentes');
      expect(result[0].categoryCount).toBe(2);
      expect(result[1].name).toBe('Frios');
      expect(result[1].categoryCount).toBe(1);
    });

    it('deve retornar 0 para zonas sem categorias', async () => {
      const zoneData = [createDbZone({ id: 'zone-1' })];
      const catData: { zone_id: string | null }[] = [];

      const zoneBuilder = mockClient._createBuilder({ data: zoneData, error: null });
      const catBuilder = mockClient._createBuilder({ data: catData, error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? zoneBuilder : catBuilder;
      });

      const result = await repository.findAllWithCategoryCount();

      expect(result[0].categoryCount).toBe(0);
    });

    it('deve ignorar categorias sem zone_id', async () => {
      const zoneData = [createDbZone({ id: 'zone-1' })];
      const catData = [
        { zone_id: 'zone-1' },
        { zone_id: null },
      ];

      const zoneBuilder = mockClient._createBuilder({ data: zoneData, error: null });
      const catBuilder = mockClient._createBuilder({ data: catData, error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? zoneBuilder : catBuilder;
      });

      const result = await repository.findAllWithCategoryCount();

      expect(result[0].categoryCount).toBe(1);
    });

    it('deve chamar from com kitchen_zones e categories', async () => {
      const zoneBuilder = mockClient._createBuilder({ data: [], error: null });
      const catBuilder = mockClient._createBuilder({ data: [], error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? zoneBuilder : catBuilder;
      });

      await repository.findAllWithCategoryCount();

      expect(mockClient.from).toHaveBeenCalledWith('kitchen_zones');
      expect(mockClient.from).toHaveBeenCalledWith('categories');
    });

    it('deve lançar erro se query de zonas falhar', async () => {
      const zoneBuilder = mockClient._createBuilder({ data: null, error: { message: 'Zone error' } });
      const catBuilder = mockClient._createBuilder({ data: [], error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? zoneBuilder : catBuilder;
      });

      await expect(repository.findAllWithCategoryCount()).rejects.toThrow('Zone error');
    });

    it('deve lançar erro se query de categorias falhar', async () => {
      const zoneBuilder = mockClient._createBuilder({ data: [], error: null });
      const catBuilder = mockClient._createBuilder({ data: null, error: { message: 'Cat error' } });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? zoneBuilder : catBuilder;
      });

      await expect(repository.findAllWithCategoryCount()).rejects.toThrow('Cat error');
    });
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar zona por ID', async () => {
      const dbRow = createDbZone({ id: 'zone-1', name: 'Quentes' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('zone-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('zone-1');
      expect(result?.name).toBe('Quentes');
      expect(builder.eq).toHaveBeenCalledWith('id', 'zone-1');
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve retornar null quando zona não existe (PGRST116)', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      mockClient._setBuilder(builder);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros de BD', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'OTHER', message: 'Internal error' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.findById('zone-1')).rejects.toThrow('Internal error');
    });
  });

  // =====================================================
  // findBySlug()
  // =====================================================
  describe('findBySlug', () => {
    it('deve retornar zona por slug', async () => {
      const dbRow = createDbZone({ slug: 'frios' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findBySlug('frios');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('frios');
      expect(builder.eq).toHaveBeenCalledWith('slug', 'frios');
    });

    it('deve retornar null quando slug não existe', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      mockClient._setBuilder(builder);

      const result = await repository.findBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar zona com todos os campos mapeados', async () => {
      const dbRow = createDbZone({ id: 'new-zone', name: 'Bar', slug: 'bar', color: '#F59E0B' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.create({
        name: 'Bar',
        slug: 'bar',
        color: '#F59E0B',
        sortOrder: 3,
        isActive: true,
      });

      expect(result.name).toBe('Bar');
      expect(result.color).toBe('#F59E0B');
      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Bar',
        slug: 'bar',
        color: '#F59E0B',
        sort_order: 3,
        is_active: true,
      });
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve usar valores padrão quando não fornecidos', async () => {
      const dbRow = createDbZone();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Test',
        slug: 'test',
      });

      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Test',
        slug: 'test',
        color: '#6B7280',
        sort_order: 0,
        is_active: true,
      });
    });

    it('deve lançar erro se insert falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Unique constraint violation' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.create({ name: 'Dup', slug: 'dup' })).rejects.toThrow('Unique constraint violation');
    });
  });

  // =====================================================
  // update()
  // =====================================================
  describe('update', () => {
    it('deve atualizar zona com todos os campos', async () => {
      const dbRow = createDbZone({ name: 'Quentes Atualizado', color: '#FF0000' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update('zone-1', {
        name: 'Quentes Atualizado',
        slug: 'quentes-atualizado',
        color: '#FF0000',
        sortOrder: 5,
        isActive: false,
      });

      expect(result.name).toBe('Quentes Atualizado');
      expect(builder.update).toHaveBeenCalledWith({
        name: 'Quentes Atualizado',
        slug: 'quentes-atualizado',
        color: '#FF0000',
        sort_order: 5,
        is_active: false,
      });
      expect(builder.eq).toHaveBeenCalledWith('id', 'zone-1');
    });

    it('deve mapear apenas campos definidos (atualização parcial)', async () => {
      const dbRow = createDbZone({ name: 'Novo Nome' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('zone-1', { name: 'Novo Nome' });

      expect(builder.update).toHaveBeenCalledWith({ name: 'Novo Nome' });
    });

    it('deve mapear isActive para is_active', async () => {
      const dbRow = createDbZone({ is_active: false });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('zone-1', { isActive: false });

      expect(builder.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('deve lançar erro se update falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Update failed' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.update('zone-1', { name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // delete()
  // =====================================================
  describe('delete', () => {
    it('deve eliminar zona por ID', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      await repository.delete('zone-1');

      expect(mockClient.from).toHaveBeenCalledWith('kitchen_zones');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'zone-1');
    });

    it('deve lançar erro se delete falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'FK constraint' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.delete('zone-1')).rejects.toThrow('FK constraint');
    });
  });

  // =====================================================
  // validateSlugUnique()
  // =====================================================
  describe('validateSlugUnique', () => {
    it('deve retornar true quando slug é único', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      const result = await repository.validateSlugUnique('new-slug');

      expect(result).toBe(true);
      expect(builder.eq).toHaveBeenCalledWith('slug', 'new-slug');
    });

    it('deve retornar false quando slug já existe', async () => {
      const builder = mockClient._createBuilder({ data: [{ id: 'zone-1' }], error: null });
      mockClient._setBuilder(builder);

      const result = await repository.validateSlugUnique('quentes');

      expect(result).toBe(false);
    });

    it('deve excluir ID fornecido da verificação', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.validateSlugUnique('quentes', 'zone-1');

      expect(builder.eq).toHaveBeenCalledWith('slug', 'quentes');
      expect(builder.neq).toHaveBeenCalledWith('id', 'zone-1');
    });

    it('deve lançar erro se query falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Query error' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.validateSlugUnique('test')).rejects.toThrow('Query error');
    });
  });

  // =====================================================
  // Data mapping (snake_case -> camelCase)
  // =====================================================
  describe('Data mapping', () => {
    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbZone({
        id: 'zone-1',
        name: 'Quentes',
        slug: 'quentes',
        color: '#EF4444',
        sort_order: 3,
        is_active: true,
        created_at: '2024-06-15T10:30:00.000Z',
        updated_at: '2024-06-15T12:00:00.000Z',
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('zone-1');

      expect(result).toMatchObject({
        id: 'zone-1',
        name: 'Quentes',
        slug: 'quentes',
        color: '#EF4444',
        sortOrder: 3,
        isActive: true,
      });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.createdAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.updatedAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
      expect(result).not.toHaveProperty('sort_order');
      expect(result).not.toHaveProperty('is_active');
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('updated_at');
    });
  });
});
