import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProductIngredientsUseCase } from '@/application/use-cases/product-ingredients/GetProductIngredientsUseCase';
import { SetProductIngredientsUseCase } from '@/application/use-cases/product-ingredients/SetProductIngredientsUseCase';
import type { IProductIngredientRepository } from '@/domain/repositories/IProductIngredientRepository';
import type { ProductIngredient } from '@/domain/entities/ProductIngredient';

function createTestProductIngredient(
  overrides: Partial<ProductIngredient> = {}
): ProductIngredient {
  return {
    id: 'pi-1',
    productId: 'prod-1',
    ingredientId: 'ing-1',
    quantity: 50,
    ingredientName: 'Salmão',
    ingredientUnit: 'g',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockRepository(): IProductIngredientRepository {
  return {
    findByProductId: vi.fn(),
    setProductIngredients: vi.fn(),
    clearProductIngredients: vi.fn(),
  };
}

// ================================
// GetProductIngredientsUseCase
// ================================
describe('GetProductIngredientsUseCase', () => {
  let useCase: GetProductIngredientsUseCase;
  let mockRepo: IProductIngredientRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new GetProductIngredientsUseCase(mockRepo);
  });

  it('deve retornar ingredientes do produto', async () => {
    const ingredients = [
      createTestProductIngredient({ ingredientId: 'ing-1', ingredientName: 'Salmão', quantity: 50 }),
      createTestProductIngredient({ id: 'pi-2', ingredientId: 'ing-2', ingredientName: 'Arroz', quantity: 100 }),
    ];
    vi.mocked(mockRepo.findByProductId).mockResolvedValue(ingredients);

    const result = await useCase.execute('prod-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].ingredientName).toBe('Salmão');
      expect(result.data[1].ingredientName).toBe('Arroz');
    }
    expect(mockRepo.findByProductId).toHaveBeenCalledWith('prod-1');
  });

  it('deve retornar lista vazia se produto não tiver ingredientes', async () => {
    vi.mocked(mockRepo.findByProductId).mockResolvedValue([]);

    const result = await useCase.execute('prod-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro se productId estiver vazio', async () => {
    const result = await useCase.execute('');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_ID');
    }
    expect(mockRepo.findByProductId).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepo.findByProductId).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute('prod-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});

// ================================
// SetProductIngredientsUseCase
// ================================
describe('SetProductIngredientsUseCase', () => {
  let useCase: SetProductIngredientsUseCase;
  let mockRepo: IProductIngredientRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new SetProductIngredientsUseCase(mockRepo);
  });

  it('deve guardar ingredientes do produto com sucesso', async () => {
    const savedIngredients = [
      createTestProductIngredient({ ingredientId: 'ing-1', quantity: 50 }),
      createTestProductIngredient({ id: 'pi-2', ingredientId: 'ing-2', quantity: 100 }),
    ];
    vi.mocked(mockRepo.setProductIngredients).mockResolvedValue(savedIngredients);

    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [
        { ingredientId: 'ing-1', quantity: 50 },
        { ingredientId: 'ing-2', quantity: 100 },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
    expect(mockRepo.setProductIngredients).toHaveBeenCalledWith({
      productId: 'prod-1',
      ingredients: [
        { ingredientId: 'ing-1', quantity: 50 },
        { ingredientId: 'ing-2', quantity: 100 },
      ],
    });
  });

  it('deve guardar lista vazia de ingredientes', async () => {
    vi.mocked(mockRepo.setProductIngredients).mockResolvedValue([]);

    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro se productId estiver vazio', async () => {
    const result = await useCase.execute({
      productId: '',
      ingredients: [{ ingredientId: 'ing-1', quantity: 50 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_PRODUCT_ID');
    }
    expect(mockRepo.setProductIngredients).not.toHaveBeenCalled();
  });

  it('deve retornar erro se ingredientId estiver vazio', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [{ ingredientId: '', quantity: 50 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_INGREDIENT_ID');
    }
  });

  it('deve retornar erro se quantidade for zero', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [{ ingredientId: 'ing-1', quantity: 0 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_QUANTITY');
    }
  });

  it('deve retornar erro se quantidade for negativa', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [{ ingredientId: 'ing-1', quantity: -5 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_QUANTITY');
    }
  });

  it('deve retornar erro se ingredientes duplicados', async () => {
    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [
        { ingredientId: 'ing-1', quantity: 50 },
        { ingredientId: 'ing-1', quantity: 100 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DUPLICATE_INGREDIENT');
    }
    expect(mockRepo.setProductIngredients).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepo.setProductIngredients).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({
      productId: 'prod-1',
      ingredients: [{ ingredientId: 'ing-1', quantity: 50 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});
