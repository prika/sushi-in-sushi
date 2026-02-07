import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllCustomersUseCase } from '@/application/use-cases/customers/GetAllCustomersUseCase';
import { GetCustomerByIdUseCase } from '@/application/use-cases/customers/GetCustomerByIdUseCase';
import { CreateCustomerUseCase } from '@/application/use-cases/customers/CreateCustomerUseCase';
import { UpdateCustomerUseCase } from '@/application/use-cases/customers/UpdateCustomerUseCase';
import { DeleteCustomerUseCase } from '@/application/use-cases/customers/DeleteCustomerUseCase';
import { AddCustomerPointsUseCase } from '@/application/use-cases/customers/AddCustomerPointsUseCase';
import { RecordCustomerVisitUseCase } from '@/application/use-cases/customers/RecordCustomerVisitUseCase';
import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Customer, CustomerWithHistory } from '@/domain/entities/Customer';

// Helper para criar um cliente de teste
function createTestCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'customer-1',
    email: 'cliente@teste.com',
    name: 'João Silva',
    phone: '+351912345678',
    birthDate: '1990-05-15',
    preferredLocation: 'circunvalacao',
    marketingConsent: true,
    points: 100,
    totalSpent: 500.00,
    visitCount: 5,
    isActive: true,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestCustomerWithHistory(overrides: Partial<CustomerWithHistory> = {}): CustomerWithHistory {
  return {
    ...createTestCustomer(overrides),
    reservations: 3,
    lastVisit: new Date('2024-01-15T19:00:00Z'),
    ...overrides,
  };
}

// Mock do repositório
function createMockCustomerRepository(): ICustomerRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addPoints: vi.fn(),
    recordVisit: vi.fn(),
  };
}

describe('GetAllCustomersUseCase', () => {
  let useCase: GetAllCustomersUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new GetAllCustomersUseCase(mockRepository);
  });

  it('deve retornar lista de clientes', async () => {
    const customers = [
      createTestCustomer({ id: 'customer-1' }),
      createTestCustomer({ id: 'customer-2', name: 'Maria Santos' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(customers);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('deve aplicar filtro por localização', async () => {
    const filter = { location: 'boavista' as const };
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    await useCase.execute(filter);

    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('deve aplicar filtro por status ativo', async () => {
    const filter = { isActive: true };
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    await useCase.execute(filter);

    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('deve aplicar filtro de pesquisa', async () => {
    const filter = { search: 'João' };
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

describe('GetCustomerByIdUseCase', () => {
  let useCase: GetCustomerByIdUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new GetCustomerByIdUseCase(mockRepository);
  });

  it('deve retornar cliente por ID com histórico', async () => {
    const customerWithHistory = createTestCustomerWithHistory({ id: 'customer-1' });
    vi.mocked(mockRepository.findById).mockResolvedValue(customerWithHistory);

    const result = await useCase.execute('customer-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.id).toBe('customer-1');
      expect(result.data?.reservations).toBe(3);
    }
  });

  it('deve retornar null se cliente não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('customer-1');

    expect(result.success).toBe(false);
  });
});

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new CreateCustomerUseCase(mockRepository);
  });

  it('deve criar cliente com dados básicos', async () => {
    const createData = {
      email: 'novo@cliente.com',
      name: 'Novo Cliente',
    };
    const createdCustomer = createTestCustomer({ ...createData, id: 'new-customer' });

    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue(createdCustomer);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('novo@cliente.com');
    }
    expect(mockRepository.create).toHaveBeenCalledWith(createData);
  });

  it('deve criar cliente com todos os campos opcionais', async () => {
    const createData = {
      email: 'completo@cliente.com',
      name: 'Cliente Completo',
      phone: '+351911222333',
      birthDate: '1985-10-20',
      preferredLocation: 'boavista' as const,
      marketingConsent: true,
    };
    const createdCustomer = createTestCustomer({ ...createData });

    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue(createdCustomer);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    expect(mockRepository.create).toHaveBeenCalledWith(createData);
  });

  it('deve retornar erro se email já existe', async () => {
    const existingCustomer = createTestCustomer();
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(existingCustomer);

    const result = await useCase.execute({
      email: 'cliente@teste.com',
      name: 'Outro Cliente',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Email');
    }
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      email: 'novo@cliente.com',
      name: 'Novo Cliente',
    });

    expect(result.success).toBe(false);
  });
});

describe('UpdateCustomerUseCase', () => {
  let useCase: UpdateCustomerUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new UpdateCustomerUseCase(mockRepository);
  });

  it('deve atualizar dados do cliente', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    const updatedCustomer = createTestCustomer({ name: 'Nome Atualizado' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedCustomer);

    const result = await useCase.execute('customer-1', { name: 'Nome Atualizado' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Nome Atualizado');
    }
  });

  it('deve permitir atualizar email se não duplicado', async () => {
    const existingCustomer = createTestCustomerWithHistory({ email: 'old@email.com' });
    const updatedCustomer = createTestCustomer({ email: 'new@email.com' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedCustomer);

    const result = await useCase.execute('customer-1', { email: 'new@email.com' });

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se novo email já existe', async () => {
    const existingCustomer = createTestCustomerWithHistory({ email: 'old@email.com' });
    const otherCustomer = createTestCustomer({ id: 'other', email: 'taken@email.com' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(otherCustomer);

    const result = await useCase.execute('customer-1', { email: 'taken@email.com' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Email');
    }
  });

  it('deve retornar erro se cliente não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', { name: 'Novo Nome' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
  });

  it('deve atualizar pontos e valor gasto', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    const updatedCustomer = createTestCustomer({ points: 500, totalSpent: 1000 });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedCustomer);

    const result = await useCase.execute('customer-1', { points: 500, totalSpent: 1000 });

    expect(result.success).toBe(true);
    expect(mockRepository.update).toHaveBeenCalledWith('customer-1', { points: 500, totalSpent: 1000 });
  });
});

describe('DeleteCustomerUseCase', () => {
  let useCase: DeleteCustomerUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new DeleteCustomerUseCase(mockRepository);
  });

  it('deve remover cliente existente', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('customer-1');

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith('customer-1');
  });

  it('deve retornar erro se cliente não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('customer-1');

    expect(result.success).toBe(false);
  });
});

