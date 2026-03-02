import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferSessionDataUseCase, type TransferSessionDataInput } from '@/application/use-cases/customers/TransferSessionDataUseCase';
import type { ICustomerRepository, SessionStatsData } from '@/domain/repositories/ICustomerRepository';
import type { Customer } from '@/domain/entities/Customer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTestCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    email: 'joao@teste.pt',
    name: 'Joao Silva',
    phone: '+351912345678',
    birthDate: '1990-05-15',
    preferredLocation: 'circunvalacao',
    marketingConsent: true,
    points: 0,
    totalSpent: 50,
    visitCount: 2,
    gamesPlayed: 3,
    totalScore: 150,
    prizesWon: 1,
    prizesRedeemed: 0,
    ratingsGiven: 5,
    avgRatingGiven: 4.2,
    allergens: ['gluten'],
    isActive: true,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

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
    recordVisitWithSessionStats: vi.fn(),
    recordCompanionship: vi.fn(),
  } as unknown as ICustomerRepository;
}

function createSessionStats(overrides: Partial<SessionStatsData> = {}): SessionStatsData {
  return {
    gamesPlayed: 2,
    totalScore: 80,
    prizesWon: 1,
    prizesRedeemed: 0,
    ratingsGiven: 3,
    ratingsSum: 13,
    allergens: ['soy'],
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TransferSessionDataUseCase
// ═════════════════════════════════════════════════════════════════════════════

describe('TransferSessionDataUseCase', () => {
  let useCase: TransferSessionDataUseCase;
  let mockRepo: ICustomerRepository;

  const validInput: TransferSessionDataInput = {
    customerId: 'cust-1',
    totalSpent: 45.50,
    sessionStats: createSessionStats(),
    companionCustomerIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockCustomerRepository();
    useCase = new TransferSessionDataUseCase(mockRepo);
  });

  // ─── Validação ──────────────────────────────────────────────────────────

  it('deve retornar erro quando totalSpent é negativo', async () => {
    const result = await useCase.execute({ ...validInput, totalSpent: -10 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_AMOUNT');
    }
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it('deve retornar erro quando cliente não encontrado', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  // ─── Sucesso ────────────────────────────────────────────────────────────

  it('deve chamar recordVisitWithSessionStats com dados corretos', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);

    await useCase.execute(validInput);

    expect(mockRepo.recordVisitWithSessionStats).toHaveBeenCalledWith(
      'cust-1',
      45.50,
      validInput.sessionStats,
    );
  });

  it('deve retornar sucesso com customer atualizado', async () => {
    const customer = createTestCustomer({ gamesPlayed: 5, totalScore: 230 });
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gamesPlayed).toBe(5);
      expect(result.data.totalScore).toBe(230);
    }
  });

  it('deve aceitar totalSpent = 0', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);

    const result = await useCase.execute({ ...validInput, totalSpent: 0 });

    expect(result.success).toBe(true);
    expect(mockRepo.recordVisitWithSessionStats).toHaveBeenCalledWith(
      'cust-1',
      0,
      validInput.sessionStats,
    );
  });

  // ─── Session stats vazias ──────────────────────────────────────────────

  it('deve funcionar com session stats todas a zero', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);

    const emptyStats = createSessionStats({
      gamesPlayed: 0,
      totalScore: 0,
      prizesWon: 0,
      prizesRedeemed: 0,
      ratingsGiven: 0,
      ratingsSum: 0,
      allergens: [],
    });

    const result = await useCase.execute({
      ...validInput,
      sessionStats: emptyStats,
    });

    expect(result.success).toBe(true);
    expect(mockRepo.recordVisitWithSessionStats).toHaveBeenCalledWith(
      'cust-1',
      45.50,
      emptyStats,
    );
  });

  // ─── Companions ─────────────────────────────────────────────────────────

  it('deve registar companionships quando existem', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordCompanionship).mockResolvedValue(undefined);

    await useCase.execute({
      ...validInput,
      companionCustomerIds: ['comp-1', 'comp-2'],
    });

    expect(mockRepo.recordCompanionship).toHaveBeenCalledTimes(2);
    expect(mockRepo.recordCompanionship).toHaveBeenCalledWith('cust-1', 'comp-1');
    expect(mockRepo.recordCompanionship).toHaveBeenCalledWith('cust-1', 'comp-2');
  });

  it('não deve chamar recordCompanionship quando lista vazia', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);

    await useCase.execute(validInput);

    expect(mockRepo.recordCompanionship).not.toHaveBeenCalled();
  });

  it('deve continuar mesmo quando recordCompanionship falha para um companion', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordCompanionship)
      .mockRejectedValueOnce(new Error('FK violation'))
      .mockResolvedValueOnce(undefined);

    const result = await useCase.execute({
      ...validInput,
      companionCustomerIds: ['bad-comp', 'good-comp'],
    });

    expect(result.success).toBe(true);
    expect(mockRepo.recordCompanionship).toHaveBeenCalledTimes(2);
  });

  // ─── Erros ──────────────────────────────────────────────────────────────

  it('deve retornar erro quando recordVisitWithSessionStats falha', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockRejectedValue(
      new Error('Database connection lost'),
    );

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Database connection lost');
    }
  });

  it('deve retornar erro genérico quando exceção não é instância de Error', async () => {
    const customer = createTestCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(customer);
    vi.mocked(mockRepo.recordVisitWithSessionStats).mockRejectedValue('unknown');

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('transferir dados');
    }
  });
});
