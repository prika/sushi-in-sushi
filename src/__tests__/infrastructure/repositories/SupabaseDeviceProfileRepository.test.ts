import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseDeviceProfileRepository } from '@/infrastructure/repositories/SupabaseDeviceProfileRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Testes para SupabaseDeviceProfileRepository
 *
 * Verifica mapeamento de dados, operações CRUD, upsert com onConflict
 * e incremento atómico de visitas. Usa cliente Supabase mockado.
 */

function createDbDeviceProfile(overrides: Partial<any> = {}) {
  return {
    device_id: 'device-abc-123',
    last_display_name: 'João',
    last_full_name: 'João Silva',
    last_email: 'joao@test.com',
    last_phone: '+351912345678',
    last_birth_date: '1990-01-15',
    last_preferred_contact: 'email',
    highest_tier: 1,
    linked_customer_id: null,
    visit_count: 3,
    first_seen_at: '2026-01-01T00:00:00.000Z',
    last_seen_at: '2026-01-15T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseDeviceProfileRepository', () => {
  let repository: SupabaseDeviceProfileRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseDeviceProfileRepository(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // findByDeviceId
  // ---------------------------------------------------------------------------
  describe('findByDeviceId', () => {
    it('deve retornar perfil de dispositivo por deviceId', async () => {
      const dbRow = createDbDeviceProfile();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result).not.toBeNull();
      expect(result?.deviceId).toBe('device-abc-123');
      expect(result?.lastDisplayName).toBe('João');
      expect(result?.lastFullName).toBe('João Silva');
      expect(result?.lastEmail).toBe('joao@test.com');
      expect(result?.lastPhone).toBe('+351912345678');
      expect(result?.lastBirthDate).toBe('1990-01-15');
      expect(result?.lastPreferredContact).toBe('email');
      expect(result?.highestTier).toBe(1);
      expect(result?.visitCount).toBe(3);
      expect(mockClient.from).toHaveBeenCalledWith('device_profiles');
    });

    it('deve retornar null com código PGRST116', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await repository.findByDeviceId('inexistente');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Erro inesperado' },
      });

      await expect(repository.findByDeviceId('device-1')).rejects.toThrow('Erro inesperado');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('deve criar perfil com mapeamento camelCase para snake_case', async () => {
      const dbRow = createDbDeviceProfile({ device_id: 'device-new' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        deviceId: 'device-new',
        lastDisplayName: 'Maria',
        lastFullName: 'Maria Costa',
        lastEmail: 'maria@test.com',
        lastPhone: '+351999999999',
        lastBirthDate: '1985-06-20',
        lastPreferredContact: 'phone',
        highestTier: 2,
      });

      expect(result.deviceId).toBe('device-new');
      expect(mockClient.from).toHaveBeenCalledWith('device_profiles');
      expect(builder.insert).toHaveBeenCalledWith({
        device_id: 'device-new',
        last_display_name: 'Maria',
        last_full_name: 'Maria Costa',
        last_email: 'maria@test.com',
        last_phone: '+351999999999',
        last_birth_date: '1985-06-20',
        last_preferred_contact: 'phone',
        highest_tier: 2,
      });
    });

    it('deve usar null para campos opcionais quando não fornecidos', async () => {
      const dbRow = createDbDeviceProfile({
        device_id: 'device-min',
        last_display_name: null,
        last_full_name: null,
        last_email: null,
        last_phone: null,
        last_birth_date: null,
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({ deviceId: 'device-min' });

      expect(builder.insert).toHaveBeenCalledWith({
        device_id: 'device-min',
        last_display_name: null,
        last_full_name: null,
        last_email: null,
        last_phone: null,
        last_birth_date: null,
        last_preferred_contact: 'email',
        highest_tier: 1,
      });
    });

    it('deve lançar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Violação de constraint' },
      });

      await expect(
        repository.create({ deviceId: 'device-dup' }),
      ).rejects.toThrow('Violação de constraint');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('deve atualizar campos parciais e definir last_seen_at automaticamente', async () => {
      const dbRow = createDbDeviceProfile({ last_display_name: 'Pedro' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('device-abc-123', {
        lastDisplayName: 'Pedro',
      });

      expect(result.lastDisplayName).toBe('Pedro');
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_display_name: 'Pedro',
          last_seen_at: expect.any(String),
        }),
      );
      expect(builder.eq).toHaveBeenCalledWith('device_id', 'device-abc-123');
    });

    it('deve mapear lastFullName para last_full_name', async () => {
      const dbRow = createDbDeviceProfile({ last_full_name: 'Nome Completo' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { lastFullName: 'Nome Completo' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_full_name: 'Nome Completo' }),
      );
    });

    it('deve mapear lastEmail para last_email', async () => {
      const dbRow = createDbDeviceProfile({ last_email: 'novo@test.com' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { lastEmail: 'novo@test.com' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_email: 'novo@test.com' }),
      );
    });

    it('deve mapear lastPhone para last_phone', async () => {
      const dbRow = createDbDeviceProfile({ last_phone: '+351888888888' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { lastPhone: '+351888888888' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_phone: '+351888888888' }),
      );
    });

    it('deve mapear lastBirthDate para last_birth_date', async () => {
      const dbRow = createDbDeviceProfile({ last_birth_date: '2000-01-01' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { lastBirthDate: '2000-01-01' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_birth_date: '2000-01-01' }),
      );
    });

    it('deve mapear lastPreferredContact para last_preferred_contact', async () => {
      const dbRow = createDbDeviceProfile({ last_preferred_contact: 'phone' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { lastPreferredContact: 'phone' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_preferred_contact: 'phone' }),
      );
    });

    it('deve mapear highestTier para highest_tier', async () => {
      const dbRow = createDbDeviceProfile({ highest_tier: 3 });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { highestTier: 3 as any });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ highest_tier: 3 }),
      );
    });

    it('deve mapear linkedCustomerId para linked_customer_id', async () => {
      const dbRow = createDbDeviceProfile({ linked_customer_id: 'cust-1' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { linkedCustomerId: 'cust-1' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ linked_customer_id: 'cust-1' }),
      );
    });

    it('deve mapear visitCount para visit_count', async () => {
      const dbRow = createDbDeviceProfile({ visit_count: 10 });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', { visitCount: 10 });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ visit_count: 10 }),
      );
    });

    it('deve sempre incluir last_seen_at mesmo sem outros campos', async () => {
      const dbRow = createDbDeviceProfile();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('device-1', {});

      expect(builder.update).toHaveBeenCalledWith({
        last_seen_at: expect.any(String),
      });
    });

    it('deve lançar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Update falhou' },
      });

      await expect(
        repository.update('device-1', { lastDisplayName: 'X' }),
      ).rejects.toThrow('Update falhou');
    });
  });

  // ---------------------------------------------------------------------------
  // upsert
  // ---------------------------------------------------------------------------
  describe('upsert', () => {
    it('deve fazer upsert com onConflict device_id', async () => {
      const dbRow = createDbDeviceProfile({ device_id: 'device-upsert' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.upsert({
        deviceId: 'device-upsert',
        lastDisplayName: 'Ana',
        lastFullName: 'Ana Lopes',
        lastEmail: 'ana@test.com',
        lastPhone: '+351777777777',
        lastBirthDate: '1995-03-10',
        lastPreferredContact: 'email',
        highestTier: 1,
      });

      expect(result.deviceId).toBe('device-upsert');
      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: 'device-upsert',
          last_display_name: 'Ana',
          last_full_name: 'Ana Lopes',
          last_email: 'ana@test.com',
          last_phone: '+351777777777',
          last_birth_date: '1995-03-10',
          last_preferred_contact: 'email',
          highest_tier: 1,
          last_seen_at: expect.any(String),
        }),
        { onConflict: 'device_id' },
      );
    });

    it('deve incluir linkedCustomerId quando fornecido', async () => {
      const dbRow = createDbDeviceProfile({ linked_customer_id: 'cust-linked' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.upsert({
        deviceId: 'device-1',
        linkedCustomerId: 'cust-linked',
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ linked_customer_id: 'cust-linked' }),
        { onConflict: 'device_id' },
      );
    });

    it('deve usar null para campos opcionais quando não fornecidos', async () => {
      const dbRow = createDbDeviceProfile({
        device_id: 'device-min',
        last_display_name: null,
        last_full_name: null,
        last_email: null,
        last_phone: null,
        last_birth_date: null,
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.upsert({ deviceId: 'device-min' });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: 'device-min',
          last_display_name: null,
          last_full_name: null,
          last_email: null,
          last_phone: null,
          last_birth_date: null,
          last_preferred_contact: 'email',
          highest_tier: 1,
        }),
        { onConflict: 'device_id' },
      );
    });

    it('deve lançar erro se upsert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Upsert falhou' },
      });

      await expect(
        repository.upsert({ deviceId: 'device-1' }),
      ).rejects.toThrow('Upsert falhou');
    });
  });

  // ---------------------------------------------------------------------------
  // incrementVisitCount
  // ---------------------------------------------------------------------------
  describe('incrementVisitCount', () => {
    it('deve ler contagem actual e incrementar em 1', async () => {
      // First call: findByDeviceId reads current profile
      const currentProfile = createDbDeviceProfile({ visit_count: 5 });
      const findBuilder = mockClient._newBuilder({ data: currentProfile, error: null });

      // We need to set up two sequential from() calls:
      // 1st: findByDeviceId (select + eq + single)
      // 2nd: update (update + eq + select + single)
      let callCount = 0;
      const updatedProfile = createDbDeviceProfile({ visit_count: 6 });
      const updateBuilder = mockClient._createBuilder({ data: updatedProfile, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return findBuilder;
        return updateBuilder;
      });

      const result = await repository.incrementVisitCount('device-abc-123');

      expect(result.visitCount).toBe(6);
      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ visit_count: 6 }),
      );
    });

    it('deve lançar erro se perfil não encontrado', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(
        repository.incrementVisitCount('inexistente'),
      ).rejects.toThrow('Device profile not found');
    });
  });

  // ---------------------------------------------------------------------------
  // mapToEntity (mapeamento de dados via findByDeviceId)
  // ---------------------------------------------------------------------------
  describe('mapToEntity', () => {
    it('deve mapear device_id para deviceId', async () => {
      const dbRow = createDbDeviceProfile({ device_id: 'dev-xyz' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('dev-xyz');

      expect(result?.deviceId).toBe('dev-xyz');
    });

    it('deve mapear linked_customer_id para linkedCustomerId', async () => {
      const dbRow = createDbDeviceProfile({ linked_customer_id: 'cust-123' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result?.linkedCustomerId).toBe('cust-123');
    });

    it('deve converter first_seen_at para Date', async () => {
      const dbRow = createDbDeviceProfile();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result?.firstSeenAt).toBeInstanceOf(Date);
    });

    it('deve converter last_seen_at para Date', async () => {
      const dbRow = createDbDeviceProfile();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result?.lastSeenAt).toBeInstanceOf(Date);
    });

    it('deve converter created_at para Date', async () => {
      const dbRow = createDbDeviceProfile();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it('deve converter updated_at para Date', async () => {
      const dbRow = createDbDeviceProfile();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('deve mapear campos nulos correctamente', async () => {
      const dbRow = createDbDeviceProfile({
        last_display_name: null,
        last_full_name: null,
        last_email: null,
        last_phone: null,
        last_birth_date: null,
        linked_customer_id: null,
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByDeviceId('device-abc-123');

      expect(result?.lastDisplayName).toBeNull();
      expect(result?.lastFullName).toBeNull();
      expect(result?.lastEmail).toBeNull();
      expect(result?.lastPhone).toBeNull();
      expect(result?.lastBirthDate).toBeNull();
      expect(result?.linkedCustomerId).toBeNull();
    });
  });
});
