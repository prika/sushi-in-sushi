import { describe, it, expect } from 'vitest';
import { SessionService } from '@/domain/services/SessionService';
import { Session } from '@/domain/entities/Session';
import { Table } from '@/domain/entities/Table';
import { Order } from '@/domain/entities/Order';
import { SessionStatus } from '@/domain/value-objects/SessionStatus';

// Helper para criar uma sessão de teste
function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    tableId: 'table-1',
    status: 'active',
    isRodizio: false,
    numPeople: 4,
    totalAmount: 0,
    orderingMode: 'client',
    startedAt: new Date('2024-01-01T12:00:00Z'),
    closedAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

// Helper para criar uma mesa de teste
function createTestTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 'table-1',
    number: 1,
    name: 'Mesa 1',
    location: 'circunvalacao',
    status: 'available',
    isActive: true,
    currentSessionId: null,
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
    status: 'pending',
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

describe('SessionService', () => {
  describe('canStartSession', () => {
    it('deve permitir iniciar sessão em mesa disponível', () => {
      const table = createTestTable({ status: 'available', isActive: true });
      const result = SessionService.canStartSession(table);

      expect(result.isValid).toBe(true);
    });

    it('deve permitir iniciar sessão em mesa reservada', () => {
      const table = createTestTable({ status: 'reserved', isActive: true });
      const result = SessionService.canStartSession(table);

      expect(result.isValid).toBe(true);
    });

    it('não deve permitir iniciar sessão em mesa ocupada', () => {
      const table = createTestTable({ status: 'occupied' });
      const result = SessionService.canStartSession(table);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ocupada');
    });

    it('não deve permitir iniciar sessão em mesa inativa', () => {
      const table = createTestTable({ isActive: false });
      const result = SessionService.canStartSession(table);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('inativa');
    });

    it('não deve permitir iniciar sessão se mesa já tem sessão ativa', () => {
      const table = createTestTable({ currentSessionId: 'session-existing' });
      const result = SessionService.canStartSession(table);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('sessão ativa');
    });
  });

  describe('canCloseSession', () => {
    it('deve permitir fechar sessão sem pedidos pendentes', () => {
      const session = createTestSession({ status: 'active' });
      const orders = [
        createTestOrder({ sessionId: 'session-1', status: 'delivered' }),
        createTestOrder({ sessionId: 'session-1', status: 'delivered' }),
      ];

      const result = SessionService.canCloseSession(session, orders);

      expect(result.isValid).toBe(true);
    });

    it('não deve permitir fechar sessão com pedidos pendentes', () => {
      const session = createTestSession({ status: 'active' });
      const orders = [
        createTestOrder({ sessionId: 'session-1', status: 'pending' }),
        createTestOrder({ sessionId: 'session-1', status: 'delivered' }),
      ];

      const result = SessionService.canCloseSession(session, orders);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('pendente');
    });

    it('não deve permitir fechar sessão com pedidos a preparar', () => {
      const session = createTestSession({ status: 'active' });
      const orders = [
        createTestOrder({ sessionId: 'session-1', status: 'preparing' }),
      ];

      const result = SessionService.canCloseSession(session, orders);

      expect(result.isValid).toBe(false);
    });

    it('não deve permitir fechar sessão já fechada', () => {
      const session = createTestSession({ status: 'closed' });
      const orders: Order[] = [];

      const result = SessionService.canCloseSession(session, orders);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('fechada');
    });

    it('deve ignorar pedidos de outras sessões', () => {
      const session = createTestSession({ id: 'session-1', status: 'active' });
      const orders = [
        createTestOrder({ sessionId: 'session-1', status: 'delivered' }),
        createTestOrder({ sessionId: 'session-2', status: 'pending' }), // outra sessão
      ];

      const result = SessionService.canCloseSession(session, orders);

      expect(result.isValid).toBe(true);
    });
  });

  describe('canChangeStatus', () => {
    it('deve permitir transição de active para pending_payment', () => {
      const session = createTestSession({ status: 'active' });
      const result = SessionService.canChangeStatus(session, 'pending_payment');

      expect(result.isValid).toBe(true);
    });

    it('deve permitir transição de pending_payment para paid', () => {
      const session = createTestSession({ status: 'pending_payment' });
      const result = SessionService.canChangeStatus(session, 'paid');

      expect(result.isValid).toBe(true);
    });

    it('deve permitir transição de paid para closed', () => {
      const session = createTestSession({ status: 'paid' });
      const result = SessionService.canChangeStatus(session, 'closed');

      expect(result.isValid).toBe(true);
    });

    it('não deve permitir transição para o mesmo estado', () => {
      const session = createTestSession({ status: 'active' });
      const result = SessionService.canChangeStatus(session, 'active');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Sessão já está neste estado');
    });

    it('não deve permitir transição inválida', () => {
      const session = createTestSession({ status: 'active' });
      const result = SessionService.canChangeStatus(session, 'paid'); // saltar pending_payment

      expect(result.isValid).toBe(false);
    });
  });

  describe('isActive', () => {
    it('deve retornar true para sessão active', () => {
      const session = createTestSession({ status: 'active' });
      expect(SessionService.isActive(session)).toBe(true);
    });

    it('deve retornar true para sessão pending_payment', () => {
      const session = createTestSession({ status: 'pending_payment' });
      expect(SessionService.isActive(session)).toBe(true);
    });

    it('deve retornar false para sessão paid', () => {
      const session = createTestSession({ status: 'paid' });
      expect(SessionService.isActive(session)).toBe(false);
    });

    it('deve retornar false para sessão closed', () => {
      const session = createTestSession({ status: 'closed' });
      expect(SessionService.isActive(session)).toBe(false);
    });
  });

  describe('isClosed', () => {
    it('deve retornar true para sessão closed', () => {
      const session = createTestSession({ status: 'closed' });
      expect(SessionService.isClosed(session)).toBe(true);
    });

    it('deve retornar false para outros estados', () => {
      const statuses: SessionStatus[] = ['active', 'pending_payment', 'paid'];

      statuses.forEach((status) => {
        const session = createTestSession({ status });
        expect(SessionService.isClosed(session)).toBe(false);
      });
    });
  });

  describe('getDuration', () => {
    it('deve calcular duração de sessão ativa', () => {
      const session = createTestSession({
        startedAt: new Date('2024-01-01T12:00:00Z'),
        closedAt: null,
      });
      const now = new Date('2024-01-01T13:30:00Z'); // 1h30 depois

      expect(SessionService.getDuration(session, now)).toBe(90); // 90 minutos
    });

    it('deve calcular duração de sessão fechada', () => {
      const session = createTestSession({
        startedAt: new Date('2024-01-01T12:00:00Z'),
        closedAt: new Date('2024-01-01T14:00:00Z'), // 2h depois
      });
      const now = new Date('2024-01-01T18:00:00Z'); // hora atual não importa

      expect(SessionService.getDuration(session, now)).toBe(120); // 120 minutos
    });
  });

  describe('formatDuration', () => {
    it('deve formatar duração em minutos', () => {
      const session = createTestSession({
        startedAt: new Date('2024-01-01T12:00:00Z'),
      });
      const now = new Date('2024-01-01T12:45:00Z'); // 45 min

      expect(SessionService.formatDuration(session, now)).toBe('45min');
    });

    it('deve formatar duração com horas', () => {
      const session = createTestSession({
        startedAt: new Date('2024-01-01T12:00:00Z'),
      });
      const now = new Date('2024-01-01T14:30:00Z'); // 2h30

      expect(SessionService.formatDuration(session, now)).toBe('2h 30min');
    });
  });

  describe('calculateTotal', () => {
    it('deve calcular total de pedidos', () => {
      const orders = [
        createTestOrder({ quantity: 2, unitPrice: 10.0 }), // 20
        createTestOrder({ quantity: 1, unitPrice: 15.0 }), // 15
      ];

      expect(SessionService.calculateTotal(orders)).toBe(35.0);
    });

    it('deve excluir pedidos cancelados', () => {
      const orders = [
        createTestOrder({ quantity: 2, unitPrice: 10.0, status: 'delivered' }), // 20
        createTestOrder({ quantity: 1, unitPrice: 15.0, status: 'cancelled' }), // excluído
      ];

      expect(SessionService.calculateTotal(orders)).toBe(20.0);
    });
  });

  describe('calculatePerPerson', () => {
    it('deve calcular valor por pessoa', () => {
      const session = createTestSession({ numPeople: 4 });
      expect(SessionService.calculatePerPerson(session, 100.0)).toBe(25.0);
    });

    it('deve arredondar para cima', () => {
      const session = createTestSession({ numPeople: 3 });
      expect(SessionService.calculatePerPerson(session, 100.0)).toBe(34); // ceil(33.33)
    });

    it('deve retornar total se numPeople é 0', () => {
      const session = createTestSession({ numPeople: 0 });
      expect(SessionService.calculatePerPerson(session, 100.0)).toBe(100.0);
    });
  });

  describe('validateCreateData', () => {
    it('deve validar dados corretos', () => {
      const result = SessionService.validateCreateData({
        numPeople: 4,
        isRodizio: true,
      });

      expect(result.isValid).toBe(true);
    });

    it('deve rejeitar numPeople 0', () => {
      const result = SessionService.validateCreateData({
        numPeople: 0,
        isRodizio: false,
      });

      expect(result.isValid).toBe(false);
    });

    it('deve rejeitar numPeople acima de 50', () => {
      const result = SessionService.validateCreateData({
        numPeople: 51,
        isRodizio: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('máximo');
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas da sessão', () => {
      const session = createTestSession({
        id: 'session-1',
        numPeople: 2,
        startedAt: new Date('2024-01-01T12:00:00Z'),
      });
      const orders = [
        createTestOrder({ sessionId: 'session-1', quantity: 2, unitPrice: 10.0, status: 'delivered' }), // 20
        createTestOrder({ sessionId: 'session-1', quantity: 1, unitPrice: 15.0, status: 'pending' }), // 15
      ];
      const _now = new Date('2024-01-01T12:30:00Z');

      const stats = SessionService.getStats(session, orders);

      expect(stats.total).toBe(35.0);
      expect(stats.perPerson).toBe(18); // ceil(35/2)
      expect(stats.orderCount).toBe(2);
      expect(stats.pendingCount).toBe(1); // 1 pending
    });
  });

  describe('canClientOrder', () => {
    it('deve permitir pedidos quando sessão está ativa e modo é client', () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'client',
      });

      const result = SessionService.canClientOrder(session);

      expect(result.isValid).toBe(true);
    });

    it('deve bloquear pedidos quando modo é waiter_only', () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'waiter_only',
      });

      const result = SessionService.canClientOrder(session);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Apenas o empregado pode fazer pedidos nesta sessão');
    });

    it('deve bloquear pedidos quando sessão não está ativa (paid)', () => {
      const session = createTestSession({
        status: 'paid',
        orderingMode: 'client',
      });

      const result = SessionService.canClientOrder(session);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Sessão não está ativa');
    });

    it('deve bloquear pedidos quando sessão está fechada', () => {
      const session = createTestSession({
        status: 'closed',
        orderingMode: 'client',
      });

      const result = SessionService.canClientOrder(session);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Sessão não está ativa');
    });
  });

  describe('canChangeOrderingMode', () => {
    it('deve permitir mudar de client para waiter_only', () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'client',
      });

      const result = SessionService.canChangeOrderingMode(session, 'waiter_only');

      expect(result.isValid).toBe(true);
    });

    it('deve permitir mudar de waiter_only para client', () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'waiter_only',
      });

      const result = SessionService.canChangeOrderingMode(session, 'client');

      expect(result.isValid).toBe(true);
    });

    it('deve bloquear mudança quando sessão está fechada', () => {
      const session = createTestSession({
        status: 'closed',
        orderingMode: 'client',
      });

      const result = SessionService.canChangeOrderingMode(session, 'waiter_only');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Não pode alterar sessão fechada');
    });

    it('deve bloquear mudança quando já está no modo pretendido', () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'client',
      });

      const result = SessionService.canChangeOrderingMode(session, 'client');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Já está neste modo');
    });

    it('deve permitir mudança em sessão pending_payment', () => {
      const session = createTestSession({
        status: 'pending_payment',
        orderingMode: 'client',
      });

      const result = SessionService.canChangeOrderingMode(session, 'waiter_only');

      expect(result.isValid).toBe(true);
    });
  });
});
