import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptInLoyaltyProgramUseCase } from '@/application/use-cases/session-customers/OptInLoyaltyProgramUseCase';
import { RegisterSessionCustomerUseCase } from '@/application/use-cases/session-customers/RegisterSessionCustomerUseCase';
import { UpdateSessionCustomerTierUseCase } from '@/application/use-cases/session-customers/UpdateSessionCustomerTierUseCase';
import { Customer } from '@/domain/entities/Customer';

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
    totalSpent: 0,
    visitCount: 0,
    isActive: true,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createMockCustomerRepository() {
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

function createMockDeviceProfileRepository() {
  return {
    findByDeviceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    incrementVisitCount: vi.fn(),
  };
}

function createMockSessionCustomerClient() {
  return {
    insertSessionCustomer: vi.fn(),
    updateSessionCustomer: vi.fn(),
    getSessionCustomer: vi.fn(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// OptInLoyaltyProgramUseCase
// ═════════════════════════════════════════════════════════════════════════════

describe('OptInLoyaltyProgramUseCase', () => {
  let useCase: OptInLoyaltyProgramUseCase;
  let mockCustomerRepo: ReturnType<typeof createMockCustomerRepository>;
  let mockDeviceProfileRepo: ReturnType<typeof createMockDeviceProfileRepository>;
  let mockSessionCustomerClient: ReturnType<typeof createMockSessionCustomerClient>;

  const validInput = {
    sessionCustomerId: 'sc-1',
    deviceId: 'device-abc',
    email: 'joao@teste.pt',
    name: 'Joao Silva',
    phone: '+351912345678',
    marketingConsent: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerRepo = createMockCustomerRepository();
    mockDeviceProfileRepo = createMockDeviceProfileRepository();
    mockSessionCustomerClient = createMockSessionCustomerClient();
    useCase = new OptInLoyaltyProgramUseCase(
      mockCustomerRepo,
      mockDeviceProfileRepo,
      mockSessionCustomerClient,
    );
  });

  it('deve retornar erro quando marketingConsent e false', async () => {
    const result = await useCase.execute({ ...validInput, marketingConsent: false });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('CONSENT_REQUIRED');
    }
  });

  it('deve retornar erro quando email e vazio', async () => {
    const result = await useCase.execute({ ...validInput, email: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('EMAIL_REQUIRED');
    }
  });

  it('deve retornar erro quando email e apenas espacos', async () => {
    const result = await useCase.execute({ ...validInput, email: '   ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('EMAIL_REQUIRED');
    }
  });

  it('deve retornar erro quando nome e vazio', async () => {
    const result = await useCase.execute({ ...validInput, name: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NAME_REQUIRED');
    }
  });

  it('deve criar novo cliente quando findByEmail retorna null', async () => {
    const newCustomer = createTestCustomer();
    mockCustomerRepo.findByEmail.mockResolvedValue(null);
    mockCustomerRepo.create.mockResolvedValue(newCustomer);
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    expect(mockCustomerRepo.findByEmail).toHaveBeenCalledWith('joao@teste.pt');
    expect(mockCustomerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'joao@teste.pt',
        name: 'Joao Silva',
        marketingConsent: true,
      }),
    );
  });

  it('deve usar cliente existente quando findByEmail retorna cliente', async () => {
    const existingCustomer = createTestCustomer({ id: 'existing-cust-99' });
    mockCustomerRepo.findByEmail.mockResolvedValue(existingCustomer);
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBe('existing-cust-99');
    }
    expect(mockCustomerRepo.create).not.toHaveBeenCalled();
  });

  it('deve retornar erro quando updateSessionCustomer falha', async () => {
    mockCustomerRepo.findByEmail.mockResolvedValue(createTestCustomer());
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({
      error: { message: 'DB error' },
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });

  it('deve vincular device profile (fire-and-forget)', async () => {
    const customer = createTestCustomer();
    mockCustomerRepo.findByEmail.mockResolvedValue(customer);
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    await useCase.execute(validInput);

    expect(mockDeviceProfileRepo.update).toHaveBeenCalledWith(
      'device-abc',
      { linkedCustomerId: customer.id },
    );
  });

  it('deve retornar sucesso com customerId', async () => {
    const customer = createTestCustomer({ id: 'cust-42' });
    mockCustomerRepo.findByEmail.mockResolvedValue(customer);
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ customerId: 'cust-42' });
    }
  });

  it('deve retornar erro generico em caso de excepcao', async () => {
    mockCustomerRepo.findByEmail.mockRejectedValue(new Error('Connection lost'));

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Connection lost');
    }
  });

  it('deve retornar erro generico quando excepcao nao e instancia de Error', async () => {
    mockCustomerRepo.findByEmail.mockRejectedValue('unknown failure');

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('programa de fideliza');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RegisterSessionCustomerUseCase
// ═════════════════════════════════════════════════════════════════════════════

describe('RegisterSessionCustomerUseCase', () => {
  let useCase: RegisterSessionCustomerUseCase;
  let mockSessionCustomerClient: ReturnType<typeof createMockSessionCustomerClient>;
  let mockDeviceProfileRepo: ReturnType<typeof createMockDeviceProfileRepository>;

  const validInput = {
    sessionId: 'session-1',
    deviceId: 'device-abc',
    displayName: 'Joao',
    fullName: 'Joao Silva',
    email: 'joao@teste.pt',
    phone: '+351912345678',
    birthDate: '1990-05-15',
    marketingConsent: true,
    preferredContact: 'email' as const,
    isSessionHost: true,
  };

  const mockInsertedData = {
    id: 'sc-1',
    session_id: 'session-1',
    display_name: 'Joao',
    full_name: 'Joao Silva',
    email: 'joao@teste.pt',
    phone: '+351912345678',
    birth_date: '1990-05-15',
    marketing_consent: true,
    preferred_contact: 'email',
    customer_id: null,
    is_session_host: true,
    device_id: 'device-abc',
    tier: 3,
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionCustomerClient = createMockSessionCustomerClient();
    mockDeviceProfileRepo = createMockDeviceProfileRepository();
    useCase = new RegisterSessionCustomerUseCase(
      mockSessionCustomerClient,
      mockDeviceProfileRepo,
    );
  });

  it('deve retornar erro quando displayName e vazio', async () => {
    const result = await useCase.execute({ ...validInput, displayName: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
  });

  it('deve retornar erro quando displayName e apenas espacos', async () => {
    const result = await useCase.execute({ ...validInput, displayName: '   ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NAME');
    }
  });

  it('deve retornar erro quando sessionId e falsy', async () => {
    const result = await useCase.execute({ ...validInput, sessionId: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_SESSION');
    }
  });

  it('deve computar tier usando computeCustomerTier', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: mockInsertedData,
      error: null,
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      // With email + phone + fullName + birthDate => tier 3
      expect(result.data.tier).toBe(3);
    }
  });

  it('deve computar tier 1 quando so tem displayName', async () => {
    const minimalInput = {
      sessionId: 'session-1',
      deviceId: 'device-abc',
      displayName: 'Joao',
      isSessionHost: false,
    };

    const minimalData = {
      ...mockInsertedData,
      full_name: null,
      email: null,
      phone: null,
      birth_date: null,
      marketing_consent: false,
      is_session_host: false,
      tier: 1,
    };

    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: minimalData,
      error: null,
    });

    const result = await useCase.execute(minimalInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier).toBe(1);
    }
  });

  it('deve inserir session customer com mapeamento snake_case correto', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: mockInsertedData,
      error: null,
    });

    await useCase.execute(validInput);

    expect(mockSessionCustomerClient.insertSessionCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'session-1',
        display_name: 'Joao',
        full_name: 'Joao Silva',
        email: 'joao@teste.pt',
        phone: '+351912345678',
        birth_date: '1990-05-15',
        marketing_consent: true,
        preferred_contact: 'email',
        is_session_host: true,
        device_id: 'device-abc',
      }),
    );
  });

  it('deve retornar erro quando insertSessionCustomer retorna error', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Insert failed');
    }
  });

  it('deve retornar erro quando insertSessionCustomer retorna data null', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('registar participante');
    }
  });

  it('deve fazer upsert do device profile (fire-and-forget)', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: mockInsertedData,
      error: null,
    });

    await useCase.execute(validInput);

    expect(mockDeviceProfileRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device-abc',
        lastDisplayName: 'Joao',
        lastFullName: 'Joao Silva',
        lastEmail: 'joao@teste.pt',
        lastPhone: '+351912345678',
        lastBirthDate: '1990-05-15',
        lastPreferredContact: 'email',
      }),
    );
  });

  it('deve retornar sucesso com data e tier', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockResolvedValue({
      data: mockInsertedData,
      error: null,
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('sc-1');
      expect(result.data.session_id).toBe('session-1');
      expect(result.data.tier).toBe(3);
    }
  });

  it('deve retornar erro generico em caso de excepcao', async () => {
    mockSessionCustomerClient.insertSessionCustomer.mockRejectedValue(
      new Error('Network timeout'),
    );

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Network timeout');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UpdateSessionCustomerTierUseCase
// ═════════════════════════════════════════════════════════════════════════════

describe('UpdateSessionCustomerTierUseCase', () => {
  let useCase: UpdateSessionCustomerTierUseCase;
  let mockSessionCustomerClient: ReturnType<typeof createMockSessionCustomerClient>;
  let mockDeviceProfileRepo: ReturnType<typeof createMockDeviceProfileRepository>;

  const currentRecord = {
    display_name: 'Joao',
    email: null as string | null,
    phone: null as string | null,
    full_name: null as string | null,
    birth_date: null as string | null,
  };

  const validInput = {
    sessionCustomerId: 'sc-1',
    deviceId: 'device-abc',
    updates: {
      email: 'joao@teste.pt',
      phone: '+351912345678',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionCustomerClient = createMockSessionCustomerClient();
    mockDeviceProfileRepo = createMockDeviceProfileRepository();
    useCase = new UpdateSessionCustomerTierUseCase(
      mockSessionCustomerClient,
      mockDeviceProfileRepo,
    );
  });

  it('deve retornar erro quando sessionCustomerId e vazio', async () => {
    const result = await useCase.execute({
      ...validInput,
      sessionCustomerId: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_ID');
    }
  });

  it('deve retornar erro quando getSessionCustomer retorna error', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('deve retornar erro quando getSessionCustomer retorna data null', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('deve fundir updates com dados atuais e computar novo tier', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: currentRecord,
      error: null,
    });
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      // displayName + email + phone => tier 2
      expect(result.data.tier).toBe(2);
    }
  });

  it('deve computar tier 3 quando todos os campos estao preenchidos', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: { ...currentRecord, email: 'joao@teste.pt', phone: '+351912345678' },
      error: null,
    });
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    const result = await useCase.execute({
      ...validInput,
      updates: {
        fullName: 'Joao Silva',
        birthDate: '1990-05-15',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // email + phone + fullName + birthDate => tier 3
      expect(result.data.tier).toBe(3);
    }
  });

  it('deve retornar erro quando updateSessionCustomer falha', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: currentRecord,
      error: null,
    });
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({
      error: { message: 'Update failed' },
    });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Update failed');
    }
  });

  it('deve incluir apenas campos fornecidos no updateData', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: currentRecord,
      error: null,
    });
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    await useCase.execute({
      sessionCustomerId: 'sc-1',
      deviceId: 'device-abc',
      updates: { email: 'novo@teste.pt' },
    });

    const updateCall = mockSessionCustomerClient.updateSessionCustomer.mock.calls[0];
    const updateData = updateCall[1] as Record<string, unknown>;

    expect(updateData.email).toBe('novo@teste.pt');
    expect(updateData).toHaveProperty('tier');
    // Should NOT include fields that were not in updates
    expect(updateData).not.toHaveProperty('phone');
    expect(updateData).not.toHaveProperty('full_name');
    expect(updateData).not.toHaveProperty('birth_date');
  });

  it('deve retornar sucesso com novo tier', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: currentRecord,
      error: null,
    });
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty('tier');
      expect(typeof result.data.tier).toBe('number');
    }
  });

  it('deve fazer upsert do device profile (fire-and-forget)', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockResolvedValue({
      data: currentRecord,
      error: null,
    });
    mockSessionCustomerClient.updateSessionCustomer.mockResolvedValue({ error: null });

    await useCase.execute(validInput);

    expect(mockDeviceProfileRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device-abc',
        lastDisplayName: 'Joao',
        lastEmail: 'joao@teste.pt',
        lastPhone: '+351912345678',
      }),
    );
  });

  it('deve retornar erro generico em caso de excepcao', async () => {
    mockSessionCustomerClient.getSessionCustomer.mockRejectedValue(
      new Error('Connection reset'),
    );

    const result = await useCase.execute(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Connection reset');
    }
  });
});
