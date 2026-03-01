import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseReservationSettingsRepository } from '@/infrastructure/repositories/SupabaseReservationSettingsRepository';

// Mock Supabase client com padrão thenable
function createMockSupabaseClient() {
  let sharedBuilder: any = null;
  let sharedResult: any = { data: [], error: null };

  const createQueryBuilder = () => {
    if (sharedBuilder) return sharedBuilder;

    const builder: any = {};

    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'];

    chainMethods.forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    builder.then = (onFulfilled: (_value: any) => any) => Promise.resolve(sharedResult).then(onFulfilled);
    builder.catch = (onRejected: (_reason: any) => any) => Promise.resolve(sharedResult).catch(onRejected);

    builder.setMockResult = (value: any) => {
      sharedResult = value;
    };

    sharedBuilder = builder;
    return builder;
  };

  const mockClient = {
    from: vi.fn((_table: string) => createQueryBuilder()),
    _resetBuilder: () => {
      sharedBuilder = null;
      sharedResult = { data: [], error: null };
    },
  };

  return mockClient;
}

describe('SupabaseReservationSettingsRepository', () => {
  let repository: SupabaseReservationSettingsRepository;
  let mockSupabase: any;
  let _builder: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    repository = new SupabaseReservationSettingsRepository(mockSupabase);
    mockSupabase._resetBuilder();
    _builder = mockSupabase.from('reservation_settings');
  });

  describe('get', () => {
    it('deve retornar configurações existentes', async () => {
      const mockData = {
        id: 1,
        day_before_reminder_enabled: true,
        day_before_reminder_hours: 24,
        same_day_reminder_enabled: true,
        same_day_reminder_hours: 2,
        rodizio_waste_policy_enabled: true,
        rodizio_waste_fee_per_piece: 2.5,
        updated_at: '2024-01-01T00:00:00Z',
        updated_by: '123e4567-e89b-12d3-a456-426614174000',
      };

      const builder = mockSupabase.from('reservation_settings');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.get();

      expect(mockSupabase.from).toHaveBeenCalledWith('reservation_settings');
      expect(builder.eq).toHaveBeenCalledWith('id', 1);
      expect(result.id).toBe(1);
      expect(result.dayBeforeReminderEnabled).toBe(true);
      expect(result.dayBeforeReminderHours).toBe(24);
    });

    it('deve retornar configurações padrão se não encontrado', async () => {
      const builder = mockSupabase.from('reservation_settings');
      builder.setMockResult({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.get();

      expect(result.id).toBe(1);
      expect(result.dayBeforeReminderEnabled).toBe(true);
      expect(result.dayBeforeReminderHours).toBe(24);
      expect(result.sameDayReminderEnabled).toBe(true);
      expect(result.sameDayReminderHours).toBe(2);
      expect(result.rodizioWastePolicyEnabled).toBe(true);
      expect(result.rodizioWasteFeePerPiece).toBe(2.5);
    });

    it('deve lançar erro para outros erros de Supabase', async () => {
      const builder = mockSupabase.from('reservation_settings');
      builder.setMockResult({ data: null, error: { message: 'Database error' } });

      await expect(repository.get()).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('deve atualizar configurações com sucesso', async () => {
      const mockData = {
        id: 1,
        day_before_reminder_enabled: false,
        day_before_reminder_hours: 48,
        same_day_reminder_enabled: true,
        same_day_reminder_hours: 3,
        rodizio_waste_policy_enabled: false,
        rodizio_waste_fee_per_piece: 3.0,
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: '123e4567-e89b-12d3-a456-426614174000',
      };

      const builder = mockSupabase.from('reservation_settings');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.update(
        {
          dayBeforeReminderEnabled: false,
          dayBeforeReminderHours: 48,
          sameDayReminderHours: 3,
          rodizioWastePolicyEnabled: false,
          rodizioWasteFeePerPiece: 3.0,
        },
        '123e4567-e89b-12d3-a456-426614174000'
      );

      expect(builder.update).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 1);
      expect(result.dayBeforeReminderEnabled).toBe(false);
      expect(result.dayBeforeReminderHours).toBe(48);
      expect(result.rodizioWasteFeePerPiece).toBe(3.0);
    });

    it('deve incluir updated_by no update', async () => {
      const mockData = {
        id: 1,
        day_before_reminder_enabled: true,
        day_before_reminder_hours: 24,
        same_day_reminder_enabled: true,
        same_day_reminder_hours: 2,
        rodizio_waste_policy_enabled: true,
        rodizio_waste_fee_per_piece: 2.5,
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: 'admin-id',
      };

      const builder = mockSupabase.from('reservation_settings');
      builder.setMockResult({ data: mockData, error: null });

      await repository.update({ dayBeforeReminderHours: 48 }, 'admin-id');

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ updated_by: 'admin-id' })
      );
    });

    it('deve mapear campos corretamente de camelCase para snake_case', async () => {
      const mockData = {
        id: 1,
        day_before_reminder_enabled: true,
        day_before_reminder_hours: 36,
        same_day_reminder_enabled: false,
        same_day_reminder_hours: 1,
        rodizio_waste_policy_enabled: true,
        rodizio_waste_fee_per_piece: 4.0,
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: 'admin-id',
      };

      const builder = mockSupabase.from('reservation_settings');
      let capturedUpdateData: any;
      builder.update = vi.fn((data) => {
        capturedUpdateData = data;
        return builder;
      });
      builder.setMockResult({ data: mockData, error: null });

      await repository.update(
        {
          dayBeforeReminderHours: 36,
          sameDayReminderEnabled: false,
          sameDayReminderHours: 1,
          rodizioWasteFeePerPiece: 4.0,
        },
        'admin-id'
      );

      expect(capturedUpdateData).toHaveProperty('day_before_reminder_hours', 36);
      expect(capturedUpdateData).toHaveProperty('same_day_reminder_enabled', false);
      expect(capturedUpdateData).toHaveProperty('same_day_reminder_hours', 1);
      expect(capturedUpdateData).toHaveProperty('rodizio_waste_fee_per_piece', 4.0);
      expect(capturedUpdateData).toHaveProperty('updated_by', 'admin-id');
    });
  });

  describe('mapToEntity', () => {
    it('deve mapear corretamente datas', async () => {
      const mockData = {
        id: 1,
        day_before_reminder_enabled: true,
        day_before_reminder_hours: 24,
        same_day_reminder_enabled: true,
        same_day_reminder_hours: 2,
        rodizio_waste_policy_enabled: true,
        rodizio_waste_fee_per_piece: 2.5,
        updated_at: '2024-01-01T12:00:00Z',
        updated_by: '123e4567-e89b-12d3-a456-426614174000',
      };

      const builder = mockSupabase.from('reservation_settings');
      builder.setMockResult({ data: mockData, error: null });

      const result = await repository.get();

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });
  });
});
