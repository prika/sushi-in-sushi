import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoAssignWaiterUseCase } from '@/application/use-cases/sessions/AutoAssignWaiterUseCase';
import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Restaurant } from '@/domain/entities/Restaurant';
import { StaffWithRole } from '@/domain/entities/Staff';
import { Table } from '@/domain/entities/Table';

function createMockStaffRepository(): IStaffRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAllRoles: vi.fn(),
    assignTables: vi.fn(),
    getAssignedTables: vi.fn().mockResolvedValue([]),
    addTableAssignment: vi.fn(),
  };
}

function createMockTableRepository(): ITableRepository {
  return {
    findById: vi.fn(),
    findByNumber: vi.fn(),
    findByIdWithWaiter: vi.fn(),
    findByIdWithSession: vi.fn(),
    findByIdFullStatus: vi.fn(),
    findAll: vi.fn(),
    findAllFullStatus: vi.fn(),
    findByWaiter: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countByStatus: vi.fn(),
  };
}

function createMockRestaurantRepository(): IRestaurantRepository {
  return {
    findAll: vi.fn(),
    findActive: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    validateSlugUnique: vi.fn(),
  };
}

function createTestRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'rest-1',
    name: 'Circunvalação',
    slug: 'circunvalacao',
    address: 'Rua Test',
    description: null,
    addressLocality: 'Porto',
    addressCountry: 'PT',
    googleMapsUrl: null,
    phone: null,
    opensAt: '12:00',
    closesAt: '23:00',
    latitude: null,
    longitude: null,
    maxCapacity: 50,
    defaultPeoplePerTable: 4,
    autoTableAssignment: true,
    autoReservations: false,
    orderCooldownMinutes: 0,
    showUpgradeAfterOrder: false,
    showUpgradeAtBill: false,
    gamesEnabled: false,
    gamesMode: 'selection',
    gamesPrizeType: 'none',
    gamesPrizeValue: null,
    gamesPrizeProductId: null,
    gamesMinRoundsForPrize: 3,
    gamesQuestionsPerRound: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestWaiter(id: string, name: string): StaffWithRole {
  return {
    id,
    email: `${name.toLowerCase()}@test.com`,
    name,
    authUserId: null,
    roleId: 3,
    location: 'circunvalacao',
    phone: null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date(),
    role: { id: 3, name: 'waiter', description: 'Waiter' },
  };
}

function createTestTable(id: string, status: string = 'available'): Table {
  return {
    id,
    number: 1,
    name: 'Mesa 1',
    location: 'circunvalacao',
    status: status as Table['status'],
    isActive: true,
    currentSessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AutoAssignWaiterUseCase', () => {
  let useCase: AutoAssignWaiterUseCase;
  let mockStaffRepo: IStaffRepository;
  let mockTableRepo: ITableRepository;
  let mockRestaurantRepo: IRestaurantRepository;

  beforeEach(() => {
    mockStaffRepo = createMockStaffRepository();
    mockTableRepo = createMockTableRepository();
    mockRestaurantRepo = createMockRestaurantRepository();
    useCase = new AutoAssignWaiterUseCase(mockStaffRepo, mockTableRepo, mockRestaurantRepo);
  });

  it('deve retornar assigned=false se restaurante não encontrado', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(null);

    const result = await useCase.execute({ tableId: 't1', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(false);
    }
    expect(mockStaffRepo.addTableAssignment).not.toHaveBeenCalled();
  });

  it('deve retornar assigned=false se autoTableAssignment está desligado', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ autoTableAssignment: false })
    );

    const result = await useCase.execute({ tableId: 't1', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(false);
    }
  });

  it('deve retornar assigned=false se não há waiters na localização', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(createTestRestaurant());
    vi.mocked(mockStaffRepo.findAll).mockResolvedValue([]);

    const result = await useCase.execute({ tableId: 't1', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(false);
    }
  });

  it('deve filtrar apenas staff com role waiter', async () => {
    const kitchen = { ...createTestWaiter('k1', 'Chef'), roleId: 2, role: { id: 2, name: 'kitchen' as const, description: 'Kitchen' } };
    const waiter = createTestWaiter('w1', 'Alice');

    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(createTestRestaurant());
    vi.mocked(mockStaffRepo.findAll).mockResolvedValue([kitchen, waiter]);
    vi.mocked(mockStaffRepo.getAssignedTables).mockResolvedValue([]);

    const result = await useCase.execute({ tableId: 't1', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(true);
      expect(result.data.waiterId).toBe('w1');
    }
  });

  it('deve atribuir ao waiter com menos mesas ocupadas', async () => {
    const alice = createTestWaiter('w1', 'Alice');
    const bob = createTestWaiter('w2', 'Bob');

    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(createTestRestaurant());
    vi.mocked(mockStaffRepo.findAll).mockResolvedValue([alice, bob]);

    // Alice tem 2 mesas atribuídas, ambas ocupadas
    vi.mocked(mockStaffRepo.getAssignedTables)
      .mockResolvedValueOnce(['t-a1', 't-a2']) // Alice
      .mockResolvedValueOnce(['t-b1']);          // Bob

    vi.mocked(mockTableRepo.findById)
      .mockResolvedValueOnce(createTestTable('t-a1', 'occupied'))
      .mockResolvedValueOnce(createTestTable('t-a2', 'occupied'))
      .mockResolvedValueOnce(createTestTable('t-b1', 'available')); // Bob's table is available

    const result = await useCase.execute({ tableId: 't-new', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(true);
      expect(result.data.waiterId).toBe('w2'); // Bob tem 0 occupied
      expect(result.data.waiterName).toBe('Bob');
    }
    expect(mockStaffRepo.addTableAssignment).toHaveBeenCalledWith('w2', 't-new');
  });

  it('deve contar apenas mesas occupied, não todas as atribuídas', async () => {
    const alice = createTestWaiter('w1', 'Alice');

    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(createTestRestaurant());
    vi.mocked(mockStaffRepo.findAll).mockResolvedValue([alice]);
    vi.mocked(mockStaffRepo.getAssignedTables).mockResolvedValue(['t1', 't2', 't3']);

    // Apenas 1 de 3 está occupied
    vi.mocked(mockTableRepo.findById)
      .mockResolvedValueOnce(createTestTable('t1', 'occupied'))
      .mockResolvedValueOnce(createTestTable('t2', 'available'))
      .mockResolvedValueOnce(createTestTable('t3', 'available'));

    const result = await useCase.execute({ tableId: 't-new', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(true);
    }
  });

  it('deve retornar assigned=false em caso de erro (nunca bloqueia)', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({ tableId: 't1', location: 'circunvalacao' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigned).toBe(false);
    }
  });
});
