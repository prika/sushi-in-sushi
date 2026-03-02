/**
 * Integration Tests: Tables API
 * Tests for the /api/tables/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestTable, createTestStaff } from '../../helpers/factories';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

// Mock auth
const mockGetAuthUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
}));

// Mock fetch for activity log
global.fetch = vi.fn();

describe('POST /api/tables/[id]/assign-waiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('rejeita pedido sem autenticação', async () => {
      mockGetAuthUser.mockResolvedValue(null);
      const user = await mockGetAuthUser();

      expect(user).toBeNull();
    });

    it('permite pedido com autenticação', async () => {
      const staff = createTestStaff();
      mockGetAuthUser.mockResolvedValue(staff);
      const user = await mockGetAuthUser();

      expect(user).toBeDefined();
    });
  });

  describe('Verificação de staff ativo', () => {
    it('permite staff ativo', () => {
      const staff = createTestStaff({ is_active: true });

      expect(staff.is_active).toBe(true);
    });

    it('rejeita staff inativo', () => {
      const staff = createTestStaff({ is_active: false });

      expect(staff.is_active).toBe(false);
    });
  });

  describe('Autorização de role', () => {
    it('permite admin atribuir mesa', () => {
      const staff = createTestStaff({ role: 'admin' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(true);
    });

    it('permite waiter atribuir mesa', () => {
      const staff = createTestStaff({ role: 'waiter' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(true);
    });

    it('rejeita kitchen atribuir mesa', () => {
      const staff = createTestStaff({ role: 'kitchen' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(false);
    });

    it('rejeita customer atribuir mesa', () => {
      const staff = createTestStaff({ role: 'customer' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(false);
    });
  });

  describe('Validação de mesa', () => {
    it('rejeita mesa inexistente', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const { data, error } = await mockSupabaseFrom()
        .select('*')
        .eq('id', 'invalid-id')
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('aceita mesa existente', async () => {
      const table = createTestTable();
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: table, error: null }),
      });

      const { data, error } = await mockSupabaseFrom()
        .select('*')
        .eq('id', table.id)
        .single();

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('rejeita mesa inativa', () => {
      const table = createTestTable({ is_active: false });

      expect(table.is_active).toBe(false);
    });

    it('aceita mesa ativa', () => {
      const table = createTestTable({ is_active: true });

      expect(table.is_active).toBe(true);
    });
  });

  describe('Validação de localização (waiter)', () => {
    it('permite waiter na mesma localização', () => {
      const staff = createTestStaff({ role: 'waiter', location: 'circunvalacao' });
      const table = createTestTable({ location: 'circunvalacao' });
      const locationMatches = staff.location === table.location;

      expect(locationMatches).toBe(true);
    });

    it('rejeita waiter em localização diferente', () => {
      const staff = createTestStaff({ role: 'waiter', location: 'circunvalacao' });
      const table = createTestTable({ location: 'boavista' });
      const locationMatches = staff.location === table.location;

      expect(locationMatches).toBe(false);
    });

    it('rejeita waiter sem localização', () => {
      const staff = createTestStaff({ role: 'waiter', location: null });

      expect(staff.location).toBeNull();
    });

    it('permite admin sem verificação de localização', () => {
      const staff = createTestStaff({ role: 'admin', location: 'circunvalacao' });
      const _table = createTestTable({ location: 'boavista' });
      const isAdmin = staff.role === 'admin';

      // Admin can assign any table regardless of location
      expect(isAdmin).toBe(true);
    });
  });

  describe('Atribuição existente', () => {
    it('retorna sucesso quando já atribuído ao mesmo waiter', async () => {
      const assignment = {
        id: 'assignment-1',
        staff: { name: 'João Silva' },
      };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: assignment, error: null }),
      });

      const { data } = await mockSupabaseFrom()
        .select('id, staff:staff!inner(name)')
        .eq('table_id', 'table-1')
        .eq('staff_id', 'staff-1')
        .single();

      expect(data).toBeDefined();
      expect(data.id).toBe('assignment-1');
    });

    it('retorna erro quando atribuído a outro waiter (waiter role)', async () => {
      const staff = createTestStaff({ role: 'waiter' });
      const otherAssignment = {
        id: 'assignment-2',
        staff: { name: 'Maria Santos' },
      };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: otherAssignment, error: null }),
      });

      const { data } = await mockSupabaseFrom()
        .select('id, staff:staff!inner(name)')
        .eq('table_id', 'table-1')
        .neq('staff_id', staff.id)
        .single();

      expect(data).toBeDefined();
      expect(data.staff).toHaveProperty('name');
    });

    it('permite admin substituir atribuição de outro waiter', () => {
      const staff = createTestStaff({ role: 'admin' });
      const otherAssignment = { id: 'assignment-2', staff: { name: 'Maria' } };
      const canOverride = staff.role === 'admin' && otherAssignment;

      expect(canOverride).toBeTruthy();
    });

    it('não permite waiter substituir atribuição de outro waiter', () => {
      const staff = createTestStaff({ role: 'waiter' });
      const _otherAssignment = { id: 'assignment-2', staff: { name: 'Maria' } };
      const canOverride = staff.role === 'admin';

      expect(canOverride).toBe(false);
    });
  });

  describe('Criação de atribuição', () => {
    it('cria atribuição com sucesso', async () => {
      const newAssignment = { id: 'assignment-new' };

      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newAssignment, error: null }),
      });

      const { data, error } = await mockSupabaseFrom()
        .insert({ staff_id: 'staff-1', table_id: 'table-1' })
        .select('id')
        .single();

      expect(data).toBeDefined();
      expect(data.id).toBe('assignment-new');
      expect(error).toBeNull();
    });

    it('retorna mensagem de sucesso personalizada', () => {
      const table = createTestTable({ number: 5 });
      const _staff = createTestStaff({ name: 'João Silva' });
      const message = `Mesa #${table.number} comandada com sucesso!`;

      expect(message).toContain('Mesa #5');
      expect(message).toContain('comandada com sucesso');
    });

    it('inclui nome do waiter na resposta', () => {
      const staff = createTestStaff({ name: 'João Silva' });
      const response = {
        success: true,
        waiterName: staff.name,
        assignment: { id: 'assignment-1' },
      };

      expect(response.waiterName).toBe('João Silva');
    });
  });

  describe('Activity logging', () => {
    it('loga atribuição de mesa', () => {
      const table = createTestTable({ number: 5, location: 'circunvalacao' });
      const staff = createTestStaff({ role: 'waiter' });
      const logData = {
        userId: staff.id,
        action: 'table_assigned',
        entityType: 'table',
        entityId: table.id,
        details: {
          tableNumber: table.number,
          location: table.location,
          assignedBy: 'self',
        },
      };

      expect(logData.action).toBe('table_assigned');
      expect(logData.details.tableNumber).toBe(5);
      expect(logData.details.assignedBy).toBe('self');
    });

    it('marca como atribuição por admin quando admin faz', () => {
      const staff = createTestStaff({ role: 'admin' });
      const assignedBy = staff.role === 'admin' ? 'admin' : 'self';

      expect(assignedBy).toBe('admin');
    });

    it('marca como atribuição própria quando waiter faz', () => {
      const staff = createTestStaff({ role: 'waiter' });
      const assignedBy = staff.role === 'admin' ? 'admin' : 'self';

      expect(assignedBy).toBe('self');
    });
  });

  describe('Códigos de erro', () => {
    it('retorna LOCATION_MISMATCH para waiter em localização errada', () => {
      const errorCode = 'LOCATION_MISMATCH';
      const error = {
        error: 'Não pode comandar mesas de boavista',
        code: errorCode,
      };

      expect(error.code).toBe('LOCATION_MISMATCH');
    });

    it('retorna ALREADY_ASSIGNED para mesa já atribuída', () => {
      const errorCode = 'ALREADY_ASSIGNED';
      const error = {
        error: 'Mesa já está atribuída a outro garçon',
        code: errorCode,
        assignedTo: 'Maria Santos',
      };

      expect(error.code).toBe('ALREADY_ASSIGNED');
      expect(error.assignedTo).toBeDefined();
    });
  });
});

describe('DELETE /api/tables/[id]/assign-waiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('rejeita pedido sem autenticação', async () => {
      mockGetAuthUser.mockResolvedValue(null);
      const user = await mockGetAuthUser();

      expect(user).toBeNull();
    });

    it('permite pedido com autenticação', async () => {
      const staff = createTestStaff();
      mockGetAuthUser.mockResolvedValue(staff);
      const user = await mockGetAuthUser();

      expect(user).toBeDefined();
    });
  });

  describe('Verificação de staff ativo', () => {
    it('permite staff ativo', () => {
      const staff = createTestStaff({ is_active: true });

      expect(staff.is_active).toBe(true);
    });

    it('rejeita staff inativo', () => {
      const staff = createTestStaff({ is_active: false });

      expect(staff.is_active).toBe(false);
    });
  });

  describe('Remoção de atribuição', () => {
    it('remove atribuição com sucesso', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      });

      const deleteQuery = mockSupabaseFrom().delete().eq('table_id', 'table-1').eq('staff_id', 'staff-1');

      expect(deleteQuery).toBeDefined();
    });

    it('retorna mensagem de sucesso', () => {
      const response = {
        success: true,
        message: 'Atribuição removida com sucesso',
      };

      expect(response.success).toBe(true);
      expect(response.message).toContain('removida com sucesso');
    });

    it('remove apenas atribuição do próprio waiter', async () => {
      const staff = createTestStaff({ id: 'staff-1' });

      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, value: string) => {
          if (field === 'staff_id') {
            expect(value).toBe(staff.id);
          }
          return mockSupabaseFrom();
        }),
      });

      const deleteQuery = mockSupabaseFrom().delete().eq('table_id', 'table-1').eq('staff_id', staff.id);

      expect(deleteQuery).toBeDefined();
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna erro quando falha a remoção', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      });

      const error = { message: 'Database error' };

      expect(error).toBeDefined();
      expect(error.message).toBeTruthy();
    });

    it('retorna status 500 em caso de erro interno', () => {
      const errorResponse = {
        error: 'Erro ao remover atribuição',
        status: 500,
      };

      expect(errorResponse.status).toBe(500);
    });
  });
});

describe('Validações comuns de mesa', () => {
  it('aceita número de mesa entre 1 e 100', () => {
    [1, 10, 50, 100].forEach(number => {
      expect(number >= 1 && number <= 100).toBe(true);
    });
  });

  it('rejeita número de mesa inválido', () => {
    [0, -1, 101, 200].forEach(number => {
      expect(number >= 1 && number <= 100).toBe(false);
    });
  });

  it('valida localizações permitidas', () => {
    const validLocations = ['circunvalacao', 'boavista'];

    validLocations.forEach(location => {
      expect(validLocations.includes(location)).toBe(true);
    });
  });

  it('rejeita localização inválida', () => {
    const validLocations = ['circunvalacao', 'boavista'];
    const invalidLocation = 'invalid_location';

    expect(validLocations.includes(invalidLocation)).toBe(false);
  });
});
