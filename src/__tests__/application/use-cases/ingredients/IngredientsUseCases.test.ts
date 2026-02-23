import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllIngredientsUseCase } from '@/application/use-cases/ingredients/GetAllIngredientsUseCase';
import { CreateIngredientUseCase } from '@/application/use-cases/ingredients/CreateIngredientUseCase';
import { UpdateIngredientUseCase } from '@/application/use-cases/ingredients/UpdateIngredientUseCase';
import { DeleteIngredientUseCase } from '@/application/use-cases/ingredients/DeleteIngredientUseCase';
import type { IIngredientRepository } from '@/domain/repositories/IIngredientRepository';
import type { Ingredient, IngredientWithProductCount } from '@/domain/entities/Ingredient';

function createTestIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    name: 'Salmão',
    unit: 'g',
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTestIngredientWithCount(
  overrides: Partial<IngredientWithProductCount> = {}
): IngredientWithProductCount {
  return {
    ...createTestIngredient(overrides),
    productCount: 0,
    ...overrides,
  };
}

function createMockRepository(): IIngredientRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(),
    findAllWithProductCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

// ========================
// GetAllIngredientsUseCase
// ========================
describe('GetAllIngredientsUseCase', () => {
  let useCase: GetAllIngredientsUseCase;
  let mockRepo: IIngredientRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new GetAllIngredientsUseCase(mockRepo);
  });

  it('deve retornar lista de ingredientes com contagem', async () => {
    const ingredients = [
      createTestIngredientWithCount({ id: 'ing-1', name: 'Salmão', productCount: 3 }),
      createTestIngredientWithCount({ id: 'ing-2', name: 'Arroz', productCount: 5 }),
    ];
    vi.mocked(mockRepo.findAllWithProductCount).mockResolvedValue(ingredients);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Salmão');
      expect(result.data[0].productCount).toBe(3);
    }
    expect(mockRepo.findAllWithProductCount).toHaveBeenCalledOnce();
  });

  it('deve retornar lista vazia se não existem ingredientes', async () => {
    vi.mocked(mockRepo.findAllWithProductCount).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro se o repositório falhar', async () => {
    vi.mocked(mockRepo.findAllWithProductCount).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});

