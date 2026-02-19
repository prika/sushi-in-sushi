import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestBillUseCase } from '@/application/use-cases/sessions/RequestBillUseCase';
import { GetActiveSessionsUseCase } from '@/application/use-cases/sessions/GetActiveSessionsUseCase';
import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { Session, SessionWithTable } from '@/domain/entities/Session';

// Helper para criar uma sessão de teste
function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    tableId: 'table-1',
    status: 'active',
    isRodizio: true,
    numPeople: 4,
    totalAmount: 0,
    startedAt: new Date('2024-01-01T12:00:00Z'),
    closedAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestSessionWithTable(overrides: Partial<SessionWithTable> = {}): SessionWithTable {
  return {
    ...createTestSession(overrides),
    table: {
      id: 'table-1',
      number: 5,
      name: 'Mesa 5',
      location: 'circunvalacao',
    },
    ...overrides,
  };
}

// Mock do repositório
function createMockSessionRepository(): ISessionRepository {
  return {
    findById: vi.fn(),
    findByIdWithTable: vi.fn(),
    findByIdWithOrders: vi.fn(),
    findActiveByTable: vi.fn(),
    findAll: vi.fn(),
    findActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    close: vi.fn(),
    countByStatus: vi.fn(),
    calculateTotal: vi.fn(),
  };
}

describe('RequestBillUseCase', () => {
  let useCase: RequestBillUseCase;
  let mockRepository: ISessionRepository;

  beforeEach(() => {
    mockRepository = createMockSessionRepository();
    useCase = new RequestBillUseCase(mockRepository);
  });

  it('deve pedir conta de sessão ativa', async () => {
    const activeSession = createTestSession({ status: 'active', totalAmount: 0 });
    const updatedSession = createTestSession({ status: 'pending_payment', totalAmount: 150 });

    vi.mocked(mockRepository.findById).mockResolvedValue(activeSession);
    vi.mocked(mockRepository.calculateTotal).mockResolvedValue(150);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedSession);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.status).toBe('pending_payment');
      expect(result.data?.total).toBe(150);
    }
    expect(mockRepository.update).toHaveBeenCalledWith('session-1', {
      status: 'pending_payment',
      totalAmount: 150,
    });
  });

  it('deve retornar erro se sessão não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ sessionId: 'non-existent' });

    expect(result.success).toBe(false);
    expect(result.code).toBe('SESSION_NOT_FOUND');
    expect(result.error).toContain('não encontrada');
  });

  it('deve retornar erro se sessão já está fechada', async () => {
    const closedSession = createTestSession({
      status: 'closed',
      closedAt: new Date(),
    });
    vi.mocked(mockRepository.findById).mockResolvedValue(closedSession);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(false);
    expect(result.code).toBe('ALREADY_CLOSED');
  });

  it('deve retornar erro se sessão já está paga', async () => {
    const paidSession = createTestSession({
      status: 'paid',
      closedAt: new Date(),
    });
    vi.mocked(mockRepository.findById).mockResolvedValue(paidSession);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(false);
    // 'paid' can only transition to 'closed', not 'pending_payment'
    expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('deve retornar erro se sessão já está a aguardar pagamento', async () => {
    const pendingPaymentSession = createTestSession({
      status: 'pending_payment',
    });
    vi.mocked(mockRepository.findById).mockResolvedValue(pendingPaymentSession);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('deve calcular total correctamente', async () => {
    const activeSession = createTestSession({ status: 'active' });
    const updatedSession = createTestSession({ status: 'pending_payment', totalAmount: 275.50 });

    vi.mocked(mockRepository.findById).mockResolvedValue(activeSession);
    vi.mocked(mockRepository.calculateTotal).mockResolvedValue(275.50);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedSession);

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.total).toBe(275.50);
    }
    expect(mockRepository.calculateTotal).toHaveBeenCalledWith('session-1');
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({ sessionId: 'session-1' });

    expect(result.success).toBe(false);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });
});

describe('GetActiveSessionsUseCase', () => {
  let useCase: GetActiveSessionsUseCase;
  let mockRepository: ISessionRepository;

  beforeEach(() => {
    mockRepository = createMockSessionRepository();
    useCase = new GetActiveSessionsUseCase(mockRepository);
  });

  it('deve retornar sessões ativas', async () => {
    const sessions = [
      createTestSessionWithTable({ id: 'session-1', status: 'active' }),
      createTestSessionWithTable({ id: 'session-2', status: 'pending_payment' }),
      createTestSessionWithTable({ id: 'session-3', status: 'active' }),
    ];
    vi.mocked(mockRepository.findActive).mockResolvedValue(sessions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.sessions).toHaveLength(3);
      expect(result.data?.counts.active).toBe(2);
      expect(result.data?.counts.pendingPayment).toBe(1);
      expect(result.data?.counts.total).toBe(3);
    }
  });

  it('deve filtrar por localização', async () => {
    vi.mocked(mockRepository.findActive).mockResolvedValue([]);

    await useCase.execute({ location: 'boavista' });

    expect(mockRepository.findActive).toHaveBeenCalledWith('boavista');
  });

  it('deve calcular duração de cada sessão', async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60000);
    const sessions = [
      createTestSessionWithTable({ id: 'session-1', startedAt: oneHourAgo }),
    ];
    vi.mocked(mockRepository.findActive).mockResolvedValue(sessions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.sessions[0].durationMinutes).toBeGreaterThanOrEqual(59);
      expect(result.data?.sessions[0].duration).toBeDefined();
    }
  });

  it('deve retornar lista vazia se não há sessões ativas', async () => {
    vi.mocked(mockRepository.findActive).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.sessions).toHaveLength(0);
      expect(result.data?.counts.total).toBe(0);
    }
  });

  it('deve incluir informações da mesa', async () => {
    const sessions = [
      createTestSessionWithTable({
        id: 'session-1',
        table: {
          id: 'table-5',
          number: 5,
          name: 'Mesa 5',
          location: 'circunvalacao',
        },
      }),
    ];
    vi.mocked(mockRepository.findActive).mockResolvedValue(sessions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.sessions[0].table.number).toBe(5);
      expect(result.data?.sessions[0].table.location).toBe('circunvalacao');
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findActive).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });

  it('deve retornar sessões de ambas localizações quando não filtrado', async () => {
    const sessions = [
      createTestSessionWithTable({
        id: 'session-1',
        table: { id: 'table-1', number: 1, name: 'Mesa 1', location: 'circunvalacao' },
      }),
      createTestSessionWithTable({
        id: 'session-2',
        table: { id: 'table-2', number: 2, name: 'Mesa 2', location: 'boavista' },
      }),
    ];
    vi.mocked(mockRepository.findActive).mockResolvedValue(sessions);

    const result = await useCase.execute({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.sessions).toHaveLength(2);
    }
    expect(mockRepository.findActive).toHaveBeenCalledWith(undefined);
  });
});
