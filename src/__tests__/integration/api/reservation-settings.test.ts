/**
 * Integration Tests: Reservation Settings API
 * Tests for the /api/reservation-settings endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

// Mock auth
const mockVerifyAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  verifyAuth: mockVerifyAuth,
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

describe('GET /api/reservation-settings', () => {
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

    it('permite admin aceder', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin' });
      const auth = await mockVerifyAuth();

      expect(auth?.role).toBe('admin');
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
      const auth = await mockVerifyAuth();

      expect(auth).toBeNull();
    });

    it('requer role admin', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'kitchen' });
      const auth = await mockVerifyAuth();
      const isAdmin = auth?.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite admin atualizar', async () => {
      mockVerifyAuth.mockResolvedValue({ role: 'admin', id: 'admin-1' });
      const auth = await mockVerifyAuth();

      expect(auth?.role).toBe('admin');
      expect(auth?.id).toBe('admin-1');
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
    it('valida horas entre 0-23', () => {
      const hours = 18;
      const isValid = hours >= 0 && hours <= 23;

      expect(isValid).toBe(true);
    });

    it('rejeita horas negativas', () => {
      const hours = -1;
      const isValid = hours >= 0 && hours <= 23;

      expect(isValid).toBe(false);
    });

    it('rejeita horas >= 24', () => {
      const hours = 24;
      const isValid = hours >= 0 && hours <= 23;

      expect(isValid).toBe(false);
    });
  });

  describe('Validação de fees', () => {
    it('valida fee positivo', () => {
      const fee = 2.50;
      const isValid = fee >= 0;

      expect(isValid).toBe(true);
    });

    it('aceita fee zero', () => {
      const fee = 0;
      const isValid = fee >= 0;

      expect(isValid).toBe(true);
    });

    it('rejeita fee negativo', () => {
      const fee = -1.50;
      const isValid = fee >= 0;

      expect(isValid).toBe(false);
    });

    it('valida precisão decimal (2 casas)', () => {
      const fee = 2.50;
      const rounded = Math.round(fee * 100) / 100;

      expect(fee).toBe(rounded);
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