// ========================
// CreateIngredientUseCase
// ========================
describe('CreateIngredientUseCase', () => {
  let useCase: CreateIngredientUseCase;
  let mockRepo: IIngredientRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new CreateIngredientUseCase(mockRepo);
  });

  it('deve criar ingrediente com sucesso', async () => {
    const ingredient = createTestIngredient({ name: 'Atum' });
    vi.mocked(mockRepo.findByName).mockResolvedValue(null);
    vi.mocked(mockRepo.create).mockResolvedValue(ingredient);

    const result = await useCase.execute({ name: 'Atum', unit: 'g' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Atum');
    }
    expect(mockRepo.findByName).toHaveBeenCalledWith('Atum');
    expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Atum', unit: 'g' });
  });

  it('deve fazer trim do nome', async () => {
    const ingredient = createTestIngredient({ name: 'Atum' });
    vi.mocked(mockRepo.findByName).mockResolvedValue(null);
    vi.mocked(mockRepo.create).mockResolvedValue(ingredient);

    await useCase.execute({ name: '  Atum  ', unit: 'g' });

    expect(mockRepo.findByName).toHaveBeenCalledWith('Atum');
    expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Atum', unit: 'g' });
  });

  it('deve retornar erro se nome estiver vazio', async () => {
    const result = await useCase.execute({ name: '', unit: 'g' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se nome for apenas espaços', async () => {
    const result = await useCase.execute({ name: '   ', unit: 'g' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
  });

  it('deve retornar erro se unidade for inválida', async () => {
    const result = await useCase.execute({ name: 'Atum', unit: 'invalid' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_UNIT');
    }
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('deve aceitar todas as unidades válidas', async () => {
    const validUnits = ['g', 'kg', 'ml', 'L', 'un'];
    for (const unit of validUnits) {
      const mockRepoLocal = createMockRepository();
      const useCaseLocal = new CreateIngredientUseCase(mockRepoLocal);
      vi.mocked(mockRepoLocal.findByName).mockResolvedValue(null);
      vi.mocked(mockRepoLocal.create).mockResolvedValue(createTestIngredient({ unit }));

      const result = await useCaseLocal.execute({ name: 'Test', unit });
      expect(result.success).toBe(true);
    }
  });

  it('deve retornar erro se nome já existir', async () => {
    vi.mocked(mockRepo.findByName).mockResolvedValue(createTestIngredient({ name: 'Salmão' }));

    const result = await useCase.execute({ name: 'Salmão', unit: 'g' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NAME_EXISTS');
    }
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepo.findByName).mockResolvedValue(null);
    vi.mocked(mockRepo.create).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({ name: 'Atum', unit: 'g' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});

// ========================
// UpdateIngredientUseCase
// ========================
describe('UpdateIngredientUseCase', () => {
  let useCase: UpdateIngredientUseCase;
  let mockRepo: IIngredientRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new UpdateIngredientUseCase(mockRepo);
  });

  it('deve atualizar ingrediente com sucesso', async () => {
    const existing = createTestIngredient({ name: 'Salmão' });
    const updated = createTestIngredient({ name: 'Salmão Fresco' });
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.findByName).mockResolvedValue(null);
    vi.mocked(mockRepo.update).mockResolvedValue(updated);

    const result = await useCase.execute({ id: 'ing-1', data: { name: 'Salmão Fresco' } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Salmão Fresco');
    }
  });

  it('deve atualizar apenas a unidade', async () => {
    const existing = createTestIngredient({ name: 'Salmão', unit: 'g' });
    const updated = createTestIngredient({ name: 'Salmão', unit: 'kg' });
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockResolvedValue(updated);

    const result = await useCase.execute({ id: 'ing-1', data: { unit: 'kg' } });

    expect(result.success).toBe(true);
    // findByName should NOT be called since name is not being changed
    expect(mockRepo.findByName).not.toHaveBeenCalled();
  });

  it('deve retornar erro se ingrediente não existir', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    const result = await useCase.execute({ id: 'ing-999', data: { name: 'Novo' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('deve retornar erro se nome for vazio', async () => {
    const existing = createTestIngredient();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);

    const result = await useCase.execute({ id: 'ing-1', data: { name: '' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
  });

  it('deve retornar erro se unidade for inválida', async () => {
    const existing = createTestIngredient();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);

    const result = await useCase.execute({ id: 'ing-1', data: { unit: 'invalid' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_UNIT');
    }
  });

  it('deve retornar erro se novo nome já existir', async () => {
    const existing = createTestIngredient({ name: 'Salmão' });
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.findByName).mockResolvedValue(
      createTestIngredient({ id: 'ing-2', name: 'Atum' })
    );

    const result = await useCase.execute({ id: 'ing-1', data: { name: 'Atum' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NAME_EXISTS');
    }
  });

  it('não deve verificar unicidade se nome não mudou', async () => {
    const existing = createTestIngredient({ name: 'Salmão' });
    const updated = createTestIngredient({ name: 'Salmão', unit: 'kg' });
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockResolvedValue(updated);

    const result = await useCase.execute({ id: 'ing-1', data: { name: 'Salmão' } });

    expect(result.success).toBe(true);
    expect(mockRepo.findByName).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existing = createTestIngredient();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({ id: 'ing-1', data: { name: 'Novo' } });

    expect(result.success).toBe(false);
  });
});

// ========================
// DeleteIngredientUseCase
// ========================
describe('DeleteIngredientUseCase', () => {
  let useCase: DeleteIngredientUseCase;
  let mockRepo: IIngredientRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new DeleteIngredientUseCase(mockRepo);
  });

  it('deve eliminar ingrediente sem produtos associados', async () => {
    const existing = createTestIngredient();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.findAllWithProductCount).mockResolvedValue([
      createTestIngredientWithCount({ id: 'ing-1', productCount: 0 }),
    ]);
    vi.mocked(mockRepo.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('ing-1');

    expect(result.success).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith('ing-1');
  });

  it('deve retornar erro se ingrediente não existir', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    const result = await useCase.execute('ing-999');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });

  it('deve retornar erro IN_USE se ingrediente estiver em uso', async () => {
    const existing = createTestIngredient();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.findAllWithProductCount).mockResolvedValue([
      createTestIngredientWithCount({ id: 'ing-1', productCount: 3 }),
    ]);

    const result = await useCase.execute('ing-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('IN_USE');
      expect(result.error).toContain('3 produto(s)');
    }
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });

  it('deve eliminar ingrediente mesmo com outros ingredientes em uso', async () => {
    const existing = createTestIngredient({ id: 'ing-2' });
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.findAllWithProductCount).mockResolvedValue([
      createTestIngredientWithCount({ id: 'ing-1', productCount: 5 }),
      createTestIngredientWithCount({ id: 'ing-2', productCount: 0 }),
    ]);
    vi.mocked(mockRepo.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('ing-2');

    expect(result.success).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith('ing-2');
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existing = createTestIngredient();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.findAllWithProductCount).mockResolvedValue([
      createTestIngredientWithCount({ id: 'ing-1', productCount: 0 }),
    ]);
    vi.mocked(mockRepo.delete).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute('ing-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});
