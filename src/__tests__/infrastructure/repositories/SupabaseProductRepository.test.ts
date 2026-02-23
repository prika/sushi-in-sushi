import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseProductRepository } from '@/infrastructure/repositories/SupabaseProductRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Tests for SupabaseProductRepository
 *
 * These tests verify the repository's data mapping and query logic.
 * They use a mocked Supabase client to test without database dependencies.
 */

// Helper to create database row format (snake_case)
function createDbProduct(overrides: Partial<{
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  image_urls: string[] | null;
  is_available: boolean;
  is_rodizio: boolean;
  sort_order: number;
  service_modes: string[] | null;
  service_prices: Record<string, number> | null;
  ingredients: Array<{ name: string; quantity: string; unit: string }> | null;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: 'prod-1',
    name: 'Salmon Nigiri',
    description: 'Fresh salmon on rice',
    price: 4.50,
    category_id: 'cat-1',
    image_url: 'https://example.com/salmon.jpg',
    image_urls: ['https://example.com/salmon.jpg', 'https://example.com/salmon2.jpg'],
    is_available: true,
    is_rodizio: false,
    sort_order: 1,
    service_modes: ['dine_in'],
    service_prices: { dine_in: 4.50 },
    ingredients: [{ name: 'Salmon', quantity: '50', unit: 'g' }],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

// Helper to create database row with category join data
function createDbProductWithCategory(overrides: Partial<ReturnType<typeof createDbProduct>> & {
  category?: { id: string; name: string; slug: string; icon: string | null } | null;
} = {}) {
  const { category, ...productOverrides } = overrides;
  return {
    ...createDbProduct(productOverrides),
    category: category !== undefined ? category : {
      id: 'cat-1',
      name: 'Sushi',
      slug: 'sushi',
      icon: '🍣',
    },
  };
}

describe('SupabaseProductRepository', () => {
  let repository: SupabaseProductRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseProductRepository(mockClient as any);
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar produto por ID', async () => {
      const dbRow = createDbProduct({ id: 'prod-1' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('prod-1');
      expect(result?.name).toBe('Salmon Nigiri');
      expect(result?.categoryId).toBe('cat-1');
      expect(result?.isAvailable).toBe(true);
      expect(result?.sortOrder).toBe(1);
      expect(mockClient.from).toHaveBeenCalledWith('products');
      expect(builder.eq).toHaveBeenCalledWith('id', 'prod-1');
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve retornar null quando produto não existe', async () => {
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

      const result = await repository.findById('prod-1');

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // findByIdWithCategory()
  // =====================================================
  describe('findByIdWithCategory', () => {
    it('deve retornar produto com dados da categoria', async () => {
      const dbRow = createDbProductWithCategory();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findByIdWithCategory('prod-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('prod-1');
      expect(result?.category.id).toBe('cat-1');
      expect(result?.category.name).toBe('Sushi');
      expect(result?.category.slug).toBe('sushi');
      expect(result?.category.icon).toBe('🍣');
      expect(mockClient.from).toHaveBeenCalledWith('products');
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve usar fallback quando categoria é null', async () => {
      const dbRow = createDbProductWithCategory({ category: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findByIdWithCategory('prod-1');

      expect(result).not.toBeNull();
      expect(result?.category.id).toBe('');
      expect(result?.category.name).toBe('Sem categoria');
      expect(result?.category.slug).toBe('');
      expect(result?.category.icon).toBeNull();
    });

    it('deve retornar null quando produto não existe', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      mockClient._setBuilder(builder);

      const result = await repository.findByIdWithCategory('non-existent');

      expect(result).toBeNull();
    });
  });

  // =====================================================
  // findAll()
  // =====================================================
  describe('findAll', () => {
    it('deve retornar todos os produtos sem filtro', async () => {
      const dbRows = [
        createDbProduct({ id: 'prod-1', name: 'Salmon Nigiri' }),
        createDbProduct({ id: 'prod-2', name: 'Tuna Sashimi', sort_order: 2 }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Salmon Nigiri');
      expect(result[1].name).toBe('Tuna Sashimi');
      expect(mockClient.from).toHaveBeenCalledWith('products');
    });

    it('deve filtrar por categoryId', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ categoryId: 'cat-1' });

      expect(builder.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });

    it('deve filtrar por onlyAvailable', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ onlyAvailable: true });

      expect(builder.eq).toHaveBeenCalledWith('is_available', true);
    });

    it('deve filtrar por onlyRodizio true', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ onlyRodizio: true });

      expect(builder.eq).toHaveBeenCalledWith('is_rodizio', true);
    });

    it('deve filtrar por onlyRodizio false', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ onlyRodizio: false });

      expect(builder.eq).toHaveBeenCalledWith('is_rodizio', false);
    });

    it('deve filtrar por searchQuery no nome', async () => {
      const dbRows = [
        createDbProduct({ id: 'prod-1', name: 'Salmon Nigiri', description: 'Delicious fish' }),
        createDbProduct({ id: 'prod-2', name: 'Tuna Roll', description: 'Fresh tuna' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll({ searchQuery: 'salmon' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Salmon Nigiri');
    });

    it('deve filtrar por searchQuery na descrição', async () => {
      const dbRows = [
        createDbProduct({ id: 'prod-1', name: 'Nigiri', description: 'Fresh salmon on rice' }),
        createDbProduct({ id: 'prod-2', name: 'Roll', description: 'Avocado roll' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll({ searchQuery: 'avocado' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Roll');
    });

    it('deve ordenar por sort_order ascendente', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll();

      expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });

    it('deve lançar erro quando Supabase retorna erro', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(repository.findAll()).rejects.toThrow('Database error');
    });

    it('deve retornar array vazio quando não há dados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // findAllWithCategory()
  // =====================================================
  describe('findAllWithCategory', () => {
    it('deve retornar produtos com dados da categoria', async () => {
      const dbRows = [createDbProductWithCategory()];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAllWithCategory();

      expect(result).toHaveLength(1);
      expect(result[0].category.name).toBe('Sushi');
      expect(result[0].name).toBe('Salmon Nigiri');
    });

    it('deve aplicar filtros de categoria e disponibilidade', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAllWithCategory({ categoryId: 'cat-1', onlyAvailable: true });

      expect(builder.eq).toHaveBeenCalledWith('category_id', 'cat-1');
      expect(builder.eq).toHaveBeenCalledWith('is_available', true);
    });

    it('deve filtrar por searchQuery', async () => {
      const dbRows = [
        createDbProductWithCategory({ name: 'Salmon Nigiri' }),
        createDbProductWithCategory({ id: 'prod-2', name: 'Tuna Roll' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAllWithCategory({ searchQuery: 'tuna' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tuna Roll');
    });

    it('deve lançar erro quando Supabase retorna erro', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Query error' },
      });

      await expect(repository.findAllWithCategory()).rejects.toThrow('Query error');
    });
  });

  // =====================================================
  // findByCategory()
  // =====================================================
  describe('findByCategory', () => {
    it('deve delegar para findAll com categoryId', async () => {
      const dbRows = [createDbProduct({ category_id: 'cat-1' })];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findByCategory('cat-1');

      expect(result).toHaveLength(1);
      expect(builder.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });
  });

  // =====================================================
  // search()
  // =====================================================
  describe('search', () => {
    it('deve delegar para findAll com searchQuery e onlyAvailable', async () => {
      const dbRows = [
        createDbProduct({ name: 'Salmon Nigiri', is_available: true }),
      ];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.search('salmon');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Salmon Nigiri');
      expect(builder.eq).toHaveBeenCalledWith('is_available', true);
    });

    it('deve retornar vazio quando pesquisa não encontra resultados', async () => {
      const dbRows = [createDbProduct({ name: 'Salmon Nigiri' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.search('pizza');

      expect(result).toHaveLength(0);
    });
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar produto com todos os campos mapeados', async () => {
      const dbRow = createDbProduct({ id: 'new-prod' });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.create({
        name: 'Salmon Nigiri',
        price: 4.50,
        categoryId: 'cat-1',
        imageUrl: 'https://example.com/salmon.jpg',
        imageUrls: ['https://example.com/salmon.jpg', 'https://example.com/salmon2.jpg'],
        isAvailable: true,
        isRodizio: false,
        sortOrder: 1,
        serviceModes: ['dine_in'],
        servicePrices: { dine_in: 4.50 },
      });

      expect(result.id).toBe('new-prod');
      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Salmon Nigiri',
        description: null,
        price: 4.50,
        category_id: 'cat-1',
        image_url: 'https://example.com/salmon.jpg',
        image_urls: ['https://example.com/salmon.jpg', 'https://example.com/salmon2.jpg'],
        is_available: true,
        is_rodizio: false,
        sort_order: 1,
        service_modes: ['dine_in'],
        service_prices: { dine_in: 4.50 },
      });
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve calcular imageUrls a partir de imageUrl quando imageUrls não fornecido', async () => {
      const dbRow = createDbProduct();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Test',
        price: 5.00,
        categoryId: 'cat-1',
        imageUrl: 'https://example.com/test.jpg',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          image_url: 'https://example.com/test.jpg',
          image_urls: ['https://example.com/test.jpg'],
        })
      );
    });

    it('deve usar null para image_urls quando nenhuma imagem fornecida', async () => {
      const dbRow = createDbProduct({ image_url: null, image_urls: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Test',
        price: 5.00,
        categoryId: 'cat-1',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          image_url: null,
          image_urls: null,
        })
      );
    });

    it('deve usar valores padrão para campos opcionais', async () => {
      const dbRow = createDbProduct();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.create({
        name: 'Minimal',
        price: 3.00,
        categoryId: 'cat-1',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_available: true,
          is_rodizio: false,
          sort_order: 0,
          service_modes: [],
          service_prices: {},
        })
      );
    });

    it('deve lançar erro se insert falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Insert failed' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.create({
        name: 'Test',
        price: 5.00,
        categoryId: 'cat-1',
      })).rejects.toThrow('Insert failed');
    });
  });

  // =====================================================
  // update()
  // =====================================================
  describe('update', () => {
    it('deve atualizar produto com campos parciais', async () => {
      const dbRow = createDbProduct({ name: 'Updated Nigiri', price: 6.00 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update('prod-1', {
        name: 'Updated Nigiri',
        price: 6.00,
      });

      expect(result.name).toBe('Updated Nigiri');
      expect(result.price).toBe(6.00);
      expect(builder.update).toHaveBeenCalledWith({
        name: 'Updated Nigiri',
        price: 6.00,
      });
      expect(builder.eq).toHaveBeenCalledWith('id', 'prod-1');
      expect(builder.maybeSingle).toHaveBeenCalled();
    });

    it('deve sincronizar imageUrls com image_url', async () => {
      const newUrls = ['https://example.com/new1.jpg', 'https://example.com/new2.jpg'];
      const dbRow = createDbProduct({ image_urls: newUrls, image_url: newUrls[0] });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('prod-1', { imageUrls: newUrls });

      expect(builder.update).toHaveBeenCalledWith({
        image_urls: newUrls,
        image_url: 'https://example.com/new1.jpg',
      });
    });

    it('deve definir image_urls como null quando array vazio', async () => {
      const dbRow = createDbProduct({ image_urls: null, image_url: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('prod-1', { imageUrls: [] });

      expect(builder.update).toHaveBeenCalledWith({
        image_urls: null,
        image_url: null,
      });
    });

    it('deve atualizar apenas imageUrl quando imageUrls não fornecido', async () => {
      const dbRow = createDbProduct();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('prod-1', { imageUrl: 'https://example.com/single.jpg' });

      expect(builder.update).toHaveBeenCalledWith({
        image_url: 'https://example.com/single.jpg',
      });
    });

    it('deve mapear todos os campos snake_case correctamente', async () => {
      const dbRow = createDbProduct();
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      await repository.update('prod-1', {
        name: 'New Name',
        description: 'New desc',
        price: 10.00,
        categoryId: 'cat-2',
        isAvailable: false,
        isRodizio: true,
        sortOrder: 99,
        serviceModes: ['delivery', 'takeaway'],
        servicePrices: { delivery: 12.00 },
      });

      expect(builder.update).toHaveBeenCalledWith({
        name: 'New Name',
        description: 'New desc',
        price: 10.00,
        category_id: 'cat-2',
        is_available: false,
        is_rodizio: true,
        sort_order: 99,
        service_modes: ['delivery', 'takeaway'],
        service_prices: { delivery: 12.00 },
      });
    });

    it('deve lançar erro quando produto não encontrado (maybeSingle retorna null)', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      await expect(repository.update('non-existent', { name: 'Test' }))
        .rejects.toThrow('Produto não encontrado ou sem permissão para atualizar');
    });

    it('deve lançar erro quando Supabase retorna erro', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'Update failed' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.update('prod-1', { name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // updateAvailability()
  // =====================================================
  describe('updateAvailability', () => {
    it('deve delegar para update com isAvailable', async () => {
      const dbRow = createDbProduct({ is_available: false });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.updateAvailability('prod-1', false);

      expect(result.isAvailable).toBe(false);
      expect(builder.update).toHaveBeenCalledWith({ is_available: false });
    });

    it('deve ativar disponibilidade', async () => {
      const dbRow = createDbProduct({ is_available: true });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.updateAvailability('prod-1', true);

      expect(result.isAvailable).toBe(true);
      expect(builder.update).toHaveBeenCalledWith({ is_available: true });
    });
  });

  // =====================================================
  // delete()
  // =====================================================
  describe('delete', () => {
    it('deve eliminar produto por ID', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      await repository.delete('prod-1');

      expect(mockClient.from).toHaveBeenCalledWith('products');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'prod-1');
    });

    it('deve lançar erro se delete falhar', async () => {
      const builder = mockClient._createBuilder({
        data: null,
        error: { message: 'FK constraint' },
      });
      mockClient._setBuilder(builder);

      await expect(repository.delete('prod-1')).rejects.toThrow('FK constraint');
    });
  });

  // =====================================================
  // Data mapping (snake_case -> camelCase)
  // =====================================================
  describe('Data mapping', () => {
    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbProduct({
        id: 'prod-1',
        category_id: 'cat-1',
        image_url: 'https://example.com/img.jpg',
        image_urls: ['https://example.com/img.jpg'],
        is_available: true,
        is_rodizio: false,
        sort_order: 5,
        service_modes: ['dine_in', 'delivery'],
        service_prices: { dine_in: 4.50, delivery: 6.00 },
        ingredients: [{ name: 'Salmon', quantity: '50', unit: 'g' }],
        created_at: '2024-06-15T10:30:00.000Z',
        updated_at: '2024-06-16T11:00:00.000Z',
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result).toMatchObject({
        id: 'prod-1',
        categoryId: 'cat-1',
        isAvailable: true,
        isRodizio: false,
        sortOrder: 5,
        serviceModes: ['dine_in', 'delivery'],
        servicePrices: { dine_in: 4.50, delivery: 6.00 },
        ingredients: [{ name: 'Salmon', quantity: '50', unit: 'g' }],
      });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.createdAt.toISOString()).toBe('2024-06-15T10:30:00.000Z');
      expect(result?.updatedAt.toISOString()).toBe('2024-06-16T11:00:00.000Z');
      expect(result).not.toHaveProperty('category_id');
      expect(result).not.toHaveProperty('is_available');
      expect(result).not.toHaveProperty('sort_order');
    });

    it('deve normalizar imageUrls: preferir image_urls array', async () => {
      const dbRow = createDbProduct({
        image_url: 'https://example.com/legacy.jpg',
        image_urls: ['https://example.com/new1.jpg', 'https://example.com/new2.jpg'],
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.imageUrls).toEqual(['https://example.com/new1.jpg', 'https://example.com/new2.jpg']);
      expect(result?.imageUrl).toBe('https://example.com/new1.jpg');
    });

    it('deve normalizar imageUrls: fallback para [image_url] quando image_urls vazio', async () => {
      const dbRow = createDbProduct({
        image_url: 'https://example.com/legacy.jpg',
        image_urls: [],
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.imageUrls).toEqual(['https://example.com/legacy.jpg']);
      expect(result?.imageUrl).toBe('https://example.com/legacy.jpg');
    });

    it('deve normalizar imageUrls: fallback para [image_url] quando image_urls null', async () => {
      const dbRow = createDbProduct({
        image_url: 'https://example.com/legacy.jpg',
        image_urls: null,
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.imageUrls).toEqual(['https://example.com/legacy.jpg']);
      expect(result?.imageUrl).toBe('https://example.com/legacy.jpg');
    });

    it('deve normalizar imageUrls: array vazio quando ambos null', async () => {
      const dbRow = createDbProduct({
        image_url: null,
        image_urls: null,
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.imageUrls).toEqual([]);
      expect(result?.imageUrl).toBeNull();
    });

    it('deve usar created_at como fallback para updatedAt quando updated_at ausente', async () => {
      const dbRow = createDbProduct({
        created_at: '2024-01-01T00:00:00.000Z',
      });
      // Remove updated_at to simulate missing column
      delete (dbRow as any).updated_at;
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.updatedAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('deve usar array vazio para service_modes null', async () => {
      const dbRow = createDbProduct({ service_modes: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.serviceModes).toEqual([]);
    });

    it('deve usar objeto vazio para service_prices null', async () => {
      const dbRow = createDbProduct({ service_prices: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.servicePrices).toEqual({});
    });

    it('deve usar array vazio para ingredients null', async () => {
      const dbRow = createDbProduct({ ingredients: null });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findById('prod-1');

      expect(result?.ingredients).toEqual([]);
    });
  });
});
