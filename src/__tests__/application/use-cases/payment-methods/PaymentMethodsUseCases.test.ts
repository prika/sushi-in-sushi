import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllPaymentMethodsUseCase } from '@/application/use-cases/payment-methods/GetAllPaymentMethodsUseCase';
import { CreatePaymentMethodUseCase } from '@/application/use-cases/payment-methods/CreatePaymentMethodUseCase';
import { UpdatePaymentMethodUseCase } from '@/application/use-cases/payment-methods/UpdatePaymentMethodUseCase';
import { DeletePaymentMethodUseCase } from '@/application/use-cases/payment-methods/DeletePaymentMethodUseCase';
import { IPaymentMethodRepository } from '@/domain/repositories/IPaymentMethodRepository';
import { PaymentMethod } from '@/domain/entities/PaymentMethod';

function createTestMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 1,
    name: 'Dinheiro',
    slug: 'cash',
    vendusId: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createMockRepository(): IPaymentMethodRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

describe('GetAllPaymentMethodsUseCase', () => {
  let useCase: GetAllPaymentMethodsUseCase;
  let mockRepository: IPaymentMethodRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new GetAllPaymentMethodsUseCase(mockRepository);
  });

  it('deve retornar lista de metodos de pagamento', async () => {
    const methods = [
      createTestMethod({ id: 1, name: 'Dinheiro', slug: 'cash' }),
      createTestMethod({ id: 2, name: 'Multibanco', slug: 'card' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(methods);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Dinheiro');
    }
  });

  it('deve retornar lista vazia quando nao ha metodos', async () => {
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro quando repositorio falha', async () => {
    vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});

describe('CreatePaymentMethodUseCase', () => {
  let useCase: CreatePaymentMethodUseCase;
  let mockRepository: IPaymentMethodRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new CreatePaymentMethodUseCase(mockRepository);
  });

  it('deve criar metodo com sucesso', async () => {
    const method = createTestMethod();
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue(method);

    const result = await useCase.execute({ name: 'Dinheiro', slug: 'cash' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Dinheiro');
    }
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('deve falhar se nome vazio', async () => {
    const result = await useCase.execute({ name: '', slug: 'test' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });

  it('deve falhar se slug vazio', async () => {
    const result = await useCase.execute({ name: 'Test', slug: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });

  it('deve falhar se slug duplicado', async () => {
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(createTestMethod());

    const result = await useCase.execute({ name: 'Dinheiro 2', slug: 'cash' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DUPLICATE_SLUG');
    }
  });

  it('deve retornar erro quando repositorio falha', async () => {
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({ name: 'Test', slug: 'test' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});

describe('UpdatePaymentMethodUseCase', () => {
  let useCase: UpdatePaymentMethodUseCase;
  let mockRepository: IPaymentMethodRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new UpdatePaymentMethodUseCase(mockRepository);
  });

  it('deve atualizar metodo com sucesso', async () => {
    const existing = createTestMethod();
    const updated = createTestMethod({ name: 'Dinheiro (cash)' });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.update).mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 1,
      data: { name: 'Dinheiro (cash)' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Dinheiro (cash)');
    }
  });

  it('deve falhar se metodo nao encontrado', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({
      id: 999,
      data: { name: 'Test' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('deve falhar se novo slug ja existe', async () => {
    const existing = createTestMethod({ slug: 'cash' });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.findBySlug).mockResolvedValue(
      createTestMethod({ id: 2, slug: 'card' })
    );

    const result = await useCase.execute({
      id: 1,
      data: { slug: 'card' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DUPLICATE_SLUG');
    }
  });

  it('deve permitir manter o mesmo slug', async () => {
    const existing = createTestMethod({ slug: 'cash' });
    const updated = createTestMethod({ slug: 'cash', name: 'Updated' });
    vi.mocked(mockRepository.findById).mockResolvedValue(existing);
    vi.mocked(mockRepository.update).mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 1,
      data: { slug: 'cash', name: 'Updated' },
    });

    expect(result.success).toBe(true);
    expect(mockRepository.findBySlug).not.toHaveBeenCalled();
  });

  it('deve retornar erro quando repositorio falha', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(createTestMethod());
    vi.mocked(mockRepository.update).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({
      id: 1,
      data: { name: 'Test' },
    });

    expect(result.success).toBe(false);
  });
});

describe('DeletePaymentMethodUseCase', () => {
  let useCase: DeletePaymentMethodUseCase;
  let mockRepository: IPaymentMethodRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new DeletePaymentMethodUseCase(mockRepository);
  });

  it('deve eliminar metodo com sucesso', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(createTestMethod());
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute(1);

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith(1);
  });

  it('deve falhar se metodo nao encontrado', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('deve retornar erro quando repositorio falha', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(createTestMethod());
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});
