import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllReservationsUseCase } from '@/application/use-cases/reservations/GetAllReservationsUseCase';
import { GetReservationByIdUseCase } from '@/application/use-cases/reservations/GetReservationByIdUseCase';
import { CreateReservationUseCase } from '@/application/use-cases/reservations/CreateReservationUseCase';
import { UpdateReservationUseCase } from '@/application/use-cases/reservations/UpdateReservationUseCase';
import { ConfirmReservationUseCase } from '@/application/use-cases/reservations/ConfirmReservationUseCase';
import { CancelReservationUseCase } from '@/application/use-cases/reservations/CancelReservationUseCase';
import { MarkReservationSeatedUseCase } from '@/application/use-cases/reservations/MarkReservationSeatedUseCase';
import { MarkReservationNoShowUseCase } from '@/application/use-cases/reservations/MarkReservationNoShowUseCase';
import { DeleteReservationUseCase } from '@/application/use-cases/reservations/DeleteReservationUseCase';
import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { Reservation, ReservationWithDetails } from '@/domain/entities/Reservation';

// Helper para criar uma reserva de teste
function createTestReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'reservation-1',
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@teste.com',
    phone: '+351912345678',
    reservationDate: '2024-02-15',
    reservationTime: '19:00',
    partySize: 4,
    location: 'circunvalacao',
    tableId: null,
    isRodizio: true,
    specialRequests: null,
    occasion: null,
    status: 'pending',
    confirmedBy: null,
    confirmedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    sessionId: null,
    seatedAt: null,
    marketingConsent: false,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestReservationWithDetails(overrides: Partial<ReservationWithDetails> = {}): ReservationWithDetails {
  return {
    ...createTestReservation(overrides),
    tableNumber: null,
    tableName: null,
    confirmedByName: null,
    customerName: 'João Silva',
    statusLabel: 'Pendente',
    ...overrides,
  };
}

// Mock do repositório de reservas
function createMockReservationRepository(): IReservationRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByDate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    markAsSeated: vi.fn(),
    markAsNoShow: vi.fn(),
    markAsCompleted: vi.fn(),
  };
}

// Mock do repositório de folgas
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

describe('GetAllReservationsUseCase', () => {
  let useCase: GetAllReservationsUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new GetAllReservationsUseCase(mockRepository);
  });

  it('deve retornar lista de reservas', async () => {
    const reservations = [
      createTestReservationWithDetails({ id: 'res-1' }),
      createTestReservationWithDetails({ id: 'res-2' }),
    ];
    vi.mocked(mockRepository.findAll).mockResolvedValue(reservations);

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

  it('deve aplicar filtro por status', async () => {
    const filter = { status: 'confirmed' as const };
    vi.mocked(mockRepository.findAll).mockResolvedValue([]);

    await useCase.execute(filter);

    expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
  });

  it('deve aplicar filtro por data', async () => {
    const filter = { date: '2024-02-15' };
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

describe('GetReservationByIdUseCase', () => {
  let useCase: GetReservationByIdUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new GetReservationByIdUseCase(mockRepository);
  });

  it('deve retornar reserva por ID', async () => {
    const reservation = createTestReservation({ id: 'reservation-1' });
    vi.mocked(mockRepository.findById).mockResolvedValue(reservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.id).toBe('reservation-1');
    }
  });

  it('deve retornar null se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(false);
  });
});

