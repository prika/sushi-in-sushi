import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAllTablesUseCase } from '@/application/use-cases/tables/GetAllTablesUseCase';
import { GetTableByIdUseCase } from '@/application/use-cases/tables/GetTableByIdUseCase';
import { UpdateTableStatusUseCase } from '@/application/use-cases/tables/UpdateTableStatusUseCase';
import { GetWaiterTablesUseCase } from '@/application/use-cases/tables/GetWaiterTablesUseCase';
import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { Table, TableFullStatus, TableWithSession } from '@/domain/entities/Table';

// Helper para criar uma mesa de teste
function createTestTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 'table-1',
    number: 5,
    name: 'Mesa 5',
    location: 'circunvalacao',
    status: 'available',
    isActive: true,
    currentSessionId: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestTableFullStatus(overrides: Partial<TableFullStatus> = {}): TableFullStatus {
  return {
    ...createTestTable(overrides),
    waiter: null,
    activeSession: null,
    ...overrides,
  };
}

function createTestTableWithSession(overrides: Partial<TableWithSession> = {}): TableWithSession {
  return {
    ...createTestTable(overrides),
    activeSession: null,
    ...overrides,
  };
}

// Mock do repositório
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

describe('GetAllTablesUseCase', () => {
  let useCase: GetAllTablesUseCase;
  let mockRepository: ITableRepository;

  beforeEach(() => {
    mockRepository = createMockTableRepository();
    useCase = new GetAllTablesUseCase(mockRepository);
  });

  it('deve retornar todas as mesas com estatísticas', async () => {
    const tables = [
      createTestTableFullStatus({ id: 'table-1', status: 'available' }),
      createTestTableFullStatus({ id: 'table-2', status: 'occupied' }),
      createTestTableFullStatus({ id: 'table-3', status: 'reserved' }),
    ];
    vi.mocked(mockRepository.findAllFullStatus).mockResolvedValue(tables);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tables).toHaveLength(3);
      expect(result.data.byStatus.available).toHaveLength(1);
      expect(result.data.byStatus.occupied).toHaveLength(1);
      expect(result.data.byStatus.reserved).toHaveLength(1);
      expect(result.data.statistics.total).toBe(3);
    }
  });

  it('deve agrupar mesas por localização', async () => {
    const tables = [
      createTestTableFullStatus({ id: 'table-1', location: 'circunvalacao' }),
      createTestTableFullStatus({ id: 'table-2', location: 'boavista' }),
      createTestTableFullStatus({ id: 'table-3', location: 'circunvalacao' }),
    ];
    vi.mocked(mockRepository.findAllFullStatus).mockResolvedValue(tables);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.byLocation.circunvalacao).toHaveLength(2);
      expect(result.data.byLocation.boavista).toHaveLength(1);
    }
  });

  it('deve aplicar filtros', async () => {
    const filter = { location: 'boavista' as const, status: 'available' as const };
    vi.mocked(mockRepository.findAllFullStatus).mockResolvedValue([]);

    await useCase.execute(filter);

    expect(mockRepository.findAllFullStatus).toHaveBeenCalledWith(filter);
  });

  it('deve calcular duração de sessões ativas', async () => {
    const startedAt = new Date(Date.now() - 30 * 60000); // 30 minutos atrás
    const tables = [
      createTestTableFullStatus({
        id: 'table-1',
        status: 'occupied',
        activeSession: {
          id: 'session-1',
          isRodizio: true,
          numPeople: 4,
          startedAt,
          totalAmount: 120,
          pendingOrdersCount: 2,
        },
      }),
    ];
    vi.mocked(mockRepository.findAllFullStatus).mockResolvedValue(tables);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tables[0].activeSession?.durationMinutes).toBeGreaterThanOrEqual(29);
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findAllFullStatus).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
  });
});

