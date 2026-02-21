import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllCategoriesUseCase } from '@/application/use-cases/categories/GetAllCategoriesUseCase';
import { GetCategoryByIdUseCase } from '@/application/use-cases/categories/GetCategoryByIdUseCase';
import { CreateCategoryUseCase } from '@/application/use-cases/categories/CreateCategoryUseCase';
import { UpdateCategoryUseCase } from '@/application/use-cases/categories/UpdateCategoryUseCase';
import { DeleteCategoryUseCase } from '@/application/use-cases/categories/DeleteCategoryUseCase';
import type { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import type { Category, CategoryWithCount, CreateCategoryData } from '@/domain/entities/Category';

// Helper para criar uma categoria de teste
function createTestCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Sushi',
    slug: 'sushi',
    icon: '🍣',
    sortOrder: 1,
    zoneId: 'zone-1',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTestCategoryWithCount(overrides: Partial<CategoryWithCount> = {}): CategoryWithCount {
  return {
    ...createTestCategory(overrides),
    productCount: 5,
    ...overrides,
  };
}

// Mock do repositório
function createMockCategoryRepository(): ICategoryRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findAll: vi.fn(),
    findAllWithCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

describe('GetAllCategoriesUseCase', () => {
  let useCase: GetAllCategoriesUseCase;
  let mockRepository: ICategoryRepository;

  beforeEach(() => {
    mockRepository = createMockCategoryRepository();
    useCase = new GetAllCategoriesUseCase(mockRepository);
  });

  it('deve retornar lista de categorias com contagem de produtos', async () => {
    const categories = [
      createTestCategoryWithCount({ id: 'cat-1', name: 'Sushi', productCount: 5 }),
      createTestCategoryWithCount({ id: 'cat-2', name: 'Sashimi', productCount: 3 }),
    ];
    vi.mocked(mockRepository.findAllWithCount).mockResolvedValue(categories);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Sushi');
      expect(result.data[0].productCount).toBe(5);
    }
    expect(mockRepository.findAllWithCount).toHaveBeenCalledOnce();
  });

  it('deve retornar lista vazia se não existem categorias', async () => {
    vi.mocked(mockRepository.findAllWithCount).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findAllWithCount).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB Error');
    }
  });
});