describe('AddCustomerPointsUseCase', () => {
  let useCase: AddCustomerPointsUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new AddCustomerPointsUseCase(mockRepository);
  });

  it('deve adicionar pontos ao cliente', async () => {
    const existingCustomer = createTestCustomerWithHistory({ points: 100 });
    const updatedCustomer = createTestCustomer({ points: 150 });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.addPoints).mockResolvedValue(updatedCustomer);

    const result = await useCase.execute('customer-1', 50);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.points).toBe(150);
    }
    expect(mockRepository.addPoints).toHaveBeenCalledWith('customer-1', 50);
  });

  it('deve retornar erro se pontos não são positivos', async () => {
    const result = await useCase.execute('customer-1', 0);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('positivos');
    }
    expect(mockRepository.addPoints).not.toHaveBeenCalled();
  });

  it('deve retornar erro se pontos são negativos', async () => {
    const result = await useCase.execute('customer-1', -50);

    expect(result.success).toBe(false);
    expect(mockRepository.addPoints).not.toHaveBeenCalled();
  });

  it('deve retornar erro se cliente não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', 50);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.addPoints).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('customer-1', 50);

    expect(result.success).toBe(false);
  });
});

describe('RecordCustomerVisitUseCase', () => {
  let useCase: RecordCustomerVisitUseCase;
  let mockRepository: ICustomerRepository;

  beforeEach(() => {
    mockRepository = createMockCustomerRepository();
    useCase = new RecordCustomerVisitUseCase(mockRepository);
  });

  it('deve registar visita com valor gasto', async () => {
    const existingCustomer = createTestCustomerWithHistory({
      visitCount: 5,
      totalSpent: 500
    });
    const updatedCustomer = createTestCustomer({
      visitCount: 6,
      totalSpent: 575
    });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.recordVisit).mockResolvedValue(updatedCustomer);

    const result = await useCase.execute('customer-1', 75);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visitCount).toBe(6);
      expect(result.data.totalSpent).toBe(575);
    }
    expect(mockRepository.recordVisit).toHaveBeenCalledWith('customer-1', 75);
  });

  it('deve permitir visita com valor zero', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    const updatedCustomer = createTestCustomer({ visitCount: 6 });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.recordVisit).mockResolvedValue(updatedCustomer);

    const result = await useCase.execute('customer-1', 0);

    expect(result.success).toBe(true);
    expect(mockRepository.recordVisit).toHaveBeenCalledWith('customer-1', 0);
  });

  it('deve retornar erro se valor é negativo', async () => {
    const result = await useCase.execute('customer-1', -50);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('negativo');
    }
    expect(mockRepository.recordVisit).not.toHaveBeenCalled();
  });

  it('deve retornar erro se cliente não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', 75);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrado');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existingCustomer = createTestCustomerWithHistory();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingCustomer);
    vi.mocked(mockRepository.recordVisit).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('customer-1', 75);

    expect(result.success).toBe(false);
  });
});
