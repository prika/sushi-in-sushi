import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllKitchenZonesUseCase } from '@/application/use-cases/kitchen-zones/GetAllKitchenZonesUseCase';
import { GetActiveKitchenZonesUseCase } from '@/application/use-cases/kitchen-zones/GetActiveKitchenZonesUseCase';
import { CreateKitchenZoneUseCase } from '@/application/use-cases/kitchen-zones/CreateKitchenZoneUseCase';
import { UpdateKitchenZoneUseCase } from '@/application/use-cases/kitchen-zones/UpdateKitchenZoneUseCase';
import { DeleteKitchenZoneUseCase } from '@/application/use-cases/kitchen-zones/DeleteKitchenZoneUseCase';
import type { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import type { KitchenZone, KitchenZoneWithCategoryCount } from '@/domain/entities/KitchenZone';

// Helper para criar uma zona de cozinha de teste
function createTestZone(overrides: Partial<KitchenZone> = {}): KitchenZone {
  return {
    id: 'zone-1',
    name: 'Quentes',
    slug: 'quentes',
    color: '#EF4444',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTestZoneWithCount(overrides: Partial<KitchenZoneWithCategoryCount> = {}): KitchenZoneWithCategoryCount {
  return {
    ...createTestZone(overrides),
    categoryCount: 3,
    ...overrides,
  };
}

// Mock do repositório
function createMockRepository(): IKitchenZoneRepository {
  return {
    findAll: vi.fn(),
    findActive: vi.fn(),
    findAllWithCategoryCount: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    validateSlugUnique: vi.fn(),
  };
}

describe('GetAllKitchenZonesUseCase', () => {
  let useCase: GetAllKitchenZonesUseCase;
  let mockRepository: IKitchenZoneRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetAllKitchenZonesUseCase(mockRepository);
  });

  it('deve retornar lista de zonas com contagem de categorias', async () => {
    const zones = [
      createTestZoneWithCount({ id: 'zone-1', name: 'Quentes', categoryCount: 3 }),
      createTestZoneWithCount({ id: 'zone-2', name: 'Frios', slug: 'frios', categoryCount: 5 }),
    ];
    vi.mocked(mockRepository.findAllWithCategoryCount).mockResolvedValue(zones);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].categoryCount).toBe(3);
      expect(result.data[1].categoryCount).toBe(5);
    }
    expect(mockRepository.findAllWithCategoryCount).toHaveBeenCalled();
  });

  it('deve retornar lista vazia quando não há zonas', async () => {
    vi.mocked(mockRepository.findAllWithCategoryCount).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findAllWithCategoryCount).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });
});

describe('GetActiveKitchenZonesUseCase', () => {
  let useCase: GetActiveKitchenZonesUseCase;
  let mockRepository: IKitchenZoneRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetActiveKitchenZonesUseCase(mockRepository);
  });

  it('deve retornar apenas zonas ativas', async () => {
    const activeZones = [
      createTestZone({ id: 'zone-1', isActive: true }),
      createTestZone({ id: 'zone-2', name: 'Frios', slug: 'frios', isActive: true }),
    ];
    vi.mocked(mockRepository.findActive).mockResolvedValue(activeZones);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data.every(z => z.isActive)).toBe(true);
    }
    expect(mockRepository.findActive).toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findActive).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });
});

