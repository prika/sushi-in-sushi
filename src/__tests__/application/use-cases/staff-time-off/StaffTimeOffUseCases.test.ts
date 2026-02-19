import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllStaffTimeOffUseCase } from '@/application/use-cases/staff-time-off/GetAllStaffTimeOffUseCase';
import { GetStaffTimeOffByIdUseCase } from '@/application/use-cases/staff-time-off/GetStaffTimeOffByIdUseCase';
import { CreateStaffTimeOffUseCase } from '@/application/use-cases/staff-time-off/CreateStaffTimeOffUseCase';
import { UpdateStaffTimeOffUseCase } from '@/application/use-cases/staff-time-off/UpdateStaffTimeOffUseCase';
import { DeleteStaffTimeOffUseCase } from '@/application/use-cases/staff-time-off/DeleteStaffTimeOffUseCase';
import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import { StaffTimeOff, StaffTimeOffWithStaff } from '@/domain/entities/StaffTimeOff';

// Helper para criar ausência de teste
function createTestTimeOff(overrides: Partial<StaffTimeOff> = {}): StaffTimeOff {
  return {
    id: 1,
    staffId: '123e4567-e89b-12d3-a456-426614174000',
    startDate: '2024-12-20',
    endDate: '2024-12-25',
    type: 'vacation',
    reason: 'Férias de Natal',
    status: 'approved',
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestTimeOffWithStaff(overrides: Partial<StaffTimeOffWithStaff> = {}): StaffTimeOffWithStaff {
  return {
    ...createTestTimeOff(overrides),
    staff: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'João Silva' },
    approver: null,
    ...overrides,
  };
}

// Mock do repositório
function createMockRepository(): IStaffTimeOffRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByStaffId: vi.fn(),
    findOverlapping: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    delete: vi.fn(),
  };
}

describe('GetAllStaffTimeOffUseCase', () => {
  let useCase: GetAllStaffTimeOffUseCase;
  let mockRepository: IStaffTimeOffRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetAllStaffTimeOffUseCase(mockRepository);
  });

  it('deve retornar lista de ausências', async () => {
    const timeOffs = [
      createTestTimeOffWithStaff({ id: 1 }),
      createTestTimeOffWithStaff({ id: 2, type: 'sick' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(timeOffs);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].staff.name).toBe('João Silva');
    }
  });

  it('deve aplicar filtros', async () => {
    const filter = { staffId: '123e4567-e89b-12d3-a456-426614174000', type: 'vacation' as const };
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    await useCase.execute({ filter });

    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB Error');
    }
  });
});

describe('GetStaffTimeOffByIdUseCase', () => {
  let useCase: GetStaffTimeOffByIdUseCase;
  let mockRepository: IStaffTimeOffRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetStaffTimeOffByIdUseCase(mockRepository);
  });

  it('deve retornar ausência por ID', async () => {
    const timeOff = createTestTimeOffWithStaff({ id: 1 });
    vi.mocked(mockRepository.findById).mockResolvedValue(timeOff);

    const result = await useCase.execute({ id: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(1);
      expect(result.data.staff.name).toBe('João Silva');
    }
  });

  it('deve retornar erro se ID não fornecido', async () => {
    const result = await useCase.execute({ id: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve retornar erro se ausência não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ id: 999 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });
});

describe('CreateStaffTimeOffUseCase', () => {
  let useCase: CreateStaffTimeOffUseCase;
  let mockRepository: IStaffTimeOffRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new CreateStaffTimeOffUseCase(mockRepository);
  });

  it('deve criar ausência com dados válidos', async () => {
    const createdTimeOff = createTestTimeOff({ id: 1 });
    vi.mocked(mockRepository.findOverlapping).mockResolvedValue([]);
    vi.mocked(mockRepository.create).mockResolvedValue(createdTimeOff);

    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-12-20',
      endDate: '2024-12-25',
      type: 'vacation',
      reason: 'Férias de Natal',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(1);
      expect(result.data.type).toBe('vacation');
    }
  });

  it('deve retornar erro se staffId não fornecido', async () => {
    const result = await useCase.execute({
      staffId: '',
      startDate: '2024-12-20',
      endDate: '2024-12-25',
      type: 'vacation',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('funcionário');
    }
  });

  it('deve retornar erro se startDate não fornecido', async () => {
    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '',
      endDate: '2024-12-25',
      type: 'vacation',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('início');
    }
  });

  it('deve retornar erro se endDate não fornecido', async () => {
    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-12-20',
      endDate: '',
      type: 'vacation',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('fim');
    }
  });

  it('deve retornar erro se type não fornecido', async () => {
    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-12-20',
      endDate: '2024-12-25',
      type: '' as any,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Tipo');
    }
  });

  it('deve retornar erro se data de fim anterior à data de início', async () => {
    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-12-25',
      endDate: '2024-12-20',
      type: 'vacation',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATES');
    }
  });

  it('deve retornar erro se há sobreposição com outra ausência', async () => {
    vi.mocked(mockRepository.findOverlapping).mockResolvedValue([createTestTimeOff()]);

    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-12-22',
      endDate: '2024-12-28',
      type: 'vacation',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('OVERLAP');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findOverlapping).mockResolvedValue([]);
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-12-20',
      endDate: '2024-12-25',
      type: 'vacation',
    });

    expect(result.success).toBe(false);
  });
});

