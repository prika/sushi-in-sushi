import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloseSessionUseCase } from '@/application/use-cases/sessions/CloseSessionUseCase';
import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { Session } from '@/domain/entities/Session';
import { Order } from '@/domain/entities/Order';
import { Table } from '@/domain/entities/Table';

// Helper para criar uma sessão de teste
function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    tableId: 'table-1',
    status: 'active',
    isRodizio: false,
    numPeople: 2,
    totalAmount: 0,
    orderingMode: 'client',
    startedAt: new Date('2024-01-01T12:00:00Z'),
    closedAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Helper para criar um pedido de teste
function createTestOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    sessionId: 'session-1',
    productId: 'product-1',
    quantity: 2,
    unitPrice: 10.5,
    notes: null,
    status: 'delivered',
    sessionCustomerId: null,
    preparedBy: null,
    preparingStartedAt: null,
    readyAt: null,
    deliveredAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Mock dos repositórios
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

function createMockOrderRepository(): IOrderRepository {
  return {
    findById: vi.fn(),
    findByIdWithProduct: vi.fn(),
    findAll: vi.fn(),
    findBySession: vi.fn(),
    findForKitchen: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countByStatus: vi.fn(),
    getAveragePreparationTime: vi.fn(),
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

describe('CloseSessionUseCase', () => {
  let useCase: CloseSessionUseCase;
  let mockSessionRepository: ISessionRepository;
  let mockOrderRepository: IOrderRepository;
  let mockTableRepository: ITableRepository;

  beforeEach(() => {
    mockSessionRepository = createMockSessionRepository();
    mockOrderRepository = createMockOrderRepository();
    mockTableRepository = createMockTableRepository();
    useCase = new CloseSessionUseCase(
      mockSessionRepository,
      mockOrderRepository,
      mockTableRepository
    );
  });

  describe('execute', () => {
    it('deve fechar sessão sem pedidos pendentes', async () => {
      const session = createTestSession({ status: 'paid' });
      const orders = [
        createTestOrder({ status: 'delivered' }),
        createTestOrder({ id: 'order-2', status: 'delivered' }),
      ];
      const closedSession = { ...session, status: 'closed' as const, closedAt: new Date() };

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockOrderRepository.findAll).mockResolvedValue(orders);
      vi.mocked(mockSessionRepository.calculateTotal).mockResolvedValue(42);
      vi.mocked(mockSessionRepository.update).mockResolvedValue(closedSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({} as Table);

      const result = await useCase.execute({ sessionId: 'session-1' });

      expect(result.success).toBe(true);
      expect(mockSessionRepository.update).toHaveBeenCalledWith('session-1', expect.objectContaining({
        status: 'closed',
        totalAmount: 42,
      }));
      expect(mockTableRepository.update).toHaveBeenCalledWith('table-1', {
        status: 'available',
        currentSessionId: null,
      });
    });

    it('deve retornar erro se sessão não existe', async () => {
      vi.mocked(mockSessionRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({ sessionId: 'non-existent' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('SESSION_NOT_FOUND');
      }
    });

    it('deve retornar erro se sessão já está fechada', async () => {
      const session = createTestSession({ status: 'closed' });
      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);

      const result = await useCase.execute({ sessionId: 'session-1' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ALREADY_CLOSED');
      }
    });

    it('deve retornar erro se há pedidos pendentes', async () => {
      const session = createTestSession({ status: 'active' });
      const orders = [
        createTestOrder({ status: 'pending' }), // Pedido pendente
        createTestOrder({ id: 'order-2', status: 'delivered' }),
      ];

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockOrderRepository.findAll).mockResolvedValue(orders);

      const result = await useCase.execute({ sessionId: 'session-1' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PENDING_ORDERS');
        expect(result.error).toContain('pendente');
      }
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });

    it('deve retornar erro se há pedidos em preparação', async () => {
      const session = createTestSession({ status: 'active' });
      const orders = [
        createTestOrder({ status: 'preparing' }), // Pedido em preparação
      ];

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockOrderRepository.findAll).mockResolvedValue(orders);

      const result = await useCase.execute({ sessionId: 'session-1' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PENDING_ORDERS');
      }
    });

    it('deve permitir fechar sessão com pedidos cancelados', async () => {
      const session = createTestSession({ status: 'paid' });
      const orders = [
        createTestOrder({ status: 'cancelled' }),
        createTestOrder({ id: 'order-2', status: 'delivered' }),
      ];
      const closedSession = { ...session, status: 'closed' as const, closedAt: new Date() };

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockOrderRepository.findAll).mockResolvedValue(orders);
      vi.mocked(mockSessionRepository.calculateTotal).mockResolvedValue(21);
      vi.mocked(mockSessionRepository.update).mockResolvedValue(closedSession);
      vi.mocked(mockTableRepository.update).mockResolvedValue({} as Table);

      const result = await useCase.execute({ sessionId: 'session-1' });

      expect(result.success).toBe(true);
    });
  });
});
