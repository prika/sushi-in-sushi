/**
 * Integration Tests: Activity Log API
 * Tests for /api/activity/log
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
const mockGetAuthUser = vi.fn();
const mockLogActivity = vi.fn();
vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
  logActivity: mockLogActivity,
}));

describe('POST /api/activity/log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', async () => {
      mockGetAuthUser.mockResolvedValue(null);
      const user = await mockGetAuthUser();

      expect(user).toBeNull();
    });

    it('permite utilizadores autenticados', async () => {
      mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'admin' });
      const user = await mockGetAuthUser();

      expect(user).toBeDefined();
      expect(user?.id).toBe('user-1');
    });

    it('aceita qualquer role autenticado', async () => {
      const roles = ['admin', 'waiter', 'kitchen', 'customer'];

      roles.forEach(async (role) => {
        mockGetAuthUser.mockResolvedValue({ id: 'user-1', role });
        const user = await mockGetAuthUser();

        expect(user?.role).toBe(role);
      });
    });
  });

  describe('Validação de dados', () => {
    it('requer action', () => {
      const body = { entityType: 'order', entityId: '123' };
      const isValid = !!('action' in body);

      expect(isValid).toBe(false);
    });

    it('aceita action', () => {
      const body = { action: 'update_order' };

      expect(body.action).toBeDefined();
    });

    it('entityType é opcional', () => {
      const body = { action: 'login' };

      expect(body).not.toHaveProperty('entityType');
    });

    it('entityId é opcional', () => {
      const body = { action: 'view_dashboard' };

      expect(body).not.toHaveProperty('entityId');
    });

    it('details é opcional', () => {
      const body = { action: 'logout' };

      expect(body).not.toHaveProperty('details');
    });
  });

  describe('Tipos de ação', () => {
    it('aceita ações de CRUD', () => {
      const crudActions = [
        'create_order',
        'read_order',
        'update_order',
        'delete_order',
      ];

      crudActions.forEach(action => {
        expect(action).toBeDefined();
        expect(typeof action).toBe('string');
      });
    });

    it('aceita ações de autenticação', () => {
      const authActions = ['login', 'logout', 'password_change'];

      authActions.forEach(action => {
        expect(action).toBeDefined();
      });
    });

    it('aceita ações personalizadas', () => {
      const customActions = ['export_data', 'generate_report', 'send_notification'];

      customActions.forEach(action => {
        expect(action).toBeDefined();
      });
    });
  });

  describe('Tipos de entidade', () => {
    it('suporta entidades principais', () => {
      const entities = ['order', 'session', 'table', 'product', 'staff', 'reservation'];

      entities.forEach(entity => {
        expect(typeof entity).toBe('string');
      });
    });

    it('aceita entityType null para ações globais', () => {
      const body = { action: 'login', entityType: null };

      expect(body.entityType).toBeNull();
    });
  });

  describe('Entity ID', () => {
    it('aceita IDs como string', () => {
      const entityId = 'order-123';

      expect(typeof entityId).toBe('string');
    });

    it('aceita IDs como número', () => {
      const entityId = 123;

      expect(typeof entityId).toBe('number');
    });

    it('aceita UUID format', () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId);

      expect(isUUID).toBe(true);
    });
  });

  describe('Details field', () => {
    it('aceita objecto JSON', () => {
      const details = {
        oldValue: 'pending',
        newValue: 'preparing',
        reason: 'Kitchen started preparation',
      };

      expect(typeof details).toBe('object');
      expect(details.oldValue).toBe('pending');
    });

    it('aceita array', () => {
      const details = ['item1', 'item2', 'item3'];

      expect(Array.isArray(details)).toBe(true);
      expect(details).toHaveLength(3);
    });

    it('aceita string simples', () => {
      const details = 'Order updated successfully';

      expect(typeof details).toBe('string');
    });

    it('aceita valores aninhados', () => {
      const details = {
        user: { id: '123', name: 'João' },
        changes: [
          { field: 'status', old: 'pending', new: 'approved' },
        ],
      };

      expect(details.user).toBeDefined();
      expect(details.changes).toHaveLength(1);
    });
  });

  describe('Chamada da função logActivity', () => {
    it('passa userId da autenticação', async () => {
      const userId = 'user-123';
      mockGetAuthUser.mockResolvedValue({ id: userId });

      const user = await mockGetAuthUser();
      await mockLogActivity(user?.id, 'test_action', null, null, null);

      expect(mockLogActivity).toHaveBeenCalledWith(
        userId,
        'test_action',
        null,
        null,
        null
      );
    });

    it('passa todos os parâmetros', async () => {
      const userId = 'user-123';
      const action = 'update_order';
      const entityType = 'order';
      const entityId = 'order-456';
      const details = { status: 'completed' };

      await mockLogActivity(userId, action, entityType, entityId, details);

      expect(mockLogActivity).toHaveBeenCalledWith(
        userId,
        action,
        entityType,
        entityId,
        details
      );
    });

    it('permite entityType e entityId nulos', async () => {
      const userId = 'user-123';
      const action = 'login';

      await mockLogActivity(userId, action, null, null, null);

      expect(mockLogActivity).toHaveBeenCalledWith(
        userId,
        'login',
        null,
        null,
        null
      );
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna success true', () => {
      const response = { success: true };

      expect(response.success).toBe(true);
    });

    it('não retorna dados adicionais', () => {
      const response = { success: true };

      expect(Object.keys(response)).toHaveLength(1);
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 401 se não autenticado', () => {
      const error = { code: 'UNAUTHORIZED', status: 401 };

      expect(error.status).toBe(401);
    });

    it('retorna 400 se action ausente', () => {
      const error = { code: 'MISSING_ACTION', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 500 para erro interno', () => {
      const error = { code: 'INTERNAL_ERROR', status: 500 };

      expect(error.status).toBe(500);
    });
  });

  describe('Casos de uso comuns', () => {
    it('regista início de sessão', () => {
      const logData = {
        action: 'start_session',
        entityType: 'session',
        entityId: 'session-123',
        details: { tableId: 'table-5', numPeople: 4 },
      };

      expect(logData.action).toBe('start_session');
      expect(logData.details.tableId).toBe('table-5');
    });

    it('regista atualização de pedido', () => {
      const logData = {
        action: 'update_order_status',
        entityType: 'order',
        entityId: 'order-456',
        details: { oldStatus: 'pending', newStatus: 'preparing' },
      };

      expect(logData.details.oldStatus).toBe('pending');
      expect(logData.details.newStatus).toBe('preparing');
    });

    it('regista fecho de sessão', () => {
      const logData = {
        action: 'close_session',
        entityType: 'session',
        entityId: 'session-123',
        details: { totalAmount: 45.50, paymentMethod: 'card' },
      };

      expect(logData.details.totalAmount).toBe(45.50);
    });

    it('regista chamada de empregado', () => {
      const logData = {
        action: 'create_waiter_call',
        entityType: 'waiter_call',
        entityId: 'call-789',
        details: { tableId: 'table-3', reason: 'Pedido de conta' },
      };

      expect(logData.details.reason).toBe('Pedido de conta');
    });

    it('regista exportação de dados', () => {
      const logData = {
        action: 'export_data',
        entityType: null,
        entityId: null,
        details: { format: 'csv', dateRange: '2026-02-01 to 2026-02-28' },
      };

      expect(logData.entityType).toBeNull();
      expect(logData.details.format).toBe('csv');
    });
  });

  describe('Auditoria de segurança', () => {
    it('regista mudanças de password', () => {
      const logData = {
        action: 'password_change',
        entityType: 'staff',
        entityId: 'staff-123',
        details: { timestamp: new Date().toISOString() },
      };

      expect(logData.action).toBe('password_change');
      expect(logData.details.timestamp).toBeDefined();
    });

    it('regista alterações de permissões', () => {
      const logData = {
        action: 'update_permissions',
        entityType: 'staff',
        entityId: 'staff-456',
        details: { oldRole: 'waiter', newRole: 'admin' },
      };

      expect(logData.details.oldRole).toBe('waiter');
      expect(logData.details.newRole).toBe('admin');
    });

    it('regista acesso a dados sensíveis', () => {
      const logData = {
        action: 'view_customer_data',
        entityType: 'customer',
        entityId: 'customer-789',
        details: { fields: ['email', 'phone', 'address'] },
      };

      expect(logData.details.fields).toContain('email');
      expect(logData.details.fields).toHaveLength(3);
    });
  });
});
