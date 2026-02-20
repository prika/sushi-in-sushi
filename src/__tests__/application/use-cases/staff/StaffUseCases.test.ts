import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllStaffUseCase } from '@/application/use-cases/staff/GetAllStaffUseCase';
import { GetStaffByIdUseCase } from '@/application/use-cases/staff/GetStaffByIdUseCase';
import { CreateStaffUseCase } from '@/application/use-cases/staff/CreateStaffUseCase';
import { UpdateStaffUseCase } from '@/application/use-cases/staff/UpdateStaffUseCase';
import { DeleteStaffUseCase } from '@/application/use-cases/staff/DeleteStaffUseCase';
import { GetAllRolesUseCase } from '@/application/use-cases/staff/GetAllRolesUseCase';
import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { Staff, StaffWithRole, Role } from '@/domain/entities/Staff';

// Helper para criar um funcionário de teste
function createTestStaff(overrides: Partial<Staff> = {}): Staff {
  return {
    id: 'staff-1',
    email: 'joao@sushi.pt',
    name: 'João Silva',
    passwordHash: 'hashed_password',
    roleId: 1,
    location: 'circunvalacao',
    phone: '912345678',
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestStaffWithRole(overrides: Partial<StaffWithRole> = {}): StaffWithRole {
  return {
    ...createTestStaff(overrides),
    role: {
      id: 1,
      name: 'admin',
      description: 'Administrador',
    },
    ...overrides,
  };
}

function createTestRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 1,
    name: 'admin',
    description: 'Administrador',
    ...overrides,
  };
}

// Mock do repositório
function createMockStaffRepository(): IStaffRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAllRoles: vi.fn(),
    assignTables: vi.fn(),
    getAssignedTables: vi.fn(),
    addTableAssignment: vi.fn(),
  };
}

describe('GetAllStaffUseCase', () => {
  let useCase: GetAllStaffUseCase;
  let mockRepository: IStaffRepository;

  beforeEach(() => {
    mockRepository = createMockStaffRepository();
    useCase = new GetAllStaffUseCase(mockRepository);
  });

  it('deve retornar lista de funcionários', async () => {
    const staffList = [
      createTestStaffWithRole({ id: 'staff-1', name: 'João' }),
      createTestStaffWithRole({ id: 'staff-2', name: 'Maria' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(staffList);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('João');
    }
  });

  it('deve aplicar filtros', async () => {
    const filter = { roleId: 2, location: 'boavista' as const };
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    await useCase.execute(filter);

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

describe('GetStaffByIdUseCase', () => {
  let useCase: GetStaffByIdUseCase;
  let mockRepository: IStaffRepository;

  beforeEach(() => {
    mockRepository = createMockStaffRepository();
    useCase = new GetStaffByIdUseCase(mockRepository);
  });

  it('deve retornar funcionário por ID', async () => {
    const staff = createTestStaffWithRole();
    vi.mocked(mockRepository.findById).mockResolvedValue(staff);

    const result = await useCase.execute('staff-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.id).toBe('staff-1');
    }
  });

  it('deve retornar null se funcionário não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('staff-1');

    expect(result.success).toBe(false);
  });
});

describe('CreateStaffUseCase', () => {
  let useCase: CreateStaffUseCase;
  let mockRepository: IStaffRepository;

  beforeEach(() => {
    mockRepository = createMockStaffRepository();
    useCase = new CreateStaffUseCase(mockRepository);
  });

  it('deve criar funcionário com dados válidos', async () => {
    const createData = {
      email: 'novo@sushi.pt',
      name: 'Novo Funcionário',
      password: 'senha123',
      roleId: 2,
    };
    const createdStaff = createTestStaff({ ...createData, id: 'new-staff' });

    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue(createdStaff);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('novo@sushi.pt');
    }
  });

  it('deve retornar erro se email já existe', async () => {
    const existingStaff = createTestStaffWithRole();
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(existingStaff);

    const result = await useCase.execute({
      email: 'joao@sushi.pt',
      name: 'Outro',
      password: 'senha123',
      roleId: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Email já está em uso');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      email: 'novo@sushi.pt',
      name: 'Teste',
      password: 'senha123',
      roleId: 1,
    });

    expect(result.success).toBe(false);
  });
});

describe('UpdateStaffUseCase', () => {
  let useCase: UpdateStaffUseCase;
  let mockRepository: IStaffRepository;

  beforeEach(() => {
    mockRepository = createMockStaffRepository();
    useCase = new UpdateStaffUseCase(mockRepository);
  });

  it('deve atualizar funcionário com dados válidos', async () => {
    const existingStaff = createTestStaffWithRole();
    const updatedStaff = createTestStaff({ name: 'Nome Atualizado' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedStaff);

    const result = await useCase.execute('staff-1', { name: 'Nome Atualizado' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Nome Atualizado');
    }
  });

  it('deve retornar erro se funcionário não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', { name: 'Novo Nome' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
  });

  it('deve retornar erro se email novo já existe', async () => {
    const existingStaff = createTestStaffWithRole();
    const otherStaff = createTestStaffWithRole({ id: 'other-staff', email: 'outro@sushi.pt' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(otherStaff);

    const result = await useCase.execute('staff-1', { email: 'outro@sushi.pt' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Email já está em uso');
    }
  });

  it('deve permitir manter o mesmo email', async () => {
    const existingStaff = createTestStaffWithRole({ email: 'mesmo@sushi.pt' });
    const updatedStaff = createTestStaff({ email: 'mesmo@sushi.pt', name: 'Nome Atualizado' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedStaff);

    const result = await useCase.execute('staff-1', { email: 'mesmo@sushi.pt', name: 'Nome Atualizado' });

    expect(result.success).toBe(true);
  });

  it('deve desativar funcionário', async () => {
    const existingStaff = createTestStaffWithRole({ isActive: true });
    const updatedStaff = createTestStaff({ isActive: false });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedStaff);

    const result = await useCase.execute('staff-1', { isActive: false });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });
});

describe('DeleteStaffUseCase', () => {
  let useCase: DeleteStaffUseCase;
  let mockRepository: IStaffRepository;

  beforeEach(() => {
    mockRepository = createMockStaffRepository();
    useCase = new DeleteStaffUseCase(mockRepository);
  });

  it('deve eliminar funcionário existente', async () => {
    const existingStaff = createTestStaffWithRole();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('staff-1');

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith('staff-1');
  });

  it('deve retornar erro se funcionário não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('deve lidar com erro do repositório', async () => {
    const existingStaff = createTestStaffWithRole();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingStaff);
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('FK constraint'));

    const result = await useCase.execute('staff-1');

    expect(result.success).toBe(false);
  });
});

describe('GetAllRolesUseCase', () => {
  let useCase: GetAllRolesUseCase;
  let mockRepository: IStaffRepository;

  beforeEach(() => {
    mockRepository = createMockStaffRepository();
    useCase = new GetAllRolesUseCase(mockRepository);
  });

  it('deve retornar lista de roles', async () => {
    const roles = [
      createTestRole({ id: 1, name: 'admin' }),
      createTestRole({ id: 2, name: 'kitchen' }),
      createTestRole({ id: 3, name: 'waiter' }),
    ];
    vi.mocked(mockRepository.getAllRoles).mockResolvedValue(roles);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.getAllRoles).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });
});