describe('UpdateStaffTimeOffUseCase', () => {
  let useCase: UpdateStaffTimeOffUseCase;
  let mockRepository: IStaffTimeOffRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new UpdateStaffTimeOffUseCase(mockRepository);
  });

  it('deve atualizar ausência com dados válidos', async () => {
    const existing = createTestTimeOffWithStaff({ id: 1 });
    const updated = createTestTimeOff({ id: 1, reason: 'Novo motivo' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.findOverlapping).mockResolvedValue([]);
    vi.mocked(mockRepository.update).mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 1,
      data: { reason: 'Novo motivo' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('Novo motivo');
    }
  });

  it('deve retornar erro se ID não fornecido', async () => {
    const result = await useCase.execute({
      id: 0,
      data: { reason: 'Novo motivo' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve retornar erro se ausência não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({
      id: 999,
      data: { reason: 'Novo motivo' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se novas datas são inválidas', async () => {
    const existing = createTestTimeOffWithStaff({ id: 1 });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);

    const result = await useCase.execute({
      id: 1,
      data: { startDate: '2024-12-25', endDate: '2024-12-20' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATES');
    }
  });

  it('deve retornar erro se há sobreposição com outra ausência', async () => {
    const existing = createTestTimeOffWithStaff({ id: 1 });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.findOverlapping).mockResolvedValue([createTestTimeOff({ id: 2 })]);

    const result = await useCase.execute({
      id: 1,
      data: { startDate: '2024-12-22', endDate: '2024-12-28' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('OVERLAP');
    }
  });

  it('deve permitir atualização sem mudança de datas', async () => {
    const existing = createTestTimeOffWithStaff({ id: 1 });
    const updated = createTestTimeOff({ id: 1, type: 'sick' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.update).mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 1,
      data: { type: 'sick' },
    });

    expect(result.success).toBe(true);
    expect(mockRepository.findOverlapping).not.toHaveBeenCalled();
  });
});

describe('DeleteStaffTimeOffUseCase', () => {
  let useCase: DeleteStaffTimeOffUseCase;
  let mockRepository: IStaffTimeOffRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new DeleteStaffTimeOffUseCase(mockRepository);
  });

  it('deve remover ausência existente', async () => {
    const existing = createTestTimeOffWithStaff({ id: 1 });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute({ id: 1 });

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith(1);
  });

  it('deve retornar erro se ID não fornecido', async () => {
    const result = await useCase.execute({ id: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve retornar erro se ausência não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ id: 999 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existing = createTestTimeOffWithStaff({ id: 1 });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({ id: 1 });

    expect(result.success).toBe(false);
  });
});