describe('GetCategoryByIdUseCase', () => {
  let useCase: GetCategoryByIdUseCase;
  let mockRepository: ICategoryRepository;

  beforeEach(() => {
    mockRepository = createMockCategoryRepository();
    useCase = new GetCategoryByIdUseCase(mockRepository);
  });

  it('deve retornar categoria por ID', async () => {
    const category = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(category);

    const result = await useCase.execute('cat-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('cat-1');
      expect(result.data.name).toBe('Sushi');
    }
    expect(mockRepository.findById).toHaveBeenCalledWith('cat-1');
  });

  it('deve retornar erro NOT_FOUND se categoria não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('cat-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB Error');
    }
  });
});

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let mockRepository: ICategoryRepository;

  beforeEach(() => {
    mockRepository = createMockCategoryRepository();
    useCase = new CreateCategoryUseCase(mockRepository);
  });

  it('deve criar categoria com dados válidos', async () => {
    const createData: CreateCategoryData = {
      name: 'Sobremesas',
      slug: 'sobremesas',
      icon: '🍰',
      sortOrder: 5,
    };
    const createdCategory = createTestCategory({ ...createData, id: 'new-cat' });

    vi.mocked(mockRepository.findBySlug).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue(createdCategory);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Sobremesas');
      expect(result.data.slug).toBe('sobremesas');
    }
    expect(mockRepository.findBySlug).toHaveBeenCalledWith('sobremesas');
    expect(mockRepository.create).toHaveBeenCalledWith(createData);
  });

  it('deve retornar erro se nome estiver vazio', async () => {
    const result = await useCase.execute({
      name: '',
      slug: 'test-slug',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Nome da categoria é obrigatório');
      expect(result.code).toBe('INVALID_NAME');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se nome for apenas espaços em branco', async () => {
    const result = await useCase.execute({
      name: '   ',
      slug: 'test-slug',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug estiver vazio', async () => {
    const result = await useCase.execute({
      name: 'Sobremesas',
      slug: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Código da categoria é obrigatório');
      expect(result.code).toBe('INVALID_SLUG');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug tiver formato inválido (maiúsculas)', async () => {
    const result = await useCase.execute({
      name: 'Sobremesas',
      slug: 'Sobremesas',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('letras minúsculas, números e hífens');
      expect(result.code).toBe('INVALID_SLUG_FORMAT');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug tiver caracteres especiais', async () => {
    const result = await useCase.execute({
      name: 'Sobremesas',
      slug: 'sobremesas_especiais!',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_SLUG_FORMAT');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug já existir', async () => {
    const existingCategory = createTestCategory({ slug: 'sushi' });
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(existingCategory);

    const result = await useCase.execute({
      name: 'Sushi Premium',
      slug: 'sushi',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Já existe uma categoria com este código');
      expect(result.code).toBe('SLUG_EXISTS');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar ao criar', async () => {
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('Constraint violation'));

    const result = await useCase.execute({
      name: 'Sobremesas',
      slug: 'sobremesas',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Constraint violation');
    }
  });
});

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let mockRepository: ICategoryRepository;

  beforeEach(() => {
    mockRepository = createMockCategoryRepository();
    useCase = new UpdateCategoryUseCase(mockRepository);
  });

  it('deve atualizar categoria com dados válidos', async () => {
    const existingCategory = createTestCategory();
    const updatedCategory = createTestCategory({ name: 'Sushi Premium', sortOrder: 2 });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedCategory);

    const result = await useCase.execute({ id: 'cat-1', data: { name: 'Sushi Premium', sortOrder: 2 } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Sushi Premium');
    }
    expect(mockRepository.update).toHaveBeenCalledWith('cat-1', { name: 'Sushi Premium', sortOrder: 2 });
  });

  it('deve retornar erro NOT_FOUND se categoria não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ id: 'non-existent', data: { name: 'Novo Nome' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
      expect(result.code).toBe('NOT_FOUND');
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve retornar erro se nome for string vazia', async () => {
    const existingCategory = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);

    const result = await useCase.execute({ id: 'cat-1', data: { name: '' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug vazio na atualização', async () => {
    const existingCategory = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);

    const result = await useCase.execute({ id: 'cat-1', data: { slug: '' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_SLUG');
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug tiver formato inválido', async () => {
    const existingCategory = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);

    const result = await useCase.execute({ id: 'cat-1', data: { slug: 'INVALID SLUG!' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_SLUG_FORMAT');
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve retornar erro se novo slug já existir em outra categoria', async () => {
    const existingCategory = createTestCategory({ id: 'cat-1', slug: 'sushi' });
    const otherCategory = createTestCategory({ id: 'cat-2', slug: 'sashimi' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(otherCategory);

    const result = await useCase.execute({ id: 'cat-1', data: { slug: 'sashimi' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Já existe uma categoria com este código');
      expect(result.code).toBe('SLUG_EXISTS');
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve permitir manter o mesmo slug', async () => {
    const existingCategory = createTestCategory({ id: 'cat-1', slug: 'sushi' });
    const updatedCategory = createTestCategory({ name: 'Sushi Atualizado', slug: 'sushi' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedCategory);

    const result = await useCase.execute({ id: 'cat-1', data: { slug: 'sushi', name: 'Sushi Atualizado' } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('sushi');
    }
    // findBySlug should not be called when slug hasn't changed
    expect(mockRepository.findBySlug).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar ao atualizar', async () => {
    const existingCategory = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);
    vi.mocked(mockRepository.update).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({ id: 'cat-1', data: { name: 'Novo Nome' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB Error');
    }
  });
});

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;
  let mockRepository: ICategoryRepository;

  beforeEach(() => {
    mockRepository = createMockCategoryRepository();
    useCase = new DeleteCategoryUseCase(mockRepository);
  });

  it('deve eliminar categoria existente', async () => {
    const existingCategory = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('cat-1');

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith('cat-1');
  });

  it('deve retornar erro NOT_FOUND se categoria não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
      expect(result.code).toBe('NOT_FOUND');
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar ao eliminar', async () => {
    const existingCategory = createTestCategory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCategory);
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('FK constraint'));

    const result = await useCase.execute('cat-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('FK constraint');
    }
  });
});