describe('CreateKitchenZoneUseCase', () => {
  let useCase: CreateKitchenZoneUseCase;
  let mockRepository: IKitchenZoneRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new CreateKitchenZoneUseCase(mockRepository);
  });

  it('deve criar zona com dados válidos', async () => {
    const createData = {
      name: 'Quentes',
      slug: 'quentes',
      color: '#EF4444',
      sortOrder: 1,
      isActive: true,
    };
    const createdZone = createTestZone({ ...createData });

    vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
    vi.mocked(mockRepository.create).mockResolvedValue(createdZone);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Quentes');
      expect(result.data.slug).toBe('quentes');
    }
    expect(mockRepository.validateSlugUnique).toHaveBeenCalledWith('quentes');
    expect(mockRepository.create).toHaveBeenCalledWith(createData);
  });

  it('deve retornar erro se nome estiver vazio', async () => {
    const result = await useCase.execute({
      name: '',
      slug: 'quentes',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se nome for apenas espaços', async () => {
    const result = await useCase.execute({
      name: '   ',
      slug: 'quentes',
    });

    expect(result.success).toBe(false);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug estiver vazio', async () => {
    const result = await useCase.execute({
      name: 'Quentes',
      slug: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug tiver formato inválido (maiúsculas)', async () => {
    const result = await useCase.execute({
      name: 'Quentes',
      slug: 'Quentes',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug tiver formato inválido (espaços)', async () => {
    const result = await useCase.execute({
      name: 'Quentes',
      slug: 'zona quentes',
    });

    expect(result.success).toBe(false);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se slug tiver formato inválido (caracteres especiais)', async () => {
    const result = await useCase.execute({
      name: 'Quentes',
      slug: 'quentes@123',
    });

    expect(result.success).toBe(false);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve aceitar slug com hífens', async () => {
    const createData = {
      name: 'Zona Quentes',
      slug: 'zona-quentes',
    };
    const createdZone = createTestZone({ ...createData });

    vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
    vi.mocked(mockRepository.create).mockResolvedValue(createdZone);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('zona-quentes');
    }
  });

  it('deve retornar erro se slug já existe', async () => {
    vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(false);

    const result = await useCase.execute({
      name: 'Quentes',
      slug: 'quentes',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      name: 'Quentes',
      slug: 'quentes',
    });

    expect(result.success).toBe(false);
  });
});

describe('UpdateKitchenZoneUseCase', () => {
  let useCase: UpdateKitchenZoneUseCase;
  let mockRepository: IKitchenZoneRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new UpdateKitchenZoneUseCase(mockRepository);
  });

  it('deve atualizar zona existente', async () => {
    const existingZone = createTestZone();
    const updatedZone = createTestZone({ name: 'Quentes Atualizados', color: '#FF0000' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedZone);

    const result = await useCase.execute({
      id: 'zone-1',
      data: { name: 'Quentes Atualizados', color: '#FF0000' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Quentes Atualizados');
      expect(result.data.color).toBe('#FF0000');
    }
  });

  it('deve retornar erro se zona não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({
      id: 'non-existent',
      data: { name: 'Novo Nome' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve validar nome se fornecido', async () => {
    const existingZone = createTestZone();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);

    const result = await useCase.execute({
      id: 'zone-1',
      data: { name: '' },
    });

    expect(result.success).toBe(false);
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve validar slug se fornecido', async () => {
    const existingZone = createTestZone();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);

    const result = await useCase.execute({
      id: 'zone-1',
      data: { slug: 'Invalid Slug' },
    });

    expect(result.success).toBe(false);
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve verificar unicidade do slug excluindo zona atual', async () => {
    const existingZone = createTestZone();
    const updatedZone = createTestZone({ slug: 'novo-slug' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);
    vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(true);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedZone);

    const result = await useCase.execute({
      id: 'zone-1',
      data: { slug: 'novo-slug' },
    });

    expect(result.success).toBe(true);
    expect(mockRepository.validateSlugUnique).toHaveBeenCalledWith('novo-slug', 'zone-1');
  });

  it('deve retornar erro se novo slug já existe', async () => {
    const existingZone = createTestZone();

    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);
    vi.mocked(mockRepository.validateSlugUnique).mockResolvedValue(false);

    const result = await useCase.execute({
      id: 'zone-1',
      data: { slug: 'slug-duplicado' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existingZone = createTestZone();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);
    vi.mocked(mockRepository.update).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      id: 'zone-1',
      data: { name: 'Novo Nome' },
    });

    expect(result.success).toBe(false);
  });
});

describe('DeleteKitchenZoneUseCase', () => {
  let useCase: DeleteKitchenZoneUseCase;
  let mockRepository: IKitchenZoneRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new DeleteKitchenZoneUseCase(mockRepository);
  });

  it('deve eliminar zona existente', async () => {
    const existingZone = createTestZone();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('zone-1');

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith('zone-1');
  });

  it('deve retornar erro se zona não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existingZone = createTestZone();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingZone);
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('zone-1');

    expect(result.success).toBe(false);
  });
});
