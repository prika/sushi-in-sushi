import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllWaiterCallsUseCase } from '@/application/use-cases/waiter-calls/GetAllWaiterCallsUseCase';
import { GetPendingWaiterCallsUseCase } from '@/application/use-cases/waiter-calls/GetPendingWaiterCallsUseCase';
import { CreateWaiterCallUseCase } from '@/application/use-cases/waiter-calls/CreateWaiterCallUseCase';
import { AcknowledgeWaiterCallUseCase } from '@/application/use-cases/waiter-calls/AcknowledgeWaiterCallUseCase';
import { CompleteWaiterCallUseCase } from '@/application/use-cases/waiter-calls/CompleteWaiterCallUseCase';
import { CancelWaiterCallUseCase } from '@/application/use-cases/waiter-calls/CancelWaiterCallUseCase';
import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCall, WaiterCallWithDetails } from '@/domain/entities/WaiterCall';

// Helper para criar uma chamada de teste
function createTestWaiterCall(overrides: Partial<WaiterCall> = {}): WaiterCall {
  return {
    id: 'call-1',
    tableId: 'table-1',
    sessionId: 'session-1',
    callType: 'assistance',
    message: null,
    status: 'pending',
    acknowledgedBy: null,
    acknowledgedAt: null,
    completedAt: null,
    location: 'circunvalacao',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestWaiterCallWithDetails(overrides: Partial<WaiterCallWithDetails> = {}): WaiterCallWithDetails {
  return {
    ...createTestWaiterCall(overrides),
    tableNumber: 5,
    tableName: 'Mesa 5',
    acknowledgedByName: null,
    assignedWaiterName: 'João Silva',
    assignedWaiterId: 'waiter-1',
    ...overrides,
  };
}

// Mock do repositório
function createMockWaiterCallRepository(): IWaiterCallRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findPending: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    acknowledge: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  };
}

describe('GetAllWaiterCallsUseCase', () => {
  let useCase: GetAllWaiterCallsUseCase;
  let mockRepository: IWaiterCallRepository;

  beforeEach(() => {
    mockRepository = createMockWaiterCallRepository();
    useCase = new GetAllWaiterCallsUseCase(mockRepository);
  });

  it('deve retornar lista de chamadas', async () => {
    const calls = [
      createTestWaiterCallWithDetails({ id: 'call-1' }),
      createTestWaiterCallWithDetails({ id: 'call-2' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(calls);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('deve aplicar filtros', async () => {
    const filter = { location: 'boavista' as const, status: 'pending' as const };
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

describe('GetPendingWaiterCallsUseCase', () => {
  let useCase: GetPendingWaiterCallsUseCase;
  let mockRepository: IWaiterCallRepository;

  beforeEach(() => {
    mockRepository = createMockWaiterCallRepository();
    useCase = new GetPendingWaiterCallsUseCase(mockRepository);
  });

  it('deve retornar apenas chamadas pendentes', async () => {
    const pendingCalls = [
      createTestWaiterCallWithDetails({ id: 'call-1', status: 'pending' }),
      createTestWaiterCallWithDetails({ id: 'call-2', status: 'pending' }),
    ];
    vi.mocked(mockRepository.findPending).mockResolvedValue(pendingCalls);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data.every(c => c.status === 'pending')).toBe(true);
    }
  });

  it('deve filtrar por localização', async () => {
    vi.mocked(mockRepository.findPending).mockResolvedValue([]);

    await useCase.execute('boavista');

    expect(mockRepository.findPending).toHaveBeenCalledWith('boavista');
  });
});

describe('CreateWaiterCallUseCase', () => {
  let useCase: CreateWaiterCallUseCase;
  let mockRepository: IWaiterCallRepository;

  beforeEach(() => {
    mockRepository = createMockWaiterCallRepository();
    useCase = new CreateWaiterCallUseCase(mockRepository);
  });

  it('deve criar chamada de assistência', async () => {
    const createData = {
      tableId: 'table-5',
      sessionId: 'session-1',
      callType: 'assistance' as const,
      location: 'circunvalacao' as const,
    };
    const createdCall = createTestWaiterCall({ ...createData });

    vi.mocked(mockRepository.create).mockResolvedValue(createdCall);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callType).toBe('assistance');
      expect(result.data.status).toBe('pending');
    }
  });

  it('deve criar chamada para conta', async () => {
    const createData = {
      tableId: 'table-5',
      callType: 'bill' as const,
      location: 'boavista' as const,
    };
    const createdCall = createTestWaiterCall({ ...createData, callType: 'bill' });

    vi.mocked(mockRepository.create).mockResolvedValue(createdCall);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callType).toBe('bill');
    }
  });

  it('deve criar chamada com mensagem', async () => {
    const createData = {
      tableId: 'table-5',
      callType: 'other' as const,
      message: 'Preciso de uma cadeira extra',
      location: 'circunvalacao' as const,
    };
    const createdCall = createTestWaiterCall({ ...createData });

    vi.mocked(mockRepository.create).mockResolvedValue(createdCall);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      tableId: 'table-5',
      location: 'circunvalacao',
    });

    expect(result.success).toBe(false);
  });
});

describe('AcknowledgeWaiterCallUseCase', () => {
  let useCase: AcknowledgeWaiterCallUseCase;
  let mockRepository: IWaiterCallRepository;

  beforeEach(() => {
    mockRepository = createMockWaiterCallRepository();
    useCase = new AcknowledgeWaiterCallUseCase(mockRepository);
  });

  it('deve reconhecer chamada pendente', async () => {
    const pendingCall = createTestWaiterCall({ status: 'pending' });
    const acknowledgedCall = createTestWaiterCall({
      status: 'acknowledged',
      acknowledgedBy: 'waiter-1',
      acknowledgedAt: new Date(),
    });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingCall);
    vi.mocked(mockRepository.acknowledge).mockResolvedValue(acknowledgedCall);

    const result = await useCase.execute('call-1', 'waiter-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('acknowledged');
      expect(result.data.acknowledgedBy).toBe('waiter-1');
    }
  });

  it('deve retornar erro se chamada não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', 'waiter-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrad');
    }
  });

  it('deve retornar erro se chamada já foi reconhecida', async () => {
    const acknowledgedCall = createTestWaiterCall({ status: 'acknowledged' });
    vi.mocked(mockRepository.findById).mockResolvedValue(acknowledgedCall);

    const result = await useCase.execute('call-1', 'waiter-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('já foi');
    }
  });

  it('deve retornar erro se chamada já foi completada', async () => {
    const completedCall = createTestWaiterCall({ status: 'completed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(completedCall);

    const result = await useCase.execute('call-1', 'waiter-1');

    expect(result.success).toBe(false);
  });
});

