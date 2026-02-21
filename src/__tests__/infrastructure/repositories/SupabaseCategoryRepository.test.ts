import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseCategoryRepository } from '@/infrastructure/repositories/SupabaseCategoryRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Tests for SupabaseCategoryRepository
 *
 * These tests verify the repository's data mapping and query logic.
 * They use a mocked Supabase client to test without database dependencies.
 */

// Helper to create database row format (snake_case)
function createDbCategory(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  zone_id: string | null;
  created_at: string;
}> = {}) {
  return {
    id: 'cat-1',
    name: 'Sushi',
    slug: 'sushi',
    icon: '🍣',
    sort_order: 1,
    zone_id: null,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseCategoryRepository', () => {
  let repository: SupabaseCategoryRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseCategoryRepository(mockClient as any);
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar categoria por ID', async () => {
      const dbRow = createDbCategory({ id: 'cat-1', name: 'Sushi' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('cat-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('cat-1');
      expect(result?.name).toBe('Sushi');
      expect(result?.sortOrder).toBe(1);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(mockClient.from).toHaveBeenCalledWith('categories');
      expect(builder.eq).toHaveBeenCalledWith('id', 'cat-1');
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve retornar null quando categoria não existe', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      mockClient._setBuilder(builder);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve retornar null quando data é null sem erro', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('cat-1');

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // findBySlug()
  // =====================================================
  describe('findBySlug', () => {
    it('deve retornar categoria por slug', async () => {
      const dbRow = createDbCategory({ slug: 'sashimi' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findBySlug('sashimi');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('sashimi');
      expect(mockClient.from).toHaveBeenCalledWith('categories');
      expect(builder.eq).toHaveBeenCalledWith('slug', 'sashimi');
      expect(builder.single).toHaveBeenCalled();
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

    it('deve retornar null quando data é null sem erro', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findBySlug('sushi');

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // findAll()
  // =====================================================
  describe('findAll', () => {
    it('deve retornar todas as categorias mapeadas', async () => {
      const dbRows = [
        createDbCategory({ id: 'cat-1', name: 'Sushi', sort_order: 1 }),
        createDbCategory({ id: 'cat-2', name: 'Sashimi', slug: 'sashimi', sort_order: 2 }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sushi');
      expect(result[0].sortOrder).toBe(1);
      expect(result[1].name).toBe('Sashimi');
      expect(result[1].sortOrder).toBe(2);
      expect(mockClient.from).toHaveBeenCalledWith('categories');
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

    it('deve converter datas corretamente', async () => {
      const dbRows = [createDbCategory({ created_at: '2024-06-15T10:30:00.000Z' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
    });
  });

  // =====================================================
  // findAllWithCount()
  // =====================================================
  describe('findAllWithCount', () => {
    it('deve retornar categorias com contagem de produtos', async () => {
      const catData = [
        createDbCategory({ id: 'cat-1', name: 'Sushi' }),
        createDbCategory({ id: 'cat-2', name: 'Sashimi', slug: 'sashimi' }),
      ];
      const prodData = [
        { category_id: 'cat-1' },
        { category_id: 'cat-1' },
        { category_id: 'cat-2' },
      ];

      const catBuilder = mockClient._createBuilder({ data: catData, error: null });
      const prodBuilder = mockClient._createBuilder({ data: prodData, error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? catBuilder : prodBuilder;
      });

      const result = await repository.findAllWithCount();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sushi');
      expect(result[0].productCount).toBe(2);
      expect(result[1].name).toBe('Sashimi');
      expect(result[1].productCount).toBe(1);
    });

    it('deve retornar 0 para categorias sem produtos', async () => {
      const catData = [createDbCategory({ id: 'cat-1' })];
      const prodData: { category_id: string }[] = [];

      const catBuilder = mockClient._createBuilder({ data: catData, error: null });
      const prodBuilder = mockClient._createBuilder({ data: prodData, error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? catBuilder : prodBuilder;
      });

      const result = await repository.findAllWithCount();

      expect(result[0].productCount).toBe(0);
    });

    it('deve chamar from com categories e products', async () => {
      const catBuilder = mockClient._createBuilder({ data: [], error: null });
      const prodBuilder = mockClient._createBuilder({ data: [], error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? catBuilder : prodBuilder;
      });

      await repository.findAllWithCount();

      expect(mockClient.from).toHaveBeenCalledWith('categories');
      expect(mockClient.from).toHaveBeenCalledWith('products');
    });

    it('deve lançar erro se query de categorias falhar', async () => {
      const catBuilder = mockClient._createBuilder({ data: null, error: { message: 'Cat error' } });
      const prodBuilder = mockClient._createBuilder({ data: [], error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? catBuilder : prodBuilder;
      });

      await expect(repository.findAllWithCount()).rejects.toThrow('Cat error');
    });

    it('deve lançar erro se query de produtos falhar', async () => {
      const catBuilder = mockClient._createBuilder({ data: [], error: null });
      const prodBuilder = mockClient._createBuilder({ data: null, error: { message: 'Prod error' } });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? catBuilder : prodBuilder;
      });

      await expect(repository.findAllWithCount()).rejects.toThrow('Prod error');
    });

    it('deve mapear campos snake_case para camelCase nas categorias com contagem', async () => {
      const catData = [createDbCategory({ id: 'cat-1', sort_order: 5 })];
      const prodData = [{ category_id: 'cat-1' }];

      const catBuilder = mockClient._createBuilder({ data: catData, error: null });
      const prodBuilder = mockClient._createBuilder({ data: prodData, error: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? catBuilder : prodBuilder;
      });

      const result = await repository.findAllWithCount();

      expect(result[0].sortOrder).toBe(5);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].productCount).toBe(1);
    });
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar categoria com todos os campos mapeados', async () => {
      const dbRow = createDbCategory({ id: 'new-cat', name: 'Tempura', slug: 'tempura', icon: '🍤', sort_order: 3 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.create({
        name: 'Tempura',
        slug: 'tempura',
        icon: '🍤',
        sortOrder: 3,
      });

      expect(result.name).toBe('Tempura');
      expect(result.slug).toBe('tempura');
      expect(result.icon).toBe('🍤');
      expect(result.sortOrder).toBe(3);
      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Tempura',
        slug: 'tempura',
        icon: '🍤',
        sort_order: 3,
        zone_id: null,
      });
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve usar null para icon quando não fornecido', async () => {
      const dbRow = createDbCategory({ icon: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Bebidas',
        slug: 'bebidas',
      });

      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Bebidas',
        slug: 'bebidas',
        icon: null,
        sort_order: 0,
        zone_id: null,
      });
    });

    it('deve usar 0 como sortOrder padrão', async () => {
      const dbRow = createDbCategory({ sort_order: 0 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Test',
        slug: 'test',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 0 })
      );
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
    it('deve atualizar categoria com todos os campos', async () => {
      const dbRow = createDbCategory({ name: 'Sushi Atualizado', sort_order: 10 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update('cat-1', {
        name: 'Sushi Atualizado',
        slug: 'sushi-atualizado',
        icon: '🍱',
        sortOrder: 10,
      });

      expect(result.name).toBe('Sushi Atualizado');
      expect(result.sortOrder).toBe(10);
      expect(builder.update).toHaveBeenCalledWith({
        name: 'Sushi Atualizado',
        slug: 'sushi-atualizado',
        icon: '🍱',
        sort_order: 10,
      });
      expect(builder.eq).toHaveBeenCalledWith('id', 'cat-1');
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve mapear apenas campos definidos (atualização parcial)', async () => {
      const dbRow = createDbCategory({ name: 'Novo Nome' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('cat-1', { name: 'Novo Nome' });

      expect(builder.update).toHaveBeenCalledWith({ name: 'Novo Nome' });
    });

    it('deve mapear sortOrder para sort_order', async () => {
      const dbRow = createDbCategory({ sort_order: 99 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('cat-1', { sortOrder: 99 });

      expect(builder.update).toHaveBeenCalledWith({ sort_order: 99 });
    });

    it('deve incluir icon quando definido', async () => {
      const dbRow = createDbCategory({ icon: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('cat-1', { icon: null });

      expect(builder.update).toHaveBeenCalledWith({ icon: null });
    });

    it('deve lançar erro se update falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Update failed' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.update('cat-1', { name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // delete()
  // =====================================================
  describe('delete', () => {
    it('deve eliminar categoria por ID', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      await repository.delete('cat-1');

      expect(mockClient.from).toHaveBeenCalledWith('categories');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'cat-1');
    });

    it('deve lançar erro se delete falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'FK constraint' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.delete('cat-1')).rejects.toThrow('FK constraint');
    });
  });

  // =====================================================
  // Data mapping (snake_case -> camelCase)
  // =====================================================
  describe('Data mapping', () => {
    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbCategory({
        id: 'cat-1',
        name: 'Sushi',
        slug: 'sushi',
        icon: '🍣',
        sort_order: 5,
        created_at: '2024-06-15T10:30:00.000Z',
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('cat-1');

      expect(result).toMatchObject({
        id: 'cat-1',
        name: 'Sushi',
        slug: 'sushi',
        icon: '🍣',
        sortOrder: 5,
      });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.createdAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
      expect(result).not.toHaveProperty('sort_order');
      expect(result).not.toHaveProperty('created_at');
    });

    it('deve tratar icon null correctamente', async () => {
      const dbRow = createDbCategory({ icon: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('cat-1');

      expect(result?.icon).toBeNull();
    });

    it('deve mapear zone_id para zoneId', async () => {
      const dbRow = createDbCategory({ zone_id: 'zone-1' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('cat-1');

      expect(result?.zoneId).toBe('zone-1');
      expect(result).not.toHaveProperty('zone_id');
    });

    it('deve tratar zone_id null correctamente', async () => {
      const dbRow = createDbCategory({ zone_id: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('cat-1');

      expect(result?.zoneId).toBeNull();
    });
  });

  // =====================================================
  // create() - zone_id mapping
  // =====================================================
  describe('create - zone_id', () => {
    it('deve mapear zoneId para zone_id no insert', async () => {
      const dbRow = createDbCategory({ zone_id: 'zone-1' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Test',
        slug: 'test',
        zoneId: 'zone-1',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ zone_id: 'zone-1' })
      );
    });

    it('deve usar null quando zoneId não fornecido', async () => {
      const dbRow = createDbCategory();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Test',
        slug: 'test',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ zone_id: null })
      );
    });
  });

  // =====================================================
  // update() - zone_id mapping
  // =====================================================
  describe('update - zone_id', () => {
    it('deve mapear zoneId para zone_id no update', async () => {
      const dbRow = createDbCategory({ zone_id: 'zone-2' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('cat-1', { zoneId: 'zone-2' });

      expect(builder.update).toHaveBeenCalledWith({ zone_id: 'zone-2' });
    });

    it('deve permitir remover zona (zoneId null)', async () => {
      const dbRow = createDbCategory({ zone_id: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('cat-1', { zoneId: null });

      expect(builder.update).toHaveBeenCalledWith({ zone_id: null });
    });

    it('não deve incluir zone_id quando zoneId é undefined', async () => {
      const dbRow = createDbCategory();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('cat-1', { name: 'Updated' });

      expect(builder.update).toHaveBeenCalledWith({ name: 'Updated' });
    });
  });
});
