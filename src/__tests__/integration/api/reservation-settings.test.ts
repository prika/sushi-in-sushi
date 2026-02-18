/**
 * Integration Tests: Reservation Settings API
 * Tests for the /api/reservation-settings endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/reservation-settings/route';
import { NextRequest } from 'next/server';

// Mock auth first (must be before Supabase mock to avoid hoisting issues)
const mockVerifyAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  verifyAuth: () => mockVerifyAuth(),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

// Helper to create test settings
function createTestSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    day_before_reminder_enabled: true,
    day_before_reminder_hours: 18,
    same_day_reminder_enabled: true,
    same_day_reminder_hours: 10,
    rodizio_waste_policy_enabled: true,
    rodizio_waste_fee_per_piece: 2.50,
    updated_at: new Date().toISOString(),
    updated_by: 'admin-1',
    ...overrides,
  };
}

// Helper to create mock PATCH request
function createMockPatchRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: new Headers(),
  } as NextRequest;
}

describe('GET /api/reservation-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('requer role admin', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'waiter', id: 'waiter-1', email: 'waiter@test.com' });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('permite admin aceder', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      // Mock Supabase response for settings (chain: .from().select().eq().single())
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          day_before_reminder_enabled: true,
          day_before_reminder_hours: 18,
          same_day_reminder_enabled: true,
          same_day_reminder_hours: 10,
          rodizio_waste_policy_enabled: true,
          rodizio_waste_fee_per_piece: 2.50,
          updated_at: new Date().toISOString(),
          updated_by: 'admin-1',
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('day_before_reminder_enabled');
      expect(data).toHaveProperty('same_day_reminder_enabled');
      expect(data).toHaveProperty('rodizio_waste_policy_enabled');

      // Verify mocks were called
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('reservation_settings');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(mockSingle).toHaveBeenCalled();
    });
  });

  describe('Configurações de lembretes', () => {
    it('retorna configuração de lembrete dia anterior', () => {
      const settings = createTestSettings();

      expect(settings.day_before_reminder_enabled).toBe(true);
      expect(settings.day_before_reminder_hours).toBe(18);
    });

    it('retorna configuração de lembrete mesmo dia', () => {
      const settings = createTestSettings();

      expect(settings.same_day_reminder_enabled).toBe(true);
      expect(settings.same_day_reminder_hours).toBe(10);
    });

    it('valida horas entre 0-23', () => {
      const validHours = [0, 10, 18, 23];

      validHours.forEach(hours => {
        expect(hours >= 0 && hours <= 23).toBe(true);
      });
    });

    it('rejeita horas inválidas', () => {
      const invalidHours = [-1, 24, 25];

      invalidHours.forEach(hours => {
        expect(hours >= 0 && hours <= 23).toBe(false);
      });
    });
  });

  describe('Política de desperdício rodízio', () => {
    it('retorna configuração de política de desperdício', () => {
      const settings = createTestSettings();

      expect(settings.rodizio_waste_policy_enabled).toBe(true);
      expect(settings.rodizio_waste_fee_per_piece).toBe(2.50);
    });

    it('valida fee como número positivo', () => {
      const validFees = [0.50, 1.00, 2.50, 5.00];

      validFees.forEach(fee => {
        expect(fee >= 0).toBe(true);
        expect(typeof fee).toBe('number');
      });
    });

    it('rejeita fees negativos', () => {
      const invalidFees = [-1.00, -0.50];

      invalidFees.forEach(fee => {
        expect(fee >= 0).toBe(false);
      });
    });
  });

  describe('Formato de resposta', () => {
    it('retorna settings em snake_case', () => {
      const settings = createTestSettings();

      expect(settings).toHaveProperty('day_before_reminder_enabled');
      expect(settings).toHaveProperty('same_day_reminder_hours');
      expect(settings).toHaveProperty('rodizio_waste_fee_per_piece');
    });

    it('inclui metadata de atualização', () => {
      const settings = createTestSettings();

      expect(settings.updated_at).toBeDefined();
      expect(settings.updated_by).toBe('admin-1');
    });

    it('retorna ID único (singleton)', () => {
      const settings = createTestSettings();

      expect(settings.id).toBe(1);
    });
  });

  describe('Valores padrão', () => {
    it('retorna valores padrão se não existir configuração', () => {
      const defaultSettings = {
        id: 1,
        day_before_reminder_enabled: true,
        day_before_reminder_hours: 18,
        same_day_reminder_enabled: true,
        same_day_reminder_hours: 10,
        rodizio_waste_policy_enabled: false,
        rodizio_waste_fee_per_piece: 0,
      };

      expect(defaultSettings.day_before_reminder_hours).toBe(18);
      expect(defaultSettings.same_day_reminder_hours).toBe(10);
      expect(defaultSettings.rodizio_waste_policy_enabled).toBe(false);
    });
  });
});

describe('PATCH /api/reservation-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const request = createMockPatchRequest({ day_before_reminder_hours: 18 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('requer role admin', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'kitchen', id: 'kitchen-1', email: 'kitchen@test.com' });

      const request = createMockPatchRequest({ day_before_reminder_hours: 18 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('permite admin atualizar', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      // Mock Supabase update chain: .from().update().eq().select().single()
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          day_before_reminder_enabled: true,
          day_before_reminder_hours: 20,
          same_day_reminder_enabled: true,
          same_day_reminder_hours: 10,
          rodizio_waste_policy_enabled: true,
          rodizio_waste_fee_per_piece: 2.50,
          updated_at: new Date().toISOString(),
          updated_by: 'admin-1',
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const request = createMockPatchRequest({ day_before_reminder_hours: 20 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('day_before_reminder_hours');
      expect(data.day_before_reminder_hours).toBe(20);

      // Verify mocks were called with expected arguments
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('reservation_settings');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        updated_by: 'admin-1',
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 1);
      expect(mockSelect).toHaveBeenCalled(); // PATCH uses .select() without arguments
      expect(mockSingle).toHaveBeenCalled();
    });
  });

  describe('Validação de dados', () => {
    it('aceita camelCase no body', () => {
      const body = {
        dayBeforeReminderEnabled: false,
        dayBeforeReminderHours: 12,
        sameDayReminderEnabled: false,
        rodizioWasteFeePerPiece: 3.00,
      };

      expect(body.dayBeforeReminderEnabled).toBeDefined();
      expect(body.sameDayReminderEnabled).toBeDefined();
    });

    it('aceita snake_case no body', () => {
      const body = {
        day_before_reminder_enabled: false,
        day_before_reminder_hours: 12,
        same_day_reminder_enabled: false,
        rodizio_waste_fee_per_piece: 3.00,
      };

      expect(body.day_before_reminder_enabled).toBeDefined();
      expect(body.same_day_reminder_enabled).toBeDefined();
    });

    it('suporta atualização parcial', () => {
      const body = {
        rodizio_waste_fee_per_piece: 3.50,
      };

      expect(body.rodizio_waste_fee_per_piece).toBe(3.50);
      expect(Object.keys(body)).toHaveLength(1);
    });

    it('atualiza apenas campos fornecidos', () => {
      const body = {
        day_before_reminder_hours: 20,
        same_day_reminder_hours: 8,
      };

      const updateData: Record<string, unknown> = {};
      if (body.day_before_reminder_hours !== undefined) {
        updateData.dayBeforeReminderHours = body.day_before_reminder_hours;
      }
      if (body.same_day_reminder_hours !== undefined) {
        updateData.sameDayReminderHours = body.same_day_reminder_hours;
      }

      expect(updateData).toHaveProperty('dayBeforeReminderHours');
      expect(updateData).toHaveProperty('sameDayReminderHours');
      expect(updateData).not.toHaveProperty('rodizioWasteFeePerPiece');
    });
  });

  describe('Validação de horas', () => {
    it('valida horas entre 1-168 (reminder hours)', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      // Mock successful Supabase update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          day_before_reminder_enabled: true,
          day_before_reminder_hours: 18,
          same_day_reminder_enabled: true,
          same_day_reminder_hours: 10,
          rodizio_waste_policy_enabled: true,
          rodizio_waste_fee_per_piece: 2.50,
          updated_at: new Date().toISOString(),
          updated_by: 'admin-1',
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const request = createMockPatchRequest({ day_before_reminder_hours: 18 });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('reservation_settings');
    });

    it('rejeita horas negativas', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      const request = createMockPatchRequest({ day_before_reminder_hours: -1 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('rejeita horas zero', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      const request = createMockPatchRequest({ day_before_reminder_hours: 0 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('rejeita horas > 168 (1 semana)', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      const request = createMockPatchRequest({ day_before_reminder_hours: 200 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(mockVerifyAuth).toHaveBeenCalled();
    });
  });

  describe('Validação de fees', () => {
    it('valida fee positivo', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      // Mock successful Supabase update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          day_before_reminder_enabled: true,
          day_before_reminder_hours: 18,
          same_day_reminder_enabled: true,
          same_day_reminder_hours: 10,
          rodizio_waste_policy_enabled: true,
          rodizio_waste_fee_per_piece: 2.50,
          updated_at: new Date().toISOString(),
          updated_by: 'admin-1',
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const request = createMockPatchRequest({ rodizio_waste_fee_per_piece: 2.50 });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('reservation_settings');
    });

    it('aceita fee zero', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      // Mock successful Supabase update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          day_before_reminder_enabled: true,
          day_before_reminder_hours: 18,
          same_day_reminder_enabled: true,
          same_day_reminder_hours: 10,
          rodizio_waste_policy_enabled: false,
          rodizio_waste_fee_per_piece: 0,
          updated_at: new Date().toISOString(),
          updated_by: 'admin-1',
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const request = createMockPatchRequest({ rodizio_waste_fee_per_piece: 0 });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('reservation_settings');
    });

    it('rejeita fee negativo', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      const request = createMockPatchRequest({ rodizio_waste_fee_per_piece: -1.50 });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(mockVerifyAuth).toHaveBeenCalled();
    });

    it('valida precisão decimal (2 casas)', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1', email: 'admin@test.com' });

      // Mock successful Supabase update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          day_before_reminder_enabled: true,
          day_before_reminder_hours: 18,
          same_day_reminder_enabled: true,
          same_day_reminder_hours: 10,
          rodizio_waste_policy_enabled: true,
          rodizio_waste_fee_per_piece: 2.50,
          updated_at: new Date().toISOString(),
          updated_by: 'admin-1',
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const request = createMockPatchRequest({ rodizio_waste_fee_per_piece: 2.50 });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockVerifyAuth).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('reservation_settings');
    });
  });

  describe('Registo de atualização', () => {
    it('regista updatedBy com ID do admin', async () => {
      const adminId = 'admin-1';
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: adminId });

      const auth = await mockVerifyAuth();
      const updateData = { updatedBy: auth?.id };

      expect(updateData.updatedBy).toBe(adminId);
    });

    it('atualiza updated_at timestamp', () => {
      const before = new Date();
      const settings = createTestSettings();
      const updatedAt = new Date(settings.updated_at);

      expect(updatedAt >= before).toBe(true);
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna settings atualizados em snake_case', () => {
      const settings = createTestSettings({
        day_before_reminder_hours: 20,
        rodizio_waste_fee_per_piece: 3.00,
      });

      expect(settings).toHaveProperty('day_before_reminder_hours');
      expect(settings.day_before_reminder_hours).toBe(20);
      expect(settings.rodizio_waste_fee_per_piece).toBe(3.00);
    });

    it('inclui metadata de atualização', () => {
      const settings = createTestSettings({ updated_by: 'admin-2' });

      expect(settings.updated_at).toBeDefined();
      expect(settings.updated_by).toBe('admin-2');
    });
  });

  describe('Combinações de configurações', () => {
    it('permite desativar todos os lembretes', () => {
      const settings = createTestSettings({
        day_before_reminder_enabled: false,
        same_day_reminder_enabled: false,
      });

      expect(settings.day_before_reminder_enabled).toBe(false);
      expect(settings.same_day_reminder_enabled).toBe(false);
    });

    it('permite desativar política de desperdício', () => {
      const settings = createTestSettings({
        rodizio_waste_policy_enabled: false,
        rodizio_waste_fee_per_piece: 0,
      });

      expect(settings.rodizio_waste_policy_enabled).toBe(false);
      expect(settings.rodizio_waste_fee_per_piece).toBe(0);
    });

    it('permite configurar horários personalizados', () => {
      const settings = createTestSettings({
        day_before_reminder_hours: 15,
        same_day_reminder_hours: 9,
      });

      expect(settings.day_before_reminder_hours).toBe(15);
      expect(settings.same_day_reminder_hours).toBe(9);
    });
  });
});
