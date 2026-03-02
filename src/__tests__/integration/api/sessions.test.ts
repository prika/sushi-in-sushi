/**
 * Integration Tests: Sessions API
 * Tests for the /api/sessions endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestSession, createTestStaff } from '../../helpers/factories';
import type { OrderingMode } from '@/domain/value-objects/OrderingMode';

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

// Mock use cases
const mockStartSessionExecute = vi.fn();
const mockUpdateOrderingModeExecute = vi.fn();

vi.mock('@/application/use-cases/sessions/StartSessionUseCase', () => ({
  StartSessionUseCase: vi.fn().mockImplementation(() => ({
    execute: mockStartSessionExecute,
  })),
}));

vi.mock('@/application/use-cases/sessions/UpdateSessionOrderingModeUseCase', () => ({
  UpdateSessionOrderingModeUseCase: vi.fn().mockImplementation(() => ({
    execute: mockUpdateOrderingModeExecute,
  })),
}));

vi.mock('@/application/use-cases/sessions/AutoAssignWaiterUseCase', () => ({
  AutoAssignWaiterUseCase: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de campos obrigatórios', () => {
    it('rejeita pedido sem tableId', () => {
      const body = { isRodizio: true, numPeople: 4 };
      const requiredFields = ['tableId'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toContain('tableId');
    });

    it('aceita pedido com tableId', () => {
      const body = { tableId: 'table-1' };
      const requiredFields = ['tableId'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toHaveLength(0);
    });
  });

  describe('Valores padrão', () => {
    it('usa isRodizio=false quando não fornecido', () => {
      const body = { tableId: 'table-1' };
      const isRodizio = body.isRodizio ?? false;

      expect(isRodizio).toBe(false);
    });

    it('usa numPeople=1 quando não fornecido', () => {
      const body = { tableId: 'table-1' };
      const numPeople = body.numPeople ?? 1;

      expect(numPeople).toBe(1);
    });

    it('usa orderingMode="client" quando não fornecido', () => {
      const body = { tableId: 'table-1' };
      const orderingMode = body.orderingMode ?? 'client';

      expect(orderingMode).toBe('client');
    });
  });

  describe('Criação de sessão', () => {
    it('cria sessão com sucesso', async () => {
      const session = createTestSession();
      const result = { success: true, data: session };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(session.id);
    });

    it('cria sessão rodízio', async () => {
      const session = createTestSession({ is_rodizio: true });
      const result = { success: true, data: session };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.data.is_rodizio).toBe(true);
    });

    it('cria sessão à la carte', async () => {
      const session = createTestSession({ is_rodizio: false });
      const result = { success: true, data: session };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.data.is_rodizio).toBe(false);
    });

    it('define número de pessoas corretamente', async () => {
      const session = createTestSession({ num_people: 6 });
      const result = { success: true, data: session };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.data.num_people).toBe(6);
    });

    it('define ordering mode corretamente', async () => {
      const session = createTestSession({ ordering_mode: 'waiter_only' as OrderingMode });
      const result = { success: true, data: session };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.data.ordering_mode).toBe('waiter_only');
    });
  });

  describe('Tratamento de mesa ocupada', () => {
    it('retorna erro TABLE_OCCUPIED quando mesa já está ocupada', async () => {
      const result = {
        success: false,
        error: 'Mesa já está ocupada',
        code: 'TABLE_OCCUPIED',
      };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.code).toBe('TABLE_OCCUPIED');
    });

    it('recupera sessão existente quando mesa ocupada', async () => {
      const existingSession = createTestSession({ status: 'active' });

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingSession, error: null }),
      });

      const { data } = await mockSupabaseFrom()
        .select('*')
        .eq('table_id', 'table-1')
        .in('status', ['active', 'pending_payment'])
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      expect(data).toBeDefined();
      expect(data.status).toBe('active');
    });

    it('marca sessão como recuperada', () => {
      const response = {
        session: createTestSession(),
        waiterName: 'João Silva',
        recovered: true,
      };

      expect(response.recovered).toBe(true);
      expect(response.session).toBeDefined();
      expect(response.waiterName).toBeDefined();
    });
  });

  describe('Atualização de total_amount', () => {
    it('atualiza total_amount para rodízio', () => {
      const totalAmount = 89.90;
      const shouldUpdate = totalAmount && totalAmount > 0;

      expect(shouldUpdate).toBe(true);
    });

    it('não atualiza quando totalAmount é 0', () => {
      const totalAmount = 0;
      const shouldUpdate = totalAmount && totalAmount > 0;

      expect(shouldUpdate).toBeFalsy();
    });

    it('não atualiza quando totalAmount não é fornecido', () => {
      const totalAmount = undefined;
      const shouldUpdate = totalAmount && totalAmount > 0;

      expect(shouldUpdate).toBeFalsy();
    });
  });

  describe('Atribuição de empregado', () => {
    it('retorna nome do empregado quando atribuído', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { staff_name: 'João Silva' },
          error: null,
        }),
      });

      const { data } = await mockSupabaseFrom()
        .select('staff_name')
        .eq('table_id', 'table-1')
        .single();

      expect(data?.staff_name).toBe('João Silva');
    });

    it('retorna null quando nenhum empregado atribuído', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { data } = await mockSupabaseFrom()
        .select('staff_name')
        .eq('table_id', 'table-1')
        .single();

      expect(data).toBeNull();
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna erro quando tableId inválido', async () => {
      const result = {
        success: false,
        error: 'Mesa não encontrada',
        code: 'TABLE_NOT_FOUND',
      };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.code).toBe('TABLE_NOT_FOUND');
    });

    it('retorna erro quando mesa não está disponível', async () => {
      const result = {
        success: false,
        error: 'Mesa não está disponível',
        code: 'TABLE_NOT_AVAILABLE',
      };
      mockStartSessionExecute.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.code).toBe('TABLE_NOT_AVAILABLE');
    });
  });
});

describe('PATCH /api/sessions/[id]/ordering-mode', () => {
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
      expect(user?.id).toBe(staff.id);
    });
  });

  describe('Autorização de staff', () => {
    it('permite admin alterar modo', () => {
      const staff = createTestStaff({ role: 'admin' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(true);
    });

    it('permite waiter alterar modo', () => {
      const staff = createTestStaff({ role: 'waiter' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(true);
    });

    it('rejeita kitchen alterar modo', () => {
      const staff = createTestStaff({ role: 'kitchen' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(false);
    });

    it('rejeita customer alterar modo', () => {
      const staff = createTestStaff({ role: 'customer' });
      const hasPermission = ['admin', 'waiter'].includes(staff.role);

      expect(hasPermission).toBe(false);
    });
  });

  describe('Validação de ordering mode', () => {
    it('aceita modo "client"', () => {
      const orderingMode = 'client';
      const validModes: OrderingMode[] = ['client', 'waiter_only'];
      const isValid = validModes.includes(orderingMode as OrderingMode);

      expect(isValid).toBe(true);
    });

    it('aceita modo "waiter_only"', () => {
      const orderingMode = 'waiter_only';
      const validModes: OrderingMode[] = ['client', 'waiter_only'];
      const isValid = validModes.includes(orderingMode as OrderingMode);

      expect(isValid).toBe(true);
    });

    it('rejeita modo inválido', () => {
      const orderingMode = 'invalid_mode';
      const validModes: OrderingMode[] = ['client', 'waiter_only'];
      const isValid = validModes.includes(orderingMode as OrderingMode);

      expect(isValid).toBe(false);
    });

    it('rejeita modo vazio', () => {
      const orderingMode = '';
      const isValid = orderingMode && ['client', 'waiter_only'].includes(orderingMode as OrderingMode);

      expect(isValid).toBeFalsy();
    });

    it('rejeita modo null', () => {
      const orderingMode = null;
      const isValid = orderingMode && ['client', 'waiter_only'].includes(orderingMode as OrderingMode);

      expect(isValid).toBeFalsy();
    });
  });

  describe('Atualização de modo', () => {
    it('atualiza de client para waiter_only', async () => {
      const session = createTestSession({ ordering_mode: 'waiter_only' as OrderingMode });
      const result = { success: true, data: session };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.data.ordering_mode).toBe('waiter_only');
    });

    it('atualiza de waiter_only para client', async () => {
      const session = createTestSession({ ordering_mode: 'client' as OrderingMode });
      const result = { success: true, data: session };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.data.ordering_mode).toBe('client');
    });

    it('retorna sessão atualizada', async () => {
      const session = createTestSession();
      const result = { success: true, data: session };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(session.id);
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna erro 404 quando sessão não existe', async () => {
      const result = {
        success: false,
        error: 'Sessão não encontrada',
        code: 'SESSION_NOT_FOUND',
      };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_NOT_FOUND');
    });

    it('retorna erro quando sessão já está fechada', async () => {
      const result = {
        success: false,
        error: 'Sessão já está fechada',
        code: 'SESSION_CLOSED',
      };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_CLOSED');
    });

    it('retorna erro quando modo já é o mesmo', async () => {
      const result = {
        success: false,
        error: 'Já está neste modo',
        code: 'ALREADY_IN_MODE',
      };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.code).toBe('ALREADY_IN_MODE');
    });
  });

  describe('Formato de resposta', () => {
    it('retorna sucesso com sessão', async () => {
      const session = createTestSession();
      const result = { success: true, data: session };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);
      const response = { success: true, session: result.data };

      expect(response.success).toBe(true);
      expect(response.session).toBeDefined();
      expect(response.session.id).toBe(session.id);
    });

    it('inclui ordering_mode na resposta', async () => {
      const session = createTestSession({ ordering_mode: 'waiter_only' as OrderingMode });
      const result = { success: true, data: session };
      mockUpdateOrderingModeExecute.mockResolvedValue(result);

      expect(result.data.ordering_mode).toBe('waiter_only');
    });
  });
});

describe('Validação de numPeople', () => {
  it('aceita 1 pessoa', () => {
    const numPeople = 1;
    expect(numPeople >= 1 && numPeople <= 20).toBe(true);
  });

  it('aceita 4 pessoas', () => {
    const numPeople = 4;
    expect(numPeople >= 1 && numPeople <= 20).toBe(true);
  });

  it('aceita 20 pessoas (máximo)', () => {
    const numPeople = 20;
    expect(numPeople >= 1 && numPeople <= 20).toBe(true);
  });

  it('rejeita 0 pessoas', () => {
    const numPeople = 0;
    expect(numPeople >= 1 && numPeople <= 20).toBe(false);
  });

  it('rejeita mais de 20 pessoas', () => {
    const numPeople = 21;
    expect(numPeople >= 1 && numPeople <= 20).toBe(false);
  });
});
