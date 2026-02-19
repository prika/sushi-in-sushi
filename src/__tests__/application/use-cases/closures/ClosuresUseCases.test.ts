import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllClosuresUseCase } from '@/application/use-cases/closures/GetAllClosuresUseCase';
import { GetRecurringClosuresUseCase } from '@/application/use-cases/closures/GetRecurringClosuresUseCase';
import { CreateClosureUseCase } from '@/application/use-cases/closures/CreateClosureUseCase';
import { UpdateClosureUseCase } from '@/application/use-cases/closures/UpdateClosureUseCase';
import { DeleteClosureUseCase } from '@/application/use-cases/closures/DeleteClosureUseCase';
import { CheckClosureUseCase } from '@/application/use-cases/closures/CheckClosureUseCase';
import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { RestaurantClosure } from '@/domain/entities/RestaurantClosure';

// Helper para criar uma folga de teste
function createTestClosure(overrides: Partial<RestaurantClosure> = {}): RestaurantClosure {
  return {
    id: 1,
    closureDate: '2024-12-25',
    location: null,
    reason: 'Natal',
    isRecurring: false,
    recurringDayOfWeek: null,
    createdBy: 'admin-1',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createRecurringClosure(overrides: Partial<RestaurantClosure> = {}): RestaurantClosure {
  return {
    id: 2,
    closureDate: '1970-01-01',
    location: null,
    reason: 'Dia de descanso',
    isRecurring: true,
    recurringDayOfWeek: 1, // Segunda-feira
    createdBy: 'admin-1',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Mock do repositório
function createMockClosureRepository(): IRestaurantClosureRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findRecurring: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    checkClosure: vi.fn(),
  };
}

describe('GetAllClosuresUseCase', () => {
  let useCase: GetAllClosuresUseCase;
  let mockRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockRepository = createMockClosureRepository();
    useCase = new GetAllClosuresUseCase(mockRepository);
  });

  it('deve retornar lista de folgas', async () => {
    const closures = [
      createTestClosure({ id: 1, reason: 'Natal' }),
      createTestClosure({ id: 2, reason: 'Ano Novo' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(closures);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('deve aplicar filtros', async () => {
    const filter = { location: 'circunvalacao' as const, isRecurring: false };
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    await useCase.execute(filter);

    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });
});

describe('GetRecurringClosuresUseCase', () => {
  let useCase: GetRecurringClosuresUseCase;
  let mockRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockRepository = createMockClosureRepository();
    useCase = new GetRecurringClosuresUseCase(mockRepository);
  });

  it('deve retornar apenas folgas recorrentes', async () => {
    const recurringClosures = [
      createRecurringClosure({ id: 1, recurringDayOfWeek: 1 }),
      createRecurringClosure({ id: 2, recurringDayOfWeek: 0 }),
    ];
    vi.mocked(mockRepository.findRecurring).mockResolvedValue(recurringClosures);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data.every(c => c.isRecurring)).toBe(true);
    }
  });
});

describe('CreateClosureUseCase', () => {
  let useCase: CreateClosureUseCase;
  let mockRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockRepository = createMockClosureRepository();
    useCase = new CreateClosureUseCase(mockRepository);
  });

  it('deve criar folga específica', async () => {
    const createData = {
      closureDate: '2024-12-31',
      reason: 'Passagem de ano',
      isRecurring: false,
    };
    const createdClosure = createTestClosure({ ...createData });

    vi.mocked(mockRepository.create).mockResolvedValue(createdClosure);

    const result = await useCase.execute(createData, 'admin-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.closureDate).toBe('2024-12-31');
    }
    expect(mockRepository.create).toHaveBeenCalledWith(createData, 'admin-1');
  });

  it('deve criar folga recorrente', async () => {
    const createData = {
      closureDate: '1970-01-01',
      reason: 'Dia de descanso semanal',
      isRecurring: true,
      recurringDayOfWeek: 0, // Domingo
    };
    const createdClosure = createRecurringClosure({ ...createData });

    vi.mocked(mockRepository.create).mockResolvedValue(createdClosure);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRecurring).toBe(true);
      expect(result.data.recurringDayOfWeek).toBe(0);
    }
  });

  it('deve criar folga para localização específica', async () => {
    const createData = {
      closureDate: '2024-12-25',
      location: 'boavista' as const,
      reason: 'Natal - apenas Boavista',
      isRecurring: false,
    };
    const createdClosure = createTestClosure({ ...createData });

    vi.mocked(mockRepository.create).mockResolvedValue(createdClosure);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBe('boavista');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('Constraint violation'));

    const result = await useCase.execute({ closureDate: '2024-12-25' });

    expect(result.success).toBe(false);
  });
});

describe('UpdateClosureUseCase', () => {
  let useCase: UpdateClosureUseCase;
  let mockRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockRepository = createMockClosureRepository();
    useCase = new UpdateClosureUseCase(mockRepository);
  });

  it('deve atualizar folga existente', async () => {
    const existingClosure = createTestClosure();
    const updatedClosure = createTestClosure({ reason: 'Motivo atualizado' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingClosure);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedClosure);

    const result = await useCase.execute(1, { reason: 'Motivo atualizado' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('Motivo atualizado');
    }
  });

  it('deve retornar erro se folga não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute(999, { reason: 'Novo motivo' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrad');
    }
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('deve atualizar localização', async () => {
    const existingClosure = createTestClosure({ location: null });
    const updatedClosure = createTestClosure({ location: 'circunvalacao' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingClosure);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedClosure);

    const result = await useCase.execute(1, { location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBe('circunvalacao');
    }
  });
});

describe('DeleteClosureUseCase', () => {
  let useCase: DeleteClosureUseCase;
  let mockRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockRepository = createMockClosureRepository();
    useCase = new DeleteClosureUseCase(mockRepository);
  });

  it('deve eliminar folga existente', async () => {
    const existingClosure = createTestClosure();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingClosure);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute(1);

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith(1);
  });

  it('deve retornar erro se folga não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrad');
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });
});

describe('CheckClosureUseCase', () => {
  let useCase: CheckClosureUseCase;
  let mockRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockRepository = createMockClosureRepository();
    useCase = new CheckClosureUseCase(mockRepository);
  });

  it('deve retornar fechado para data com folga específica', async () => {
    vi.mocked(mockRepository.checkClosure).mockResolvedValue({
      isClosed: true,
      reason: 'Natal',
      closure: createTestClosure(),
    });

    const result = await useCase.execute('2024-12-25', 'circunvalacao');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isClosed).toBe(true);
      expect(result.data.reason).toBe('Natal');
    }
  });

  it('deve retornar fechado para dia da semana recorrente', async () => {
    vi.mocked(mockRepository.checkClosure).mockResolvedValue({
      isClosed: true,
      reason: 'Dia de descanso semanal',
      closure: createRecurringClosure(),
    });

    const result = await useCase.execute('2024-01-08', 'boavista'); // Segunda-feira

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isClosed).toBe(true);
    }
  });

  it('deve retornar aberto para data sem folga', async () => {
    vi.mocked(mockRepository.checkClosure).mockResolvedValue({
      isClosed: false,
    });

    const result = await useCase.execute('2024-06-15', 'circunvalacao');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isClosed).toBe(false);
    }
  });

  it('deve verificar folga sem localização específica', async () => {
    vi.mocked(mockRepository.checkClosure).mockResolvedValue({ isClosed: false });

    await useCase.execute('2024-06-15');

    expect(mockRepository.checkClosure).toHaveBeenCalledWith('2024-06-15', undefined);
  });
});