describe('CompleteWaiterCallUseCase', () => {
  let useCase: CompleteWaiterCallUseCase;
  let mockRepository: IWaiterCallRepository;

  beforeEach(() => {
    mockRepository = createMockWaiterCallRepository();
    useCase = new CompleteWaiterCallUseCase(mockRepository);
  });

  it('deve completar chamada reconhecida', async () => {
    const acknowledgedCall = createTestWaiterCall({ status: 'acknowledged' });
    const completedCall = createTestWaiterCall({
      status: 'completed',
      completedAt: new Date(),
    });

    vi.mocked(mockRepository.findById).mockResolvedValue(acknowledgedCall);
    vi.mocked(mockRepository.complete).mockResolvedValue(completedCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('completed');
    }
  });

  it('deve completar chamada pendente diretamente', async () => {
    const pendingCall = createTestWaiterCall({ status: 'pending' });
    const completedCall = createTestWaiterCall({ status: 'completed' });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingCall);
    vi.mocked(mockRepository.complete).mockResolvedValue(completedCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('completed');
    }
  });

  it('deve retornar erro se chamada não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
  });

  it('deve retornar erro se chamada já foi completada', async () => {
    const completedCall = createTestWaiterCall({ status: 'completed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(completedCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(false);
  });
});

describe('CancelWaiterCallUseCase', () => {
  let useCase: CancelWaiterCallUseCase;
  let mockRepository: IWaiterCallRepository;

  beforeEach(() => {
    mockRepository = createMockWaiterCallRepository();
    useCase = new CancelWaiterCallUseCase(mockRepository);
  });

  it('deve cancelar chamada pendente', async () => {
    const pendingCall = createTestWaiterCall({ status: 'pending' });
    const cancelledCall = createTestWaiterCall({ status: 'cancelled' });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingCall);
    vi.mocked(mockRepository.cancel).mockResolvedValue(cancelledCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('cancelled');
    }
  });

  it('deve cancelar chamada reconhecida', async () => {
    const acknowledgedCall = createTestWaiterCall({ status: 'acknowledged' });
    const cancelledCall = createTestWaiterCall({ status: 'cancelled' });

    vi.mocked(mockRepository.findById).mockResolvedValue(acknowledgedCall);
    vi.mocked(mockRepository.cancel).mockResolvedValue(cancelledCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se chamada não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
  });

  it('deve retornar erro se chamada já foi completada', async () => {
    const completedCall = createTestWaiterCall({ status: 'completed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(completedCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(false);
  });

  it('deve retornar erro se chamada já foi cancelada', async () => {
    const cancelledCall = createTestWaiterCall({ status: 'cancelled' });
    vi.mocked(mockRepository.findById).mockResolvedValue(cancelledCall);

    const result = await useCase.execute('call-1');

    expect(result.success).toBe(false);
  });
});