describe('CreateReservationUseCase', () => {
  let useCase: CreateReservationUseCase;
  let mockReservationRepository: IReservationRepository;
  let mockClosureRepository: IRestaurantClosureRepository;

  beforeEach(() => {
    mockReservationRepository = createMockReservationRepository();
    mockClosureRepository = createMockClosureRepository();
    useCase = new CreateReservationUseCase(mockReservationRepository, mockClosureRepository);
  });

  it('deve criar reserva quando restaurante está aberto', async () => {
    const createData = {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@teste.com',
      phone: '+351911222333',
      reservationDate: '2024-02-20',
      reservationTime: '20:00',
      partySize: 2,
      location: 'circunvalacao' as const,
    };
    const createdReservation = createTestReservation({ ...createData });

    vi.mocked(mockClosureRepository.checkClosure).mockResolvedValue({ isClosed: false });
    vi.mocked(mockReservationRepository.create).mockResolvedValue(createdReservation);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    expect(mockClosureRepository.checkClosure).toHaveBeenCalledWith('2024-02-20', 'circunvalacao');
    expect(mockReservationRepository.create).toHaveBeenCalledWith(createData);
  });

  it('deve retornar erro se restaurante está fechado', async () => {
    const createData = {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@teste.com',
      phone: '+351911222333',
      reservationDate: '2024-02-20',
      reservationTime: '20:00',
      partySize: 2,
      location: 'circunvalacao' as const,
    };

    vi.mocked(mockClosureRepository.checkClosure).mockResolvedValue({
      isClosed: true,
      reason: 'Feriado',
    });

    const result = await useCase.execute(createData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Feriado');
    }
    expect(mockReservationRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar reserva com campos opcionais', async () => {
    const createData = {
      firstName: 'Pedro',
      lastName: 'Costa',
      email: 'pedro@teste.com',
      phone: '+351933444555',
      reservationDate: '2024-02-25',
      reservationTime: '21:00',
      partySize: 6,
      location: 'boavista' as const,
      isRodizio: true,
      specialRequests: 'Mesa junto à janela',
      occasion: 'birthday' as const,
      marketingConsent: true,
    };
    const createdReservation = createTestReservation({ ...createData });

    vi.mocked(mockClosureRepository.checkClosure).mockResolvedValue({ isClosed: false });
    vi.mocked(mockReservationRepository.create).mockResolvedValue(createdReservation);

    const result = await useCase.execute(createData);

    expect(result.success).toBe(true);
    expect(mockReservationRepository.create).toHaveBeenCalledWith(createData);
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockClosureRepository.checkClosure).mockResolvedValue({ isClosed: false });
    vi.mocked(mockReservationRepository.create).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      phone: '+351900000000',
      reservationDate: '2024-02-20',
      reservationTime: '19:00',
      partySize: 2,
      location: 'circunvalacao',
    });

    expect(result.success).toBe(false);
  });
});

describe('UpdateReservationUseCase', () => {
  let useCase: UpdateReservationUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new UpdateReservationUseCase(mockRepository);
  });

  it('deve atualizar reserva existente', async () => {
    const existingReservation = createTestReservation();
    const updatedReservation = createTestReservation({ tableId: 5 });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingReservation);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedReservation);

    const result = await useCase.execute('reservation-1', { tableId: 5 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tableId).toBe(5);
    }
  });

  it('deve retornar erro se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', { tableId: 5 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve atualizar status da reserva', async () => {
    const existingReservation = createTestReservation({ status: 'pending' });
    const updatedReservation = createTestReservation({ status: 'confirmed' });

    vi.mocked(mockRepository.findById).mockResolvedValue(existingReservation);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedReservation);

    const result = await useCase.execute('reservation-1', { status: 'confirmed' });

    expect(result.success).toBe(true);
    expect(mockRepository.update).toHaveBeenCalledWith('reservation-1', { status: 'confirmed' });
  });
});

describe('ConfirmReservationUseCase', () => {
  let useCase: ConfirmReservationUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new ConfirmReservationUseCase(mockRepository);
  });

  it('deve confirmar reserva pendente', async () => {
    const pendingReservation = createTestReservation({ status: 'pending' });
    const confirmedReservation = createTestReservation({
      status: 'confirmed',
      confirmedBy: 'staff-1',
      confirmedAt: new Date(),
    });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingReservation);
    vi.mocked(mockRepository.confirm).mockResolvedValue(confirmedReservation);

    const result = await useCase.execute('reservation-1', 'staff-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('confirmed');
      expect(result.data.confirmedBy).toBe('staff-1');
    }
    expect(mockRepository.confirm).toHaveBeenCalledWith('reservation-1', 'staff-1');
  });

  it('deve retornar erro se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', 'staff-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se reserva não está pendente', async () => {
    const confirmedReservation = createTestReservation({ status: 'confirmed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(confirmedReservation);

    const result = await useCase.execute('reservation-1', 'staff-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('pendentes');
    }
    expect(mockRepository.confirm).not.toHaveBeenCalled();
  });

  it('deve retornar erro se reserva está cancelada', async () => {
    const cancelledReservation = createTestReservation({ status: 'cancelled' });
    vi.mocked(mockRepository.findById).mockResolvedValue(cancelledReservation);

    const result = await useCase.execute('reservation-1', 'staff-1');

    expect(result.success).toBe(false);
  });
});

describe('CancelReservationUseCase', () => {
  let useCase: CancelReservationUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new CancelReservationUseCase(mockRepository);
  });

  it('deve cancelar reserva pendente', async () => {
    const pendingReservation = createTestReservation({ status: 'pending' });
    const cancelledReservation = createTestReservation({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'Cliente pediu cancelamento',
    });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingReservation);
    vi.mocked(mockRepository.cancel).mockResolvedValue(cancelledReservation);

    const result = await useCase.execute('reservation-1', 'Cliente pediu cancelamento');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('cancelled');
    }
    expect(mockRepository.cancel).toHaveBeenCalledWith('reservation-1', 'Cliente pediu cancelamento');
  });

  it('deve cancelar reserva confirmada', async () => {
    const confirmedReservation = createTestReservation({ status: 'confirmed' });
    const cancelledReservation = createTestReservation({ status: 'cancelled' });

    vi.mocked(mockRepository.findById).mockResolvedValue(confirmedReservation);
    vi.mocked(mockRepository.cancel).mockResolvedValue(cancelledReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se reserva já está cancelada', async () => {
    const cancelledReservation = createTestReservation({ status: 'cancelled' });
    vi.mocked(mockRepository.findById).mockResolvedValue(cancelledReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('cancelada');
    }
  });

  it('deve retornar erro se reserva está concluída', async () => {
    const completedReservation = createTestReservation({ status: 'completed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(completedReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('concluída');
    }
  });
});

