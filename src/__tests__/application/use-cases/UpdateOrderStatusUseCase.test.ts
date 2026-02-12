import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateOrderStatusUseCase } from '@/application/use-cases/orders/UpdateOrderStatusUseCase';
import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { Order } from '@/domain/entities/Order';
import { OrderStatus } from '@/domain/value-objects/OrderStatus';

// Helper para criar um pedido de teste
function createTestOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    sessionId: 'session-1',
    productId: 'product-1',
    quantity: 2,
    unitPrice: 10.5,
    notes: null,
    status: 'pending',
    sessionCustomerId: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Mock do repositório
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
  };
}

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;
  let mockRepository: IOrderRepository;

  beforeEach(() => {
    mockRepository = createMockOrderRepository();
    useCase = new UpdateOrderStatusUseCase(mockRepository);
  });

  describe('execute', () => {
    it('deve atualizar status de pending para preparing', async () => {
      const order = createTestOrder({ status: 'pending' });
      const updatedOrder = { ...order, status: 'preparing' as OrderStatus };

      vi.mocked(mockRepository.findById).mockResolvedValue(order);
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(updatedOrder);

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'preparing',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('preparing');
      }
      expect(mockRepository.updateStatus).toHaveBeenCalledWith('order-1', 'preparing', null);
    });

    it('deve retornar erro se pedido não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({
        orderId: 'non-existent',
        newStatus: 'preparing',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('não encontrado');
        expect(result.code).toBe('ORDER_NOT_FOUND');
      }
    });

    it('deve retornar erro para transição inválida', async () => {
      const order = createTestOrder({ status: 'pending' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'delivered', // transição inválida
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_TRANSITION');
      }
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('deve retornar erro para mesmo estado', async () => {
      const order = createTestOrder({ status: 'pending' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'pending',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_TRANSITION');
      }
    });

    it('deve lidar com erro do repositório', async () => {
      vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB Error'));

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'preparing',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('DB Error');
      }
    });
  });

  describe('advanceToNextStatus', () => {
    it('deve avançar de pending para preparing', async () => {
      const order = createTestOrder({ status: 'pending' });
      const updatedOrder = { ...order, status: 'preparing' as OrderStatus };

      vi.mocked(mockRepository.findById).mockResolvedValue(order);
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(updatedOrder);

      const result = await useCase.advanceToNextStatus('order-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('preparing');
      }
    });

    it('deve avançar de preparing para ready', async () => {
      const order = createTestOrder({ status: 'preparing' });
      const updatedOrder = { ...order, status: 'ready' as OrderStatus };

      vi.mocked(mockRepository.findById).mockResolvedValue(order);
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(updatedOrder);

      const result = await useCase.advanceToNextStatus('order-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('ready');
      }
    });

    it('deve retornar erro se já está no estado final', async () => {
      const order = createTestOrder({ status: 'delivered' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const result = await useCase.advanceToNextStatus('order-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ALREADY_FINAL');
      }
    });

    it('deve retornar erro se pedido não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await useCase.advanceToNextStatus('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ORDER_NOT_FOUND');
      }
    });
  });

  describe('proteção contra reversão de status', () => {
    it('não deve permitir reverter de preparing para pending', async () => {
      const order = createTestOrder({ status: 'preparing' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'pending',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_TRANSITION');
      }
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('não deve permitir reverter de ready para preparing', async () => {
      const order = createTestOrder({ status: 'ready' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'preparing',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_TRANSITION');
      }
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('não deve permitir reverter de ready para pending', async () => {
      const order = createTestOrder({ status: 'ready' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'pending',
      });

      expect(result.success).toBe(false);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('não deve permitir reverter de delivered para qualquer estado anterior', async () => {
      const order = createTestOrder({ status: 'delivered' });
      vi.mocked(mockRepository.findById).mockResolvedValue(order);

      const previousStatuses: OrderStatus[] = ['pending', 'preparing', 'ready'];

      for (const status of previousStatuses) {
        vi.mocked(mockRepository.updateStatus).mockClear();

        const result = await useCase.execute({
          orderId: 'order-1',
          newStatus: status,
        });

        expect(result.success).toBe(false);
        expect(mockRepository.updateStatus).not.toHaveBeenCalled();
      }
    });
  });

  describe('fluxo completo da cozinha', () => {
    it('deve permitir transição completa: pending -> preparing -> ready -> delivered', async () => {
      let currentOrder = createTestOrder({ status: 'pending' });

      // Configurar mock para simular progresso do pedido
      vi.mocked(mockRepository.findById).mockImplementation(async () => currentOrder);
      vi.mocked(mockRepository.updateStatus).mockImplementation(async (_id, status) => {
        currentOrder = { ...currentOrder, status };
        return currentOrder;
      });

      // Transição 1: pending -> preparing
      let result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'preparing',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('preparing');
      }

      // Transição 2: preparing -> ready
      result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'ready',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('ready');
      }

      // Transição 3: ready -> delivered
      result = await useCase.execute({
        orderId: 'order-1',
        newStatus: 'delivered',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('delivered');
      }

      // Verificar que updateStatus foi chamado 3 vezes
      expect(mockRepository.updateStatus).toHaveBeenCalledTimes(3);
    });

    it('deve permitir cancelar pedido em qualquer estado ativo', async () => {
      const activeStatuses: OrderStatus[] = ['pending', 'preparing', 'ready'];

      for (const status of activeStatuses) {
        const order = createTestOrder({ status });
        const cancelledOrder = { ...order, status: 'cancelled' as OrderStatus };

        vi.mocked(mockRepository.findById).mockResolvedValue(order);
        vi.mocked(mockRepository.updateStatus).mockResolvedValue(cancelledOrder);

        const result = await useCase.execute({
          orderId: 'order-1',
          newStatus: 'cancelled',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('cancelled');
        }
      }
    });
  });
});
