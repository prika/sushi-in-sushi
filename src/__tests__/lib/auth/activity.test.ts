import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import {
  logActivity,
  logStaffActivity,
  logSessionActivity,
  logOrderActivity,
  logTableActivity,
  logReservationActivity,
  logProductActivity,
  logExportActivity,
  logAuthActivity,
  getStaffActivityLogRow,
  getEntityActivityLog,
  getRecentActivityLog,
} from '@/lib/auth/activity';

describe('Activity Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  describe('logActivity', () => {
    it('deve inserir log com options object', async () => {
      await logActivity({
        staffId: 'staff-1',
        action: 'login',
        entityType: 'staff',
        entityId: 'staff-1',
        details: { browser: 'Chrome' },
        ipAddress: '192.168.1.1',
      });

      expect(mockFrom).toHaveBeenCalledWith('activity_log');
      expect(mockInsert).toHaveBeenCalledWith({
        staff_id: 'staff-1',
        action: 'login',
        entity_type: 'staff',
        entity_id: 'staff-1',
        details: { browser: 'Chrome' },
        ip_address: '192.168.1.1',
      });
    });

    it('deve inserir log com legacy signature', async () => {
      await logActivity('staff-1', 'order_created', 'order', 'order-1', { items: 3 });

      expect(mockInsert).toHaveBeenCalledWith({
        staff_id: 'staff-1',
        action: 'order_created',
        entity_type: 'order',
        entity_id: 'order-1',
        details: { items: 3 },
      });
    });

    it('deve lidar com campos opcionais null', async () => {
      await logActivity({ action: 'login' });

      expect(mockInsert).toHaveBeenCalledWith({
        staff_id: null,
        action: 'login',
        entity_type: null,
        entity_id: null,
        details: null,
        ip_address: null,
      });
    });

    it('nao deve lancar erro quando insert falha', async () => {
      mockInsert.mockRejectedValue(new Error('DB error'));
      await expect(logActivity({ action: 'login' })).resolves.not.toThrow();
    });
  });

  describe('logStaffActivity', () => {
    it('deve logar accao de staff', async () => {
      await logStaffActivity('admin-1', 'created', 'staff-2', { name: 'New Staff' });
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'staff_created',
        entity_type: 'staff',
        entity_id: 'staff-2',
      }));
    });
  });

  describe('logSessionActivity', () => {
    it('deve logar accao de sessao', async () => {
      await logSessionActivity('staff-1', 'started', 'session-1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'session_started',
        entity_type: 'session',
        entity_id: 'session-1',
      }));
    });

    it('deve aceitar staffId undefined', async () => {
      await logSessionActivity(undefined, 'closed', 'session-1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        staff_id: null,
      }));
    });
  });

  describe('logOrderActivity', () => {
    it('deve logar accao de pedido', async () => {
      await logOrderActivity('staff-1', 'status_changed', 'order-1', { from: 'pending', to: 'preparing' });
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'order_status_changed',
        entity_type: 'order',
      }));
    });
  });

  describe('logTableActivity', () => {
    it('deve logar accao de mesa', async () => {
      await logTableActivity('staff-1', 'created', 'table-1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'table_created',
        entity_type: 'table',
      }));
    });
  });

  describe('logReservationActivity', () => {
    it('deve logar accao de reserva', async () => {
      await logReservationActivity('staff-1', 'confirmed', 'res-1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'reservation_confirmed',
        entity_type: 'reservation',
      }));
    });
  });

  describe('logProductActivity', () => {
    it('deve logar accao de produto', async () => {
      await logProductActivity('staff-1', 'updated', 'prod-1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'product_updated',
        entity_type: 'product',
      }));
    });
  });

  describe('logExportActivity', () => {
    it('deve logar exportacao com tipo', async () => {
      await logExportActivity('staff-1', 'csv', { rows: 100 });
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'data_exported',
        entity_type: 'export',
        details: { exportType: 'csv', rows: 100 },
      }));
    });
  });

  describe('logAuthActivity', () => {
    it('deve logar evento de auth com IP', async () => {
      await logAuthActivity('staff-1', 'login', { browser: 'Firefox' }, '10.0.0.1');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'login',
        ip_address: '10.0.0.1',
      }));
    });
  });
});

describe('Activity Queries', () => {
  const mockLogs = [
    { id: '1', action: 'login', created_at: '2026-01-01' },
    { id: '2', action: 'order_created', created_at: '2026-01-02' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStaffActivityLogRow', () => {
    it('deve retornar logs de staff', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: mockLogs, error: null }).then(fn),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getStaffActivityLogRow('staff-1');
      expect(result).toEqual(mockLogs);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'fail' } }).then(fn),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getStaffActivityLogRow('staff-1');
      expect(result).toEqual([]);
    });
  });

  describe('getEntityActivityLog', () => {
    it('deve retornar logs de entidade', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: mockLogs, error: null }).then(fn),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getEntityActivityLog('order', 'order-1');
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getRecentActivityLog', () => {
    it('deve retornar logs recentes', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: mockLogs, error: null }).then(fn),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getRecentActivityLog(50);
      expect(result).toEqual(mockLogs);
    });

    it('deve aplicar filtros', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn),
      };
      mockFrom.mockReturnValue(chain);

      await getRecentActivityLog(50, {
        action: 'login',
        entityType: 'staff',
        staffId: 'staff-1',
        since: new Date('2026-01-01'),
      });

      expect(chain.eq).toHaveBeenCalledTimes(3); // action, entity_type, staff_id
      expect(chain.gte).toHaveBeenCalledTimes(1); // since
    });
  });
});
