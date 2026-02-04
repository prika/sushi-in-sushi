import { describe, it, expect } from 'vitest';
import { OrderService } from '@/domain/services/OrderService';
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

describe('OrderService', () => {
  describe('canChangeStatus', () => {
    it('deve permitir transição de pending para preparing', () => {
      const order = createTestOrder({ status: 'pending' });
      const result = OrderService.canChangeStatus(order, 'preparing');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve permitir transição de preparing para ready', () => {
      const order = createTestOrder({ status: 'preparing' });
      const result = OrderService.canChangeStatus(order, 'ready');

      expect(result.isValid).toBe(true);
    });

    it('deve permitir transição de ready para delivered', () => {
      const order = createTestOrder({ status: 'ready' });
      const result = OrderService.canChangeStatus(order, 'delivered');

      expect(result.isValid).toBe(true);
    });

    it('não deve permitir transição de pending para delivered (saltar estados)', () => {
      const order = createTestOrder({ status: 'pending' });
      const result = OrderService.canChangeStatus(order, 'delivered');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Não é possível mudar');
    });

    it('não deve permitir transição para o mesmo estado', () => {
      const order = createTestOrder({ status: 'pending' });
      const result = OrderService.canChangeStatus(order, 'pending');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Pedido já está neste estado');
    });

    it('não deve permitir transição de delivered (estado final)', () => {
      const order = createTestOrder({ status: 'delivered' });
      const result = OrderService.canChangeStatus(order, 'pending');

      expect(result.isValid).toBe(false);
    });

    it('deve permitir cancelar pedido em qualquer estado ativo', () => {
      const statuses: OrderStatus[] = ['pending', 'preparing', 'ready'];

      statuses.forEach((status) => {
        const order = createTestOrder({ status });
        const result = OrderService.canChangeStatus(order, 'cancelled');

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('getNextStatus', () => {
    it('deve retornar preparing para pedido pending', () => {
      const order = createTestOrder({ status: 'pending' });
      expect(OrderService.getNextStatus(order)).toBe('preparing');
    });

    it('deve retornar ready para pedido preparing', () => {
      const order = createTestOrder({ status: 'preparing' });
      expect(OrderService.getNextStatus(order)).toBe('ready');
    });

    it('deve retornar delivered para pedido ready', () => {
      const order = createTestOrder({ status: 'ready' });
      expect(OrderService.getNextStatus(order)).toBe('delivered');
    });

    it('deve retornar null para pedido delivered (final)', () => {
      const order = createTestOrder({ status: 'delivered' });
      expect(OrderService.getNextStatus(order)).toBeNull();
    });

    it('deve retornar null para pedido cancelled (final)', () => {
      const order = createTestOrder({ status: 'cancelled' });
      expect(OrderService.getNextStatus(order)).toBeNull();
    });
  });

  describe('isFinal', () => {
    it('deve retornar true para delivered', () => {
      const order = createTestOrder({ status: 'delivered' });
      expect(OrderService.isFinal(order)).toBe(true);
    });

    it('deve retornar true para cancelled', () => {
      const order = createTestOrder({ status: 'cancelled' });
      expect(OrderService.isFinal(order)).toBe(true);
    });

    it('deve retornar false para estados ativos', () => {
      const activeStatuses: OrderStatus[] = ['pending', 'preparing', 'ready'];

      activeStatuses.forEach((status) => {
        const order = createTestOrder({ status });
        expect(OrderService.isFinal(order)).toBe(false);
      });
    });
  });

  describe('isActive', () => {
    it('deve retornar true para estados ativos', () => {
      const activeStatuses: OrderStatus[] = ['pending', 'preparing', 'ready'];

      activeStatuses.forEach((status) => {
        const order = createTestOrder({ status });
        expect(OrderService.isActive(order)).toBe(true);
      });
    });

    it('deve retornar false para estados finais', () => {
      const finalStatuses: OrderStatus[] = ['delivered', 'cancelled'];

      finalStatuses.forEach((status) => {
        const order = createTestOrder({ status });
        expect(OrderService.isActive(order)).toBe(false);
      });
    });
  });

  describe('calculateOrderTotal', () => {
    it('deve calcular o total corretamente', () => {
      const order = createTestOrder({ quantity: 3, unitPrice: 15.0 });
      expect(OrderService.calculateOrderTotal(order)).toBe(45.0);
    });

    it('deve lidar com decimais', () => {
      const order = createTestOrder({ quantity: 2, unitPrice: 12.5 });
      expect(OrderService.calculateOrderTotal(order)).toBe(25.0);
    });
  });

  describe('calculateTotal', () => {
    it('deve calcular o total de múltiplos pedidos', () => {
      const orders = [
        createTestOrder({ quantity: 2, unitPrice: 10.0 }), // 20
        createTestOrder({ quantity: 1, unitPrice: 15.0 }), // 15
        createTestOrder({ quantity: 3, unitPrice: 5.0 }), // 15
      ];

      expect(OrderService.calculateTotal(orders)).toBe(50.0);
    });

    it('deve excluir pedidos cancelados do total', () => {
      const orders = [
        createTestOrder({ quantity: 2, unitPrice: 10.0, status: 'pending' }), // 20
        createTestOrder({ quantity: 1, unitPrice: 15.0, status: 'cancelled' }), // excluído
        createTestOrder({ quantity: 3, unitPrice: 5.0, status: 'delivered' }), // 15
      ];

      expect(OrderService.calculateTotal(orders)).toBe(35.0);
    });

    it('deve retornar 0 para lista vazia', () => {
      expect(OrderService.calculateTotal([])).toBe(0);
    });
  });

  describe('groupByStatus', () => {
    it('deve agrupar pedidos por status', () => {
      const orders = [
        createTestOrder({ id: '1', status: 'pending' }),
        createTestOrder({ id: '2', status: 'pending' }),
        createTestOrder({ id: '3', status: 'preparing' }),
        createTestOrder({ id: '4', status: 'ready' }),
        createTestOrder({ id: '5', status: 'delivered' }),
      ];

      const grouped = OrderService.groupByStatus(orders);

      expect(grouped.pending).toHaveLength(2);
      expect(grouped.preparing).toHaveLength(1);
      expect(grouped.ready).toHaveLength(1);
      expect(grouped.delivered).toHaveLength(1);
      expect(grouped.cancelled).toHaveLength(0);
    });
  });

  describe('getTimeElapsed', () => {
    it('deve calcular o tempo decorrido em minutos', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:15:00Z'); // 15 minutos depois

      const order = createTestOrder({ createdAt });
      expect(OrderService.getTimeElapsed(order, now)).toBe(15);
    });

    it('deve retornar 0 para pedido acabado de criar', () => {
      const now = new Date();
      const order = createTestOrder({ createdAt: now });
      expect(OrderService.getTimeElapsed(order, now)).toBe(0);
    });
  });

  describe('isLate', () => {
    it('deve retornar true para pedido com mais de 10 minutos', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:15:00Z'); // 15 minutos depois

      const order = createTestOrder({ createdAt });
      expect(OrderService.isLate(order, 10, now)).toBe(true);
    });

    it('deve retornar false para pedido recente', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:05:00Z'); // 5 minutos depois

      const order = createTestOrder({ createdAt });
      expect(OrderService.isLate(order, 10, now)).toBe(false);
    });

    it('deve usar threshold customizado', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:06:00Z'); // 6 minutos depois

      const order = createTestOrder({ createdAt });
      expect(OrderService.isLate(order, 5, now)).toBe(true); // threshold 5 min
      expect(OrderService.isLate(order, 10, now)).toBe(false); // threshold 10 min
    });
  });

  describe('getUrgencyColor', () => {
    it('deve retornar green para pedido recente (<= 5 min)', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:03:00Z');

      const order = createTestOrder({ createdAt });
      expect(OrderService.getUrgencyColor(order, now)).toBe('green');
    });

    it('deve retornar yellow para pedido médio (5-10 min)', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:08:00Z');

      const order = createTestOrder({ createdAt });
      expect(OrderService.getUrgencyColor(order, now)).toBe('yellow');
    });

    it('deve retornar red para pedido atrasado (> 10 min)', () => {
      const createdAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:15:00Z');

      const order = createTestOrder({ createdAt });
      expect(OrderService.getUrgencyColor(order, now)).toBe('red');
    });
  });

  describe('countByStatus', () => {
    it('deve contar pedidos por status', () => {
      const orders = [
        createTestOrder({ status: 'pending' }),
        createTestOrder({ status: 'pending' }),
        createTestOrder({ status: 'preparing' }),
        createTestOrder({ status: 'ready' }),
        createTestOrder({ status: 'cancelled' }),
      ];

      const counts = OrderService.countByStatus(orders);

      expect(counts.pending).toBe(2);
      expect(counts.preparing).toBe(1);
      expect(counts.ready).toBe(1);
      expect(counts.delivered).toBe(0);
      expect(counts.cancelled).toBe(1);
    });
  });

  describe('validateCreateData', () => {
    it('deve validar dados corretos', () => {
      const result = OrderService.validateCreateData({
        quantity: 2,
        unitPrice: 10.0,
      });

      expect(result.isValid).toBe(true);
    });

    it('deve rejeitar quantidade 0', () => {
      const result = OrderService.validateCreateData({
        quantity: 0,
        unitPrice: 10.0,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Quantidade');
    });

    it('deve rejeitar quantidade negativa', () => {
      const result = OrderService.validateCreateData({
        quantity: -1,
        unitPrice: 10.0,
      });

      expect(result.isValid).toBe(false);
    });

    it('deve rejeitar quantidade acima de 99', () => {
      const result = OrderService.validateCreateData({
        quantity: 100,
        unitPrice: 10.0,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('máxima');
    });

    it('deve rejeitar preço negativo', () => {
      const result = OrderService.validateCreateData({
        quantity: 2,
        unitPrice: -5.0,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Preço');
    });
  });

  describe('fluxo completo da cozinha - transições não devem reverter', () => {
    it('não deve permitir reverter de preparing para pending', () => {
      const order = createTestOrder({ status: 'preparing' });
      const result = OrderService.canChangeStatus(order, 'pending');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Não é possível mudar');
    });

    it('não deve permitir reverter de ready para preparing', () => {
      const order = createTestOrder({ status: 'ready' });
      const result = OrderService.canChangeStatus(order, 'preparing');

      expect(result.isValid).toBe(false);
    });

    it('não deve permitir reverter de ready para pending', () => {
      const order = createTestOrder({ status: 'ready' });
      const result = OrderService.canChangeStatus(order, 'pending');

      expect(result.isValid).toBe(false);
    });

    it('não deve permitir reverter de delivered para qualquer estado', () => {
      const order = createTestOrder({ status: 'delivered' });
      const previousStatuses: OrderStatus[] = ['pending', 'preparing', 'ready'];

      previousStatuses.forEach((status) => {
        const result = OrderService.canChangeStatus(order, status);
        expect(result.isValid).toBe(false);
      });
    });

    it('fluxo completo: pending -> preparing -> ready -> delivered', () => {
      // Estado inicial: pending
      let order = createTestOrder({ status: 'pending' });

      // Transição 1: pending -> preparing
      expect(OrderService.canChangeStatus(order, 'preparing').isValid).toBe(true);
      expect(OrderService.getNextStatus(order)).toBe('preparing');
      order = { ...order, status: 'preparing' };

      // Transição 2: preparing -> ready
      expect(OrderService.canChangeStatus(order, 'ready').isValid).toBe(true);
      expect(OrderService.getNextStatus(order)).toBe('ready');
      order = { ...order, status: 'ready' };

      // Transição 3: ready -> delivered
      expect(OrderService.canChangeStatus(order, 'delivered').isValid).toBe(true);
      expect(OrderService.getNextStatus(order)).toBe('delivered');
      order = { ...order, status: 'delivered' };

      // Estado final: não há próximo status
      expect(OrderService.getNextStatus(order)).toBeNull();
      expect(OrderService.isFinal(order)).toBe(true);
    });

    it('sortByUrgency deve ordenar por tempo de criação (mais antigo primeiro)', () => {
      const orders = [
        createTestOrder({ id: '1', createdAt: new Date('2024-01-01T12:10:00Z') }),
        createTestOrder({ id: '2', createdAt: new Date('2024-01-01T12:00:00Z') }),
        createTestOrder({ id: '3', createdAt: new Date('2024-01-01T12:05:00Z') }),
      ];

      const sorted = OrderService.sortByUrgency(orders);

      expect(sorted[0].id).toBe('2'); // mais antigo
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1'); // mais recente
    });

    it('filterActive deve retornar apenas pedidos não finalizados', () => {
      const orders = [
        createTestOrder({ id: '1', status: 'pending' }),
        createTestOrder({ id: '2', status: 'preparing' }),
        createTestOrder({ id: '3', status: 'ready' }),
        createTestOrder({ id: '4', status: 'delivered' }),
        createTestOrder({ id: '5', status: 'cancelled' }),
      ];

      const active = OrderService.filterActive(orders);

      expect(active).toHaveLength(3);
      expect(active.map(o => o.id)).toEqual(['1', '2', '3']);
    });
  });
});
