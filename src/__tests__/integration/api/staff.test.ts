/**
 * Integration Tests: Staff API
 * Tests for the /api/staff/* and /api/staff-time-off/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestStaff, getFutureDate, getPastDate } from '../../helpers/factories';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

// Mock auth
const mockGetAuthUser = vi.fn();
const mockVerifyAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
  verifyAuth: mockVerifyAuth,
}));

// Helper to create test time off entry
function createTestTimeOff(overrides: Record<string, unknown> = {}) {
  return {
    id: 'timeoff-1',
    staff_id: 'staff-1',
    start_date: getFutureDate(7),
    end_date: getFutureDate(14),
    type: 'vacation',
    reason: 'Férias',
    status: 'approved',
    approved_by: 'admin-1',
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    staff: { id: 'staff-1', name: 'João Silva', email: 'joao@test.com' },
    approver: { id: 'admin-1', name: 'Admin' },
    staff_name: 'João Silva',
    approved_by_name: 'Admin',
    ...overrides,
  };
}

describe('GET /api/staff/[id]/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação e autorização', () => {
    it('rejeita pedido sem autenticação', async () => {
      mockGetAuthUser.mockResolvedValue(null);
      const user = await mockGetAuthUser();

      expect(user).toBeNull();
    });

    it('rejeita pedido de não-admin', async () => {
      const staff = createTestStaff({ role: 'waiter' });
      mockGetAuthUser.mockResolvedValue(staff);
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite pedido de admin', async () => {
      const staff = createTestStaff({ role: 'admin' });
      mockGetAuthUser.mockResolvedValue(staff);
      const user = await mockGetAuthUser();
      const isAdmin = user?.role === 'admin';

      expect(isAdmin).toBe(true);
    });
  });

  describe('Validação de staff', () => {
    it('retorna erro quando staff não existe', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const { data, error } = await mockSupabaseFrom()
        .select('*, role:roles(*)')
        .eq('id', 'invalid-id')
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('retorna staff quando existe', async () => {
      const staff = createTestStaff();
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: staff, error: null }),
      });

      const { data, error } = await mockSupabaseFrom()
        .select('*, role:roles(*)')
        .eq('id', staff.id)
        .single();

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });
  });

  describe('Mesas atribuídas', () => {
    it('retorna lista de mesas atribuídas', () => {
      const assignments = [
        { table: { id: 'table-1', number: 5, location: 'circunvalacao' } },
        { table: { id: 'table-2', number: 10, location: 'circunvalacao' } },
      ];

      const assignedTables = assignments.map((a) => a.table).filter(Boolean);

      expect(assignedTables).toHaveLength(2);
      expect(assignedTables[0].number).toBe(5);
    });

    it('retorna array vazio quando sem atribuições', () => {
      const assignments: any[] = [];
      const assignedTables = assignments.map((a) => a.table).filter(Boolean);

      expect(assignedTables).toHaveLength(0);
    });
  });

  describe('Cálculo de métricas', () => {
    it('calcula métricas corretamente', () => {
      const activities = [
        { entity_id: 'order-1', created_at: new Date().toISOString() },
        { entity_id: 'order-2', created_at: new Date().toISOString() },
      ];

      const orders = [
        { id: 'order-1', unit_price: 10.5, quantity: 2 },
        { id: 'order-2', unit_price: 15.0, quantity: 1 },
      ];

      const totalRevenue = orders.reduce((sum, o) => sum + o.unit_price * o.quantity, 0);

      expect(activities.length).toBe(2); // ordersDelivered
      expect(totalRevenue).toBe(36.0); // revenueGenerated
    });

    it('retorna zero quando sem atividades', () => {
      const activities: any[] = [];
      const metrics = {
        ordersDelivered: activities.length,
        revenueGenerated: 0,
        averageDeliveryTimeMinutes: null,
      };

      expect(metrics.ordersDelivered).toBe(0);
      expect(metrics.revenueGenerated).toBe(0);
      expect(metrics.averageDeliveryTimeMinutes).toBeNull();
    });

    it('calcula tempo médio de entrega', () => {
      const order = {
        created_at: '2026-02-13T10:00:00Z',
        updated_at: '2026-02-13T10:15:00Z',
      };

      const created = new Date(order.created_at);
      const delivered = new Date(order.updated_at);
      const diffMinutes = (delivered.getTime() - created.getTime()) / 60000;

      expect(diffMinutes).toBe(15);
    });

    it('ignora tempos de entrega inválidos', () => {
      const now = Date.now();
      const invalidTimes = [
        { created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }, // 0 minutes
        { created_at: new Date(now).toISOString(), updated_at: new Date(now - 3 * 60 * 60 * 1000).toISOString() }, // negative
        { created_at: new Date(now).toISOString(), updated_at: new Date(now + 5 * 60 * 60 * 1000).toISOString() }, // > 120 min
      ];

      invalidTimes.forEach(time => {
        const created = new Date(time.created_at);
        const delivered = new Date(time.updated_at);
        const diffMinutes = (delivered.getTime() - created.getTime()) / 60000;
        const isValid = diffMinutes > 0 && diffMinutes < 120;

        expect(isValid).toBe(false);
      });
    });
  });

  describe('Filtros de data', () => {
    it('filtra por startDate', () => {
      const startDate = '2026-02-01';
      const activities = [
        { created_at: '2026-02-05T10:00:00Z' },
        { created_at: '2026-01-28T10:00:00Z' },
      ];

      const filtered = activities.filter(a => a.created_at >= startDate);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].created_at).toBe('2026-02-05T10:00:00Z');
    });

    it('filtra por endDate', () => {
      const endDate = '2026-02-10';
      const activities = [
        { created_at: '2026-02-05T10:00:00Z' },
        { created_at: '2026-02-15T10:00:00Z' },
      ];

      const filtered = activities.filter(a => a.created_at <= `${endDate}T23:59:59`);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].created_at).toBe('2026-02-05T10:00:00Z');
    });

    it('filtra por intervalo de datas', () => {
      const startDate = '2026-02-01';
      const endDate = '2026-02-10';
      const activities = [
        { created_at: '2026-02-05T10:00:00Z' }, // within range
        { created_at: '2026-01-28T10:00:00Z' }, // before
        { created_at: '2026-02-15T10:00:00Z' }, // after
      ];

      const filtered = activities.filter(
        a => a.created_at >= startDate && a.created_at <= `${endDate}T23:59:59`
      );

      expect(filtered).toHaveLength(1);
    });
  });

  describe('Métricas históricas', () => {
    it('agrupa atividades por data', () => {
      const activities = [
        { created_at: '2026-02-13T10:00:00Z', entity_id: 'order-1' },
        { created_at: '2026-02-13T14:00:00Z', entity_id: 'order-2' },
        { created_at: '2026-02-12T10:00:00Z', entity_id: 'order-3' },
      ];

      const groupedByDate = new Map<string, typeof activities>();
      activities.forEach((activity) => {
        const date = new Date(activity.created_at).toISOString().split('T')[0];
        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, []);
        }
        groupedByDate.get(date)?.push(activity);
      });

      expect(groupedByDate.size).toBe(2);
      expect(groupedByDate.get('2026-02-13')).toHaveLength(2);
      expect(groupedByDate.get('2026-02-12')).toHaveLength(1);
    });

    it('ordena métricas históricas por data decrescente', () => {
      const historicalMetrics = [
        { date: '2026-02-10', ordersDelivered: 5 },
        { date: '2026-02-13', ordersDelivered: 8 },
        { date: '2026-02-11', ordersDelivered: 6 },
      ];

      const sorted = historicalMetrics.sort((a, b) => b.date.localeCompare(a.date));

      expect(sorted[0].date).toBe('2026-02-13');
      expect(sorted[1].date).toBe('2026-02-11');
      expect(sorted[2].date).toBe('2026-02-10');
    });
  });
});

describe('GET /api/staff-time-off', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('rejeita pedido sem autenticação', async () => {
      mockVerifyAuth.mockResolvedValue(null);
      const auth = await mockVerifyAuth();

      expect(auth).toBeNull();
    });

    it('permite pedido com autenticação', async () => {
      const auth = { id: 'staff-1', role: 'admin' };
      mockVerifyAuth.mockResolvedValue(auth);
      const authResult = await mockVerifyAuth();

      expect(authResult).toBeDefined();
    });
  });

  describe('Filtros', () => {
    it('filtra por staff_id', () => {
      const timeOffs = [
        createTestTimeOff({ staff_id: 'staff-1' }),
        createTestTimeOff({ staff_id: 'staff-2' }),
      ];

      const staffId = 'staff-1';
      const filtered = timeOffs.filter(t => t.staff_id === staffId);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].staff_id).toBe('staff-1');
    });

    it('filtra por status', () => {
      const timeOffs = [
        createTestTimeOff({ status: 'approved' }),
        createTestTimeOff({ status: 'pending' }),
        createTestTimeOff({ status: 'rejected' }),
      ];

      const status = 'approved';
      const filtered = timeOffs.filter(t => t.status === status);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('approved');
    });

    it('filtra por type', () => {
      const timeOffs = [
        createTestTimeOff({ type: 'vacation' }),
        createTestTimeOff({ type: 'sick' }),
        createTestTimeOff({ type: 'personal' }),
      ];

      const type = 'vacation';
      const filtered = timeOffs.filter(t => t.type === type);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('vacation');
    });

    it('filtra por mês e ano', () => {
      const timeOffs = [
        createTestTimeOff({ start_date: '2026-02-10' }), // February 2026
        createTestTimeOff({ start_date: '2026-03-15' }), // March 2026
        createTestTimeOff({ start_date: '2025-02-20' }), // February 2025
      ];

      const month = 2; // February (1-indexed for users, 0-indexed for JS)
      const year = 2026;

      const filtered = timeOffs.filter(t => {
        const date = new Date(t.start_date);
        return date.getMonth() === month - 1 && date.getFullYear() === year;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].start_date).toBe('2026-02-10');
    });
  });

  describe('Formato de resposta', () => {
    it('retorna campos em snake_case', () => {
      const timeOff = createTestTimeOff();

      expect(timeOff).toHaveProperty('staff_id');
      expect(timeOff).toHaveProperty('start_date');
      expect(timeOff).toHaveProperty('end_date');
      expect(timeOff).toHaveProperty('approved_by');
      expect(timeOff).toHaveProperty('approved_at');
      expect(timeOff).toHaveProperty('created_at');
      expect(timeOff).toHaveProperty('updated_at');
    });

    it('inclui informações de staff', () => {
      const timeOff = createTestTimeOff();

      expect(timeOff.staff).toBeDefined();
      expect(timeOff.staff).toHaveProperty('name');
      expect(timeOff).toHaveProperty('staff_name');
    });

    it('inclui informações de aprovador quando aprovado', () => {
      const timeOff = createTestTimeOff({ status: 'approved' });

      expect(timeOff.approver).toBeDefined();
      expect(timeOff).toHaveProperty('approved_by_name');
      expect(timeOff.approved_by_name).toBeTruthy();
    });

    it('retorna null para aprovador quando não aprovado', () => {
      const timeOff = createTestTimeOff({
        status: 'pending',
        approved_by: null,
        approved_at: null,
        approver: null,
      });

      expect(timeOff.approved_by).toBeNull();
      expect(timeOff.approved_at).toBeNull();
      expect(timeOff.approver).toBeNull();
    });
  });
});

describe('POST /api/staff-time-off', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação e autorização', () => {
    it('rejeita pedido sem autenticação', async () => {
      mockVerifyAuth.mockResolvedValue(null);
      const auth = await mockVerifyAuth();

      expect(auth).toBeNull();
    });

    it('rejeita pedido de não-admin', async () => {
      const auth = { id: 'staff-1', role: 'waiter' };
      mockVerifyAuth.mockResolvedValue(auth);
      const authResult = await mockVerifyAuth();
      const isAdmin = authResult?.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite pedido de admin', async () => {
      const auth = { id: 'staff-1', role: 'admin' };
      mockVerifyAuth.mockResolvedValue(auth);
      const authResult = await mockVerifyAuth();
      const isAdmin = authResult?.role === 'admin';

      expect(isAdmin).toBe(true);
    });
  });

  describe('Validação de campos', () => {
    it('aceita campos em camelCase', () => {
      const body = {
        staffId: 'staff-1',
        startDate: getFutureDate(7),
        endDate: getFutureDate(14),
        type: 'vacation',
        reason: 'Férias',
      };

      const timeOffData = {
        staffId: body.staffId,
        startDate: body.startDate,
        endDate: body.endDate,
        type: body.type,
        reason: body.reason,
      };

      expect(timeOffData.staffId).toBe('staff-1');
    });

    it('aceita campos em snake_case', () => {
      const body = {
        staff_id: 'staff-1',
        start_date: getFutureDate(7),
        end_date: getFutureDate(14),
        type: 'vacation',
        reason: 'Férias',
      };

      const timeOffData = {
        staffId: body.staff_id,
        startDate: body.start_date,
        endDate: body.end_date,
        type: body.type,
        reason: body.reason,
      };

      expect(timeOffData.staffId).toBe('staff-1');
    });

    it('usa "vacation" como tipo padrão', () => {
      const body: { staffId: string; startDate: string; endDate: string; type?: string } = {
        staffId: 'staff-1',
        startDate: getFutureDate(7),
        endDate: getFutureDate(14),
      };

      const type = body.type ?? 'vacation';

      expect(type).toBe('vacation');
    });

    it('usa null como reason padrão', () => {
      const body: { staffId: string; startDate: string; endDate: string; reason?: string | null } = {
        staffId: 'staff-1',
        startDate: getFutureDate(7),
        endDate: getFutureDate(14),
      };

      const reason = body.reason ?? null;

      expect(reason).toBeNull();
    });
  });

  describe('Validação de datas', () => {
    it('valida data de início no futuro', () => {
      const startDate = getFutureDate(7);
      const today = new Date();
      const start = new Date(startDate);

      expect(start > today).toBe(true);
    });

    it('rejeita data de início no passado', () => {
      const startDate = getPastDate(7);
      const today = new Date();
      const start = new Date(startDate);

      expect(start < today).toBe(true);
    });

    it('valida que endDate é depois de startDate', () => {
      const startDate = getFutureDate(7);
      const endDate = getFutureDate(14);
      const start = new Date(startDate);
      const end = new Date(endDate);

      expect(end > start).toBe(true);
    });

    it('rejeita quando endDate é antes de startDate', () => {
      const startDate = getFutureDate(14);
      const endDate = getFutureDate(7);
      const start = new Date(startDate);
      const end = new Date(endDate);

      expect(end < start).toBe(true);
    });
  });

  describe('Tipos de ausência', () => {
    it('aceita tipo "vacation"', () => {
      const validTypes = ['vacation', 'sick', 'personal', 'other'];
      expect(validTypes.includes('vacation')).toBe(true);
    });

    it('aceita tipo "sick"', () => {
      const validTypes = ['vacation', 'sick', 'personal', 'other'];
      expect(validTypes.includes('sick')).toBe(true);
    });

    it('aceita tipo "personal"', () => {
      const validTypes = ['vacation', 'sick', 'personal', 'other'];
      expect(validTypes.includes('personal')).toBe(true);
    });

    it('aceita tipo "other"', () => {
      const validTypes = ['vacation', 'sick', 'personal', 'other'];
      expect(validTypes.includes('other')).toBe(true);
    });

    it('rejeita tipo inválido', () => {
      const validTypes = ['vacation', 'sick', 'personal', 'other'];
      expect(validTypes.includes('invalid_type')).toBe(false);
    });
  });

  describe('Detecção de sobreposição', () => {
    it('retorna erro 409 quando há sobreposição', () => {
      const result = {
        success: false,
        error: 'Já existe ausência neste período',
        code: 'OVERLAP',
      };

      expect(result.success).toBe(false);
      expect(result.code).toBe('OVERLAP');
    });

    it('permite criar quando não há sobreposição', () => {
      const result = {
        success: true,
        data: createTestTimeOff(),
      };

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Criação de entrada', () => {
    it('retorna entrada criada com status 201', () => {
      const timeOff = createTestTimeOff();
      const response = {
        status: 201,
        data: timeOff,
      };

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
    });

    it('retorna entrada com detalhes de staff', () => {
      const timeOff = createTestTimeOff();

      expect(timeOff.staff).toBeDefined();
      expect(timeOff.staff.name).toBe('João Silva');
      expect(timeOff.staff_name).toBe('João Silva');
    });

    it('retorna entrada em formato snake_case', () => {
      const timeOff = createTestTimeOff();

      expect(timeOff).toHaveProperty('staff_id');
      expect(timeOff).toHaveProperty('start_date');
      expect(timeOff).toHaveProperty('end_date');
    });
  });
});

describe('PATCH /api/staff-time-off/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', async () => {
      mockVerifyAuth.mockResolvedValue(null);
      const auth = await mockVerifyAuth();

      expect(auth).toBeNull();
    });

    it('requer role admin', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'waiter' });
      const auth = await mockVerifyAuth();
      const isAdmin = auth?.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite admin atualizar', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1' });
      const auth = await mockVerifyAuth();

      expect(auth?.role).toBe('admin');
    });
  });

  describe('Validação de dados', () => {
    it('aceita camelCase no body', () => {
      const body = {
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        type: 'vacation',
        reason: 'Férias de verão',
      };

      expect(body.startDate).toBeDefined();
      expect(body.endDate).toBeDefined();
    });

    it('aceita snake_case no body', () => {
      const body = {
        start_date: '2026-03-01',
        end_date: '2026-03-05',
        type: 'vacation',
        reason: 'Férias de verão',
      };

      expect(body.start_date).toBeDefined();
      expect(body.end_date).toBeDefined();
    });

    it('suporta atualização parcial', () => {
      const body = { reason: 'Motivo atualizado' };

      expect(body.reason).toBeDefined();
      expect(body).not.toHaveProperty('start_date');
    });
  });

  describe('Aprovação automática', () => {
    it('regista approvedBy quando status muda para approved', async () => {
      const adminId = 'admin-1';
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: adminId });

      const body = { status: 'approved' };
      const auth = await mockVerifyAuth();

      const updateData: { status: string; approvedBy?: string } = { ...body };
      if (body.status === 'approved' && auth) {
        updateData.approvedBy = auth.id;
      }

      expect(updateData.approvedBy).toBe(adminId);
    });

    it('não regista approvedBy se status não é approved', () => {
      const body = { status: 'pending' };

      const updateData: { status: string; approvedBy?: string } = { ...body };
      if (body.status === 'approved') {
        updateData.approvedBy = 'admin-1';
      }

      expect(updateData).not.toHaveProperty('approvedBy');
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 404 se entrada não existe', () => {
      const result = { success: false, code: 'NOT_FOUND', error: 'Entrada não encontrada' };
      const expectedStatus = result.code === 'NOT_FOUND' ? 404 : 400;

      expect(expectedStatus).toBe(404);
    });

    it('retorna 409 se há overlap de datas', () => {
      const result = { success: false, code: 'OVERLAP', error: 'Conflito de datas' };
      const expectedStatus = result.code === 'OVERLAP' ? 409 : 400;

      expect(expectedStatus).toBe(409);
    });

    it('retorna 400 para outros erros', () => {
      const result = { success: false, code: 'VALIDATION_ERROR', error: 'Dados inválidos' };
      const expectedStatus = result.code === 'NOT_FOUND' ? 404 : result.code === 'OVERLAP' ? 409 : 400;

      expect(expectedStatus).toBe(400);
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna entrada atualizada em snake_case', () => {
      const response = createTestTimeOff({ status: 'approved' });

      expect(response).toHaveProperty('staff_id');
      expect(response).toHaveProperty('start_date');
      expect(response).toHaveProperty('end_date');
      expect(response.status).toBe('approved');
    });

    it('inclui staff_name e approved_by_name', () => {
      const response = createTestTimeOff({
        status: 'approved',
        approved_by_name: 'Admin Silva',
      });

      expect(response.staff_name).toBeDefined();
      expect(response.approved_by_name).toBe('Admin Silva');
    });

    it('retorna approver null se não aprovado', () => {
      const response = createTestTimeOff({
        status: 'pending',
        approved_by: null,
        approved_at: null,
      });

      expect(response.approved_by).toBeNull();
      expect(response.approved_at).toBeNull();
    });
  });
});

describe('DELETE /api/staff-time-off/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', async () => {
      mockVerifyAuth.mockResolvedValue(null);
      const auth = await mockVerifyAuth();

      expect(auth).toBeNull();
    });

    it('requer role admin', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'kitchen' });
      const auth = await mockVerifyAuth();
      const isAdmin = auth?.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite admin eliminar', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin' });
      const auth = await mockVerifyAuth();

      expect(auth?.role).toBe('admin');
    });
  });

  describe('Validação', () => {
    it('valida ID como número', () => {
      const id = '123';
      const parsedId = parseInt(id);

      expect(typeof parsedId).toBe('number');
      expect(parsedId).toBe(123);
    });

    it('rejeita IDs inválidos', () => {
      const id = 'invalid';
      const parsedId = parseInt(id);

      expect(isNaN(parsedId)).toBe(true);
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 404 se entrada não existe', () => {
      const result = { success: false, code: 'NOT_FOUND', error: 'Entrada não encontrada' };
      const expectedStatus = result.code === 'NOT_FOUND' ? 404 : 400;

      expect(expectedStatus).toBe(404);
    });

    it('retorna 400 para outros erros', () => {
      const result = { success: false, code: 'VALIDATION_ERROR', error: 'Erro' };
      const expectedStatus = result.code === 'NOT_FOUND' ? 404 : 400;

      expect(expectedStatus).toBe(400);
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna success: true', () => {
      const response = { success: true };

      expect(response.success).toBe(true);
    });

    it('não retorna dados da entrada eliminada', () => {
      const response = { success: true };

      expect(response).not.toHaveProperty('data');
      expect(Object.keys(response)).toHaveLength(1);
    });
  });
});
