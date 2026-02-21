import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseReservationRepository } from '@/infrastructure/repositories/SupabaseReservationRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Testes para SupabaseReservationRepository
 *
 * Verifica mapeamento de dados, lógica de queries e filtros.
 * Usa cliente Supabase mockado para testar sem dependências de BD.
 */

function createDbReservation(overrides: Partial<any> = {}) {
  return {
    id: 'res-1',
    first_name: 'João',
    last_name: 'Silva',
    email: 'joao@test.com',
    phone: '+351912345678',
    reservation_date: '2026-03-01',
    reservation_time: '19:30',
    party_size: 4,
    location: 'circunvalacao',
    table_id: null,
    is_rodizio: true,
    special_requests: null,
    occasion: null,
    status: 'pending',
    confirmed_by: null,
    confirmed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    session_id: null,
    seated_at: null,
    marketing_consent: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseReservationRepository', () => {
  let repository: SupabaseReservationRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseReservationRepository(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('deve retornar lista de reservas sem filtro', async () => {
      const dbRows = [
        createDbReservation({ id: 'res-1' }),
        createDbReservation({ id: 'res-2', first_name: 'Maria', last_name: 'Costa' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].customerName).toBe('João Silva');
      expect(result[1].customerName).toBe('Maria Costa');
      expect(mockClient.from).toHaveBeenCalledWith('reservations');
    });

    it('deve aplicar filtro de localização', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ location: 'boavista' });

      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve aplicar filtro de status', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ status: 'confirmed' });

      expect(builder.eq).toHaveBeenCalledWith('status', 'confirmed');
    });

    it('deve aplicar filtro de data exacta', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ date: '2026-03-01' });

      expect(builder.eq).toHaveBeenCalledWith('reservation_date', '2026-03-01');
    });

    it('deve aplicar filtro dateFrom', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ dateFrom: '2026-02-01' });

      expect(builder.gte).toHaveBeenCalledWith('reservation_date', '2026-02-01');
    });

    it('deve aplicar filtro dateTo', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ dateTo: '2026-04-30' });

      expect(builder.lte).toHaveBeenCalledWith('reservation_date', '2026-04-30');
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      await expect(repository.findAll()).rejects.toThrow('DB Error');
    });

    it('deve retornar array vazio quando data é null', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('deve retornar reserva por ID', async () => {
      const dbRow = createDbReservation({ id: 'res-1' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('res-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('res-1');
      expect(result?.firstName).toBe('João');
      expect(result?.lastName).toBe('Silva');
      expect(result?.reservationDate).toBe('2026-03-01');
      expect(result?.partySize).toBe(4);
      expect(mockClient.from).toHaveBeenCalledWith('reservations');
    });

    it('deve retornar null com código PGRST116', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await repository.findById('inexistente');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Erro inesperado' },
      });

      await expect(repository.findById('res-1')).rejects.toThrow('Erro inesperado');
    });
  });

  // ---------------------------------------------------------------------------
  // findByDate
  // ---------------------------------------------------------------------------
  describe('findByDate', () => {
    it('deve retornar reservas por data sem localização', async () => {
      const dbRows = [createDbReservation({ reservation_time: '19:00' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findByDate('2026-03-01');

      expect(result).toHaveLength(1);
      expect(result[0].reservationTime).toBe('19:00');
      const builder = mockClient._getBuilder();
      expect(builder.eq).toHaveBeenCalledWith('reservation_date', '2026-03-01');
    });

    it('deve aplicar filtro de localização quando fornecido', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findByDate('2026-03-01', 'boavista');

      expect(builder.eq).toHaveBeenCalledWith('reservation_date', '2026-03-01');
      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Falha na BD' } });

      await expect(repository.findByDate('2026-03-01')).rejects.toThrow('Falha na BD');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('deve criar reserva com mapeamento camelCase para snake_case', async () => {
      const dbRow = createDbReservation({ id: 'res-new' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@test.com',
        phone: '+351912345678',
        reservationDate: '2026-03-01',
        reservationTime: '19:30',
        partySize: 4,
        location: 'circunvalacao',
      });

      expect(result.id).toBe('res-new');
      expect(builder.insert).toHaveBeenCalledWith({
        first_name: 'João',
        last_name: 'Silva',
        email: 'joao@test.com',
        phone: '+351912345678',
        reservation_date: '2026-03-01',
        reservation_time: '19:30',
        party_size: 4,
        location: 'circunvalacao',
        is_rodizio: true,
        special_requests: null,
        occasion: null,
        marketing_consent: false,
        status: 'pending',
      });
    });

    it('deve usar isRodizio=true como valor por defeito', async () => {
      const dbRow = createDbReservation({ is_rodizio: true });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        firstName: 'Ana',
        lastName: 'Lopes',
        email: 'ana@test.com',
        phone: '+351999999999',
        reservationDate: '2026-03-05',
        reservationTime: '20:00',
        partySize: 2,
        location: 'boavista',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_rodizio: true, status: 'pending' }),
      );
    });

    it('deve respeitar isRodizio=false quando fornecido', async () => {
      const dbRow = createDbReservation({ is_rodizio: false });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        firstName: 'Pedro',
        lastName: 'Costa',
        email: 'pedro@test.com',
        phone: '+351888888888',
        reservationDate: '2026-03-10',
        reservationTime: '21:00',
        partySize: 6,
        location: 'circunvalacao',
        isRodizio: false,
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_rodizio: false }),
      );
    });

    it('deve lançar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Violação de constraint' },
      });

      await expect(
        repository.create({
          firstName: 'Teste',
          lastName: 'Erro',
          email: 'teste@test.com',
          phone: '+351000000000',
          reservationDate: '2026-03-01',
          reservationTime: '19:00',
          partySize: 2,
          location: 'circunvalacao',
        }),
      ).rejects.toThrow('Violação de constraint');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('deve atualizar campos parciais', async () => {
      const dbRow = createDbReservation({ status: 'confirmed' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('res-1', { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
      expect(builder.update).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'res-1');
    });

    it('deve mapear tableId para table_id', async () => {
      const dbRow = createDbReservation({ table_id: 5 });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('res-1', { tableId: 5 });

      expect(builder.update).toHaveBeenCalledWith({ table_id: 5 });
    });

    it('deve mapear confirmedBy para confirmed_by', async () => {
      const dbRow = createDbReservation({ confirmed_by: 'staff-1' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('res-1', { confirmedBy: 'staff-1' });

      expect(builder.update).toHaveBeenCalledWith({ confirmed_by: 'staff-1' });
    });

    it('deve mapear cancellationReason para cancellation_reason', async () => {
      const dbRow = createDbReservation({ cancellation_reason: 'Cliente cancelou' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('res-1', { cancellationReason: 'Cliente cancelou' });

      expect(builder.update).toHaveBeenCalledWith({ cancellation_reason: 'Cliente cancelou' });
    });

    it('deve mapear sessionId para session_id', async () => {
      const dbRow = createDbReservation({ session_id: 'session-abc' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('res-1', { sessionId: 'session-abc' });

      expect(builder.update).toHaveBeenCalledWith({ session_id: 'session-abc' });
    });

    it('deve lançar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Update falhou' },
      });

      await expect(repository.update('res-1', { status: 'confirmed' })).rejects.toThrow(
        'Update falhou',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('deve eliminar reserva por ID', async () => {
      const builder = mockClient._newBuilder({ error: null });

      await repository.delete('res-1');

      expect(mockClient.from).toHaveBeenCalledWith('reservations');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'res-1');
    });

    it('deve lançar erro se delete falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ error: { message: 'FK constraint' } });

      await expect(repository.delete('res-1')).rejects.toThrow('FK constraint');
    });
  });

  // ---------------------------------------------------------------------------
  // confirm
  // ---------------------------------------------------------------------------
  describe('confirm', () => {
    it('deve confirmar reserva com status, confirmed_by e confirmed_at', async () => {
      const dbRow = createDbReservation({
        status: 'confirmed',
        confirmed_by: 'staff-1',
        confirmed_at: '2026-02-20T12:00:00.000Z',
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.confirm('res-1', 'staff-1');

      expect(result.status).toBe('confirmed');
      expect(result.confirmedBy).toBe('staff-1');
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          confirmed_by: 'staff-1',
          confirmed_at: expect.any(String),
        }),
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'res-1');
    });

    it('deve lançar erro se confirmação falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Falha ao confirmar' },
      });

      await expect(repository.confirm('res-1', 'staff-1')).rejects.toThrow('Falha ao confirmar');
    });
  });

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------
  describe('cancel', () => {
    it('deve cancelar reserva com status, cancelled_at e cancellation_reason', async () => {
      const dbRow = createDbReservation({
        status: 'cancelled',
        cancelled_at: '2026-02-20T12:00:00.000Z',
        cancellation_reason: 'Mudança de planos',
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.cancel('res-1', 'Mudança de planos');

      expect(result.status).toBe('cancelled');
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          cancelled_at: expect.any(String),
          cancellation_reason: 'Mudança de planos',
        }),
      );
    });

    it('deve cancelar sem motivo (null)', async () => {
      const dbRow = createDbReservation({
        status: 'cancelled',
        cancelled_at: '2026-02-20T12:00:00.000Z',
        cancellation_reason: null,
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.cancel('res-1');

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellation_reason: null,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // markAsSeated
  // ---------------------------------------------------------------------------
  describe('markAsSeated', () => {
    it('deve marcar como seated com status=completed, session_id e seated_at', async () => {
      const dbRow = createDbReservation({
        status: 'completed',
        session_id: 'session-1',
        seated_at: '2026-02-20T19:30:00.000Z',
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.markAsSeated('res-1', 'session-1');

      expect(result.status).toBe('completed');
      expect(result.sessionId).toBe('session-1');
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          session_id: 'session-1',
          seated_at: expect.any(String),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // markAsNoShow
  // ---------------------------------------------------------------------------
  describe('markAsNoShow', () => {
    it('deve marcar como no_show', async () => {
      const dbRow = createDbReservation({ status: 'no_show' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.markAsNoShow('res-1');

      expect(result.status).toBe('no_show');
      expect(builder.update).toHaveBeenCalledWith({ status: 'no_show' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'res-1');
    });
  });

  // ---------------------------------------------------------------------------
  // markAsCompleted
  // ---------------------------------------------------------------------------
  describe('markAsCompleted', () => {
    it('deve marcar como completed', async () => {
      const dbRow = createDbReservation({ status: 'completed' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.markAsCompleted('res-1');

      expect(result.status).toBe('completed');
      expect(builder.update).toHaveBeenCalledWith({ status: 'completed' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'res-1');
    });
  });

  // ---------------------------------------------------------------------------
  // mapToDetails (via findAll)
  // ---------------------------------------------------------------------------
  describe('mapToDetails', () => {
    it('deve construir customerName a partir de firstName + lastName', async () => {
      const dbRows = [
        createDbReservation({ first_name: 'Ana', last_name: 'Lopes' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].customerName).toBe('Ana Lopes');
    });

    it('deve mapear statusLabel para Pendente', async () => {
      const dbRows = [createDbReservation({ status: 'pending' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].statusLabel).toBe('Pendente');
    });

    it('deve mapear statusLabel para Confirmada', async () => {
      const dbRows = [createDbReservation({ status: 'confirmed' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].statusLabel).toBe('Confirmada');
    });

    it('deve mapear statusLabel para Cancelada', async () => {
      const dbRows = [createDbReservation({ status: 'cancelled' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].statusLabel).toBe('Cancelada');
    });

    it('deve mapear statusLabel para Concluída', async () => {
      const dbRows = [createDbReservation({ status: 'completed' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].statusLabel).toBe('Concluída');
    });

    it('deve mapear statusLabel para Não compareceu', async () => {
      const dbRows = [createDbReservation({ status: 'no_show' })];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].statusLabel).toBe('Não compareceu');
    });

    it('deve definir tableNumber e tableName como null', async () => {
      const dbRows = [createDbReservation()];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].tableNumber).toBeNull();
      expect(result[0].tableName).toBeNull();
      expect(result[0].confirmedByName).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // mapToEntity (via findById)
  // ---------------------------------------------------------------------------
  describe('mapToEntity', () => {
    it('deve mapear snake_case para camelCase correctamente', async () => {
      const dbRow = createDbReservation({
        confirmed_at: '2026-02-15T10:00:00.000Z',
        cancelled_at: '2026-02-16T11:00:00.000Z',
        seated_at: '2026-02-17T19:00:00.000Z',
        special_requests: 'Sem wasabi',
        is_rodizio: false,
        marketing_consent: true,
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('res-1');

      expect(result?.firstName).toBe('João');
      expect(result?.lastName).toBe('Silva');
      expect(result?.reservationDate).toBe('2026-03-01');
      expect(result?.reservationTime).toBe('19:30');
      expect(result?.partySize).toBe(4);
      expect(result?.isRodizio).toBe(false);
      expect(result?.specialRequests).toBe('Sem wasabi');
      expect(result?.marketingConsent).toBe(true);
      expect(result?.confirmedAt).toBeInstanceOf(Date);
      expect(result?.cancelledAt).toBeInstanceOf(Date);
      expect(result?.seatedAt).toBeInstanceOf(Date);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('deve mapear datas nulas como null', async () => {
      const dbRow = createDbReservation({
        confirmed_at: null,
        cancelled_at: null,
        seated_at: null,
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('res-1');

      expect(result?.confirmedAt).toBeNull();
      expect(result?.cancelledAt).toBeNull();
      expect(result?.seatedAt).toBeNull();
    });
  });
});