describe('GetTableByIdUseCase', () => {
  let useCase: GetTableByIdUseCase;
  let mockRepository: ITableRepository;

  beforeEach(() => {
    mockRepository = createMockTableRepository();
    useCase = new GetTableByIdUseCase(mockRepository);
  });

  it('deve retornar mesa por ID', async () => {
    const table = createTestTableFullStatus({ id: 'table-1', number: 5 });
    vi.mocked(mockRepository.findByIdFullStatus).mockResolvedValue(table);

    const result = await useCase.execute({ tableId: 'table-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('table-1');
      expect(result.data.number).toBe(5);
      expect(result.data.statusLabel).toBeDefined();
      expect(result.data.statusColor).toBeDefined();
    }
  });

  it('deve retornar erro se ID não fornecido', async () => {
    const result = await useCase.execute({ tableId: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve retornar erro se mesa não existe', async () => {
    vi.mocked(mockRepository.findByIdFullStatus).mockResolvedValue(null);

    const result = await useCase.execute({ tableId: 'non-existent' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve incluir informações de sessão ativa', async () => {
    const startedAt = new Date(Date.now() - 45 * 60000);
    const table = createTestTableFullStatus({
      id: 'table-1',
      status: 'occupied',
      activeSession: {
        id: 'session-1',
        isRodizio: true,
        numPeople: 6,
        startedAt,
        totalAmount: 250,
        pendingOrdersCount: 3,
      },
    });
    vi.mocked(mockRepository.findByIdFullStatus).mockResolvedValue(table);

    const result = await useCase.execute({ tableId: 'table-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activeSession).not.toBeNull();
      expect(result.data.activeSession?.isRodizio).toBe(true);
      expect(result.data.activeSession?.numPeople).toBe(6);
    }
  });

  it('deve incluir informações do empregado', async () => {
    const table = createTestTableFullStatus({
      id: 'table-1',
      waiter: { id: 'waiter-1', name: 'João Silva' },
    });
    vi.mocked(mockRepository.findByIdFullStatus).mockResolvedValue(table);

    const result = await useCase.execute({ tableId: 'table-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.waiter?.name).toBe('João Silva');
    }
  });
});

describe('UpdateTableStatusUseCase', () => {
  let useCase: UpdateTableStatusUseCase;
  let mockRepository: ITableRepository;

  beforeEach(() => {
    mockRepository = createMockTableRepository();
    useCase = new UpdateTableStatusUseCase(mockRepository);
  });

  it('deve atualizar status da mesa', async () => {
    const table = createTestTable({ status: 'available' });
    const updatedTable = createTestTable({ status: 'reserved' });

    vi.mocked(mockRepository.findById).mockResolvedValue(table);
    vi.mocked(mockRepository.updateStatus).mockResolvedValue(updatedTable);

    const result = await useCase.execute({ tableId: 'table-1', newStatus: 'reserved' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.previousStatus).toBe('available');
      expect(result.data.newStatus).toBe('reserved');
    }
  });

  it('deve retornar erro se ID não fornecido', async () => {
    const result = await useCase.execute({ tableId: '', newStatus: 'reserved' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve retornar erro se status não fornecido', async () => {
    const result = await useCase.execute({ tableId: 'table-1', newStatus: '' as any });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve retornar erro se mesa não existe', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const result = await useCase.execute({ tableId: 'non-existent', newStatus: 'reserved' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('não encontrada');
    }
  });

  it('deve retornar erro se transição de status inválida', async () => {
    // Mesa ocupada com sessão ativa não pode mudar para disponível
    const occupiedTable = createTestTable({ status: 'occupied', currentSessionId: 'session-1' });
    vi.mocked(mockRepository.findById).mockResolvedValue(occupiedTable);

    const result = await useCase.execute({ tableId: 'table-1', newStatus: 'available' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('sessão ativa');
    }
  });

  it('deve permitir marcar mesa disponível como inativa', async () => {
    const availableTable = createTestTable({ status: 'available' });
    const inactiveTable = createTestTable({ status: 'inactive' });

    vi.mocked(mockRepository.findById).mockResolvedValue(availableTable);
    vi.mocked(mockRepository.updateStatus).mockResolvedValue(inactiveTable);

    const result = await useCase.execute({ tableId: 'table-1', newStatus: 'inactive' });

    expect(result.success).toBe(true);
  });
});

describe('GetWaiterTablesUseCase', () => {
  let useCase: GetWaiterTablesUseCase;
  let mockRepository: ITableRepository;

  beforeEach(() => {
    mockRepository = createMockTableRepository();
    useCase = new GetWaiterTablesUseCase(mockRepository);
  });

  it('deve retornar mesas do empregado', async () => {
    const tables = [
      createTestTableWithSession({ id: 'table-1', status: 'occupied' }),
      createTestTableWithSession({ id: 'table-2', status: 'available' }),
      createTestTableWithSession({ id: 'table-3', status: 'reserved' }),
    ];
    vi.mocked(mockRepository.findByWaiter).mockResolvedValue(tables);

    const result = await useCase.execute({ waiterId: 'waiter-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tables).toHaveLength(3);
      expect(result.data.counts.total).toBe(3);
      expect(result.data.counts.occupied).toBe(1);
      expect(result.data.counts.available).toBe(1);
      expect(result.data.counts.reserved).toBe(1);
    }
  });

  it('deve retornar erro se ID do empregado não fornecido', async () => {
    const result = await useCase.execute({ waiterId: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatório');
    }
  });

  it('deve calcular total de faturação', async () => {
    const tables = [
      createTestTableWithSession({
        id: 'table-1',
        status: 'occupied',
        activeSession: {
          id: 'session-1',
          isRodizio: true,
          numPeople: 4,
          startedAt: new Date(),
          totalAmount: 100,
        },
      }),
      createTestTableWithSession({
        id: 'table-2',
        status: 'occupied',
        activeSession: {
          id: 'session-2',
          isRodizio: false,
          numPeople: 2,
          startedAt: new Date(),
          totalAmount: 75,
        },
      }),
      createTestTableWithSession({ id: 'table-3', status: 'available' }),
    ];
    vi.mocked(mockRepository.findByWaiter).mockResolvedValue(tables);

    const result = await useCase.execute({ waiterId: 'waiter-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalRevenue).toBe(175);
    }
  });

  it('deve retornar lista vazia se empregado não tem mesas', async () => {
    vi.mocked(mockRepository.findByWaiter).mockResolvedValue([]);

    const result = await useCase.execute({ waiterId: 'waiter-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tables).toHaveLength(0);
      expect(result.data.counts.total).toBe(0);
      expect(result.data.totalRevenue).toBe(0);
    }
  });

  it('deve calcular duração de sessões', async () => {
    const startedAt = new Date(Date.now() - 60 * 60000); // 1 hora atrás
    const tables = [
      createTestTableWithSession({
        id: 'table-1',
        status: 'occupied',
        activeSession: {
          id: 'session-1',
          isRodizio: true,
          numPeople: 4,
          startedAt,
          totalAmount: 150,
        },
      }),
    ];
    vi.mocked(mockRepository.findByWaiter).mockResolvedValue(tables);

    const result = await useCase.execute({ waiterId: 'waiter-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tables[0].activeSession?.durationMinutes).toBeGreaterThanOrEqual(59);
    }
  });

  it('deve retornar erro se repositório falhar', async () => {
    vi.mocked(mockRepository.findByWaiter).mockRejectedValue(new Error('DB Error'));

    const result = await useCase.execute({ waiterId: 'waiter-1' });

    expect(result.success).toBe(false);
  });
});
