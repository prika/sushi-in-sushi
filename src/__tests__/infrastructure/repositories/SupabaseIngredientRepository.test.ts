import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseIngredientRepository } from '@/infrastructure/repositories/SupabaseIngredientRepository';

// Query builder mock following existing pattern
function createQueryBuilder(data: unknown = null, error: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.delete = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.ilike = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue({ data, error });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  builder.order = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data : data ? [data] : [], error });

  return builder;
}

function createMockSupabase(builder: Record<string, ReturnType<typeof vi.fn>>) {
  return {
    from: vi.fn().mockReturnValue(builder),
  } as unknown as Parameters<typeof SupabaseIngredientRepository extends { new(client?: infer C): unknown } ? (client: C) => void : never>[0];
}

const sampleDbIngredient = {
  id: 'ing-1',
  name: 'Salmão',
  name_translations: { pt: 'Salmão', en: 'Salmon', fr: 'Saumon' },
  unit: 'g',
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('SupabaseIngredientRepository', () => {
  let builder: Record<string, ReturnType<typeof vi.fn>>;
  let repo: SupabaseIngredientRepository;

  beforeEach(() => {
    builder = createQueryBuilder();
    const mockClient = createMockSupabase(builder);
    repo = new SupabaseIngredientRepository(mockClient as never);
  });

  // ============
  // findById
  // ============
  describe('findById', () => {
    it('deve retornar ingrediente pelo ID', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: sampleDbIngredient, error: null });

      const result = await repo.findById('ing-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('ing-1');
      expect(result?.name).toBe('Salmão');
      expect(result?.unit).toBe('g');
      expect(result?.sortOrder).toBe(0);
      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it('deve mapear name_translations para nameTranslations', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: sampleDbIngredient, error: null });

      const result = await repo.findById('ing-1');

      expect(result?.nameTranslations).toEqual({ pt: 'Salmão', en: 'Salmon', fr: 'Saumon' });
    });

    it('deve retornar objeto vazio quando name_translations é null', async () => {
      builder.single = vi.fn().mockResolvedValue({
        data: { ...sampleDbIngredient, name_translations: null },
        error: null,
      });

      const result = await repo.findById('ing-1');

      expect(result?.nameTranslations).toEqual({});
    });

    it('deve retornar null se ingrediente não existir', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });

      const result = await repo.findById('ing-999');

      expect(result).toBeNull();
    });
  });

  // ============
  // findByName
  // ============
  describe('findByName', () => {
    it('deve retornar ingrediente pelo nome', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: sampleDbIngredient, error: null });

      const result = await repo.findByName('Salmão');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Salmão');
      expect(builder.ilike).toHaveBeenCalledWith('name', 'Salmão');
    });

    it('deve retornar null se nome não existir', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });

      const result = await repo.findByName('Inexistente');

      expect(result).toBeNull();
    });
  });

  // ============
  // findAll
  // ============
  describe('findAll', () => {
    it('deve retornar todos os ingredientes ordenados', async () => {
      const ingredients = [
        { ...sampleDbIngredient, id: 'ing-1', name: 'Arroz', sort_order: 0 },
        { ...sampleDbIngredient, id: 'ing-2', name: 'Salmão', sort_order: 1 },
      ];
      builder.order = vi.fn().mockResolvedValue({ data: ingredients, error: null });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Arroz');
      expect(result[1].name).toBe('Salmão');
      expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });

    it('deve retornar lista vazia', async () => {
      builder.order = vi.fn().mockResolvedValue({ data: [], error: null });

      const result = await repo.findAll();

      expect(result).toHaveLength(0);
    });

    it('deve lançar erro se query falhar', async () => {
      builder.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(repo.findAll()).rejects.toThrow('DB error');
    });
  });

  // ============
  // create
  // ============
  describe('create', () => {
    it('deve criar ingrediente com sucesso', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: sampleDbIngredient, error: null });

      const result = await repo.create({ name: 'Salmão', unit: 'g' });

      expect(result.name).toBe('Salmão');
      expect(result.unit).toBe('g');
      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Salmão',
        unit: 'g',
        sort_order: 0,
      });
    });

    it('deve usar sortOrder se fornecido', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: { ...sampleDbIngredient, sort_order: 5 }, error: null });

      await repo.create({ name: 'Salmão', unit: 'g', sortOrder: 5 });

      expect(builder.insert).toHaveBeenCalledWith({
        name: 'Salmão',
        unit: 'g',
        sort_order: 5,
      });
    });

    it('deve lançar erro se insert falhar', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'unique violation' } });

      await expect(repo.create({ name: 'Salmão', unit: 'g' })).rejects.toThrow('unique violation');
    });
  });

  // ============
  // update
  // ============
  describe('update', () => {
    it('deve atualizar ingrediente com sucesso', async () => {
      // update().eq().select().single() chain
      builder.single = vi.fn().mockResolvedValue({
        data: { ...sampleDbIngredient, name: 'Atum' },
        error: null,
      });

      const result = await repo.update('ing-1', { name: 'Atum' });

      expect(result.name).toBe('Atum');
      expect(builder.update).toHaveBeenCalledWith({ name: 'Atum' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'ing-1');
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      builder.single = vi.fn().mockResolvedValue({
        data: { ...sampleDbIngredient, unit: 'kg' },
        error: null,
      });

      await repo.update('ing-1', { unit: 'kg' });

      expect(builder.update).toHaveBeenCalledWith({ unit: 'kg' });
    });

    it('deve lançar erro se ingrediente não encontrado', async () => {
      builder.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });

      await expect(repo.update('ing-999', { name: 'Test' })).rejects.toThrow('not found');
    });
  });

  // ============
  // delete
  // ============
  describe('delete', () => {
    it('deve eliminar ingrediente com sucesso', async () => {
      builder.eq = vi.fn().mockResolvedValue({ error: null });

      await repo.delete('ing-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'ing-1');
    });

    it('deve lançar erro se delete falhar', async () => {
      builder.eq = vi.fn().mockResolvedValue({ error: { message: 'FK constraint' } });

      await expect(repo.delete('ing-1')).rejects.toThrow('FK constraint');
    });
  });
});