describe('MarkReservationSeatedUseCase', () => {
  let useCase: MarkReservationSeatedUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new MarkReservationSeatedUseCase(mockRepository);
  });

  it('deve marcar reserva como sentada (check-in)', async () => {
    const confirmedReservation = createTestReservation({ status: 'confirmed' });
    const seatedReservation = createTestReservation({
      status: 'completed',
      sessionId: 'session-123',
      seatedAt: new Date(),
    });

    vi.mocked(mockRepository.findById).mockResolvedValue(confirmedReservation);
    vi.mocked(mockRepository.markAsSeated).mockResolvedValue(seatedReservation);

    const result = await useCase.execute('reservation-1', 'session-123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe('session-123');
    }
    expect(mockRepository.markAsSeated).toHaveBeenCalledWith('reservation-1', 'session-123');
  });

  it('deve permitir check-in de reserva pendente', async () => {
    const pendingReservation = createTestReservation({ status: 'pending' });
    const seatedReservation = createTestReservation({ status: 'completed', sessionId: 'session-123' });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingReservation);
    vi.mocked(mockRepository.markAsSeated).mockResolvedValue(seatedReservation);

    const result = await useCase.execute('reservation-1', 'session-123');

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent', 'session-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se reserva está cancelada', async () => {
    const cancelledReservation = createTestReservation({ status: 'cancelled' });
    vi.mocked(mockRepository.findById).mockResolvedValue(cancelledReservation);

    const result = await useCase.execute('reservation-1', 'session-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('cancelada');
    }
  });

  it('deve retornar erro se reserva já foi concluída', async () => {
    const completedReservation = createTestReservation({ status: 'completed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(completedReservation);

    const result = await useCase.execute('reservation-1', 'session-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('concluída');
    }
  });
});

describe('MarkReservationNoShowUseCase', () => {
  let useCase: MarkReservationNoShowUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new MarkReservationNoShowUseCase(mockRepository);
  });

  it('deve marcar reserva como no-show', async () => {
    const confirmedReservation = createTestReservation({ status: 'confirmed' });
    const noShowReservation = createTestReservation({ status: 'no_show' });

    vi.mocked(mockRepository.findById).mockResolvedValue(confirmedReservation);
    vi.mocked(mockRepository.markAsNoShow).mockResolvedValue(noShowReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('no_show');
    }
    expect(mockRepository.markAsNoShow).toHaveBeenCalledWith('reservation-1');
  });

  it('deve marcar reserva pendente como no-show', async () => {
    const pendingReservation = createTestReservation({ status: 'pending' });
    const noShowReservation = createTestReservation({ status: 'no_show' });

    vi.mocked(mockRepository.findById).mockResolvedValue(pendingReservation);
    vi.mocked(mockRepository.markAsNoShow).mockResolvedValue(noShowReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(true);
  });

  it('deve retornar erro se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se reserva está cancelada', async () => {
    const cancelledReservation = createTestReservation({ status: 'cancelled' });
    vi.mocked(mockRepository.findById).mockResolvedValue(cancelledReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(false);
  });

  it('deve retornar erro se reserva já foi concluída', async () => {
    const completedReservation = createTestReservation({ status: 'completed' });
    vi.mocked(mockRepository.findById).mockResolvedValue(completedReservation);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(false);
  });
});

describe('DeleteReservationUseCase', () => {
  let useCase: DeleteReservationUseCase;
  let mockRepository: IReservationRepository;

  beforeEach(() => {
    mockRepository = createMockReservationRepository();
    useCase = new DeleteReservationUseCase(mockRepository);
  });

  it('deve eliminar reserva existente', async () => {
    const existingReservation = createTestReservation();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingReservation);
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith('reservation-1');
  });

  it('deve retornar erro se reserva não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('deve retornar erro se repositório falhar', async () => {
    const existingReservation = createTestReservation();
    vi.mocked(mockRepository.findById).mockResolvedValue(existingReservation);
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute('reservation-1');

    expect(result.success).toBe(false);
  });
});
