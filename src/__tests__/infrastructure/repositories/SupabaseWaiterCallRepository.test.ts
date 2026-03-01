import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseWaiterCallRepository } from '@/infrastructure/repositories/SupabaseWaiterCallRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Testes para SupabaseWaiterCallRepository
 *
 * Verifica mapeamento de dados, lógica de queries com filtros,
 * uso da view waiter_calls_with_details e operações de estado.
 * Usa cliente Supabase mockado.
 */

function createDbWaiterCall(overrides: Partial<any> = {}) {
  return {
    id: 'call-1',
    table_id: 'table-1',
    session_id: 'session-1',
    session_customer_id: null,
    call_type: 'assistance',
    message: null,
    status: 'pending',
    acknowledged_by: null,
    acknowledged_at: null,
    completed_at: null,
    location: 'circunvalacao',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createDbWaiterCallWithDetails(overrides: Partial<any> = {}) {
  return {
    ...createDbWaiterCall(),
    table_number: 1,
    table_name: 'Mesa 1',
    customer_name: null,
    acknowledged_by_name: null,
    assigned_waiter_name: null,
    assigned_waiter_id: null,
    ...overrides,
  };
}

describe('SupabaseWaiterCallRepository', () => {
  let repository: SupabaseWaiterCallRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseWaiterCallRepository(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('deve retornar lista de chamadas sem filtro (usando view)', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({ id: 'call-1', table_number: 1 }),
        createDbWaiterCallWithDetails({ id: 'call-2', table_number: 3, table_name: 'Mesa 3' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].tableNumber).toBe(1);
      expect(result[1].tableNumber).toBe(3);
      expect(mockClient.from).toHaveBeenCalledWith('waiter_calls_with_details');
    });

    it('deve aplicar filtro de localização', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ location: 'boavista' });

      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve aplicar filtro de status', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ status: 'acknowledged' });

      expect(builder.eq).toHaveBeenCalledWith('status', 'acknowledged');
    });

    it('deve aplicar filtro de tableId', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ tableId: 'table-5' });

      expect(builder.eq).toHaveBeenCalledWith('table_id', 'table-5');
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Erro na BD' } });

      await expect(repository.findAll()).rejects.toThrow('Erro na BD');
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
    it('deve retornar chamada por ID (usando tabela waiter_calls)', async () => {
      const dbRow = createDbWaiterCall({ id: 'call-1' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('call-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('call-1');
      expect(result?.tableId).toBe('table-1');
      expect(result?.callType).toBe('assistance');
      expect(result?.status).toBe('pending');
      expect(mockClient.from).toHaveBeenCalledWith('waiter_calls');
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

      await expect(repository.findById('call-1')).rejects.toThrow('Erro inesperado');
    });
  });

  // ---------------------------------------------------------------------------
  // findPending
  // ---------------------------------------------------------------------------
  describe('findPending', () => {
    it('deve retornar chamadas pendentes e acknowledged (usando view)', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({ id: 'call-1', status: 'pending' }),
        createDbWaiterCallWithDetails({ id: 'call-2', status: 'acknowledged' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findPending();

      expect(result).toHaveLength(2);
      expect(mockClient.from).toHaveBeenCalledWith('waiter_calls_with_details');
      const builder = mockClient._getBuilder();
      expect(builder.in).toHaveBeenCalledWith('status', ['pending', 'acknowledged']);
    });

    it('deve aplicar filtro de localização quando fornecido', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findPending('circunvalacao');

      expect(builder.eq).toHaveBeenCalledWith('location', 'circunvalacao');
      expect(builder.in).toHaveBeenCalledWith('status', ['pending', 'acknowledged']);
    });

    it('deve não aplicar filtro de localização quando não fornecido', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findPending();

      expect(builder.in).toHaveBeenCalledWith('status', ['pending', 'acknowledged']);
      // eq should only be called by the chain, not with 'location'
      // Since findPending doesn't call eq when no location, we check eq wasn't called
      // But the builder always returns itself, so we check the call args
      const eqCalls = builder.eq.mock.calls;
      const locationCall = eqCalls.find((call: any[]) => call[0] === 'location');
      expect(locationCall).toBeUndefined();
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Falha' } });

      await expect(repository.findPending()).rejects.toThrow('Falha');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('deve criar chamada com mapeamento de campos', async () => {
      const dbRow = createDbWaiterCall({ id: 'call-new' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        tableId: 'table-1',
        sessionId: 'session-1',
        sessionCustomerId: 'cust-1',
        callType: 'bill',
        message: 'Conta por favor',
        location: 'circunvalacao',
      });

      expect(result.id).toBe('call-new');
      expect(mockClient.from).toHaveBeenCalledWith('waiter_calls');
      expect(builder.insert).toHaveBeenCalledWith({
        table_id: 'table-1',
        session_id: 'session-1',
        session_customer_id: 'cust-1',
        call_type: 'bill',
        message: 'Conta por favor',
        location: 'circunvalacao',
        status: 'pending',
      });
    });

    it('deve usar callType=assistance como valor por defeito', async () => {
      const dbRow = createDbWaiterCall({ call_type: 'assistance' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        tableId: 'table-2',
        location: 'boavista',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          call_type: 'assistance',
          status: 'pending',
        }),
      );
    });

    it('deve usar null para campos opcionais quando não fornecidos', async () => {
      const dbRow = createDbWaiterCall();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        tableId: 'table-1',
        location: 'circunvalacao',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: null,
          session_customer_id: null,
          message: null,
        }),
      );
    });

    it('deve lançar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Insert falhou' },
      });

      await expect(
        repository.create({ tableId: 'table-1', location: 'circunvalacao' }),
      ).rejects.toThrow('Insert falhou');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('deve atualizar status', async () => {
      const dbRow = createDbWaiterCall({ status: 'acknowledged' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('call-1', { status: 'acknowledged' });

      expect(result.status).toBe('acknowledged');
      expect(builder.update).toHaveBeenCalledWith({ status: 'acknowledged' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'call-1');
    });

    it('deve mapear acknowledgedBy para acknowledged_by', async () => {
      const dbRow = createDbWaiterCall({ acknowledged_by: 'staff-1' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('call-1', { acknowledgedBy: 'staff-1' });

      expect(builder.update).toHaveBeenCalledWith({ acknowledged_by: 'staff-1' });
    });

    it('deve atualizar message', async () => {
      const dbRow = createDbWaiterCall({ message: 'Atualizado' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('call-1', { message: 'Atualizado' });

      expect(builder.update).toHaveBeenCalledWith({ message: 'Atualizado' });
    });

    it('deve lançar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Update falhou' },
      });

      await expect(repository.update('call-1', { status: 'completed' })).rejects.toThrow(
        'Update falhou',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // acknowledge
  // ---------------------------------------------------------------------------
  describe('acknowledge', () => {
    it('deve definir status=acknowledged, acknowledged_by e acknowledged_at', async () => {
      const dbRow = createDbWaiterCall({
        status: 'acknowledged',
        acknowledged_by: 'staff-1',
        acknowledged_at: '2026-02-20T12:00:00.000Z',
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.acknowledge('call-1', 'staff-1');

      expect(result.status).toBe('acknowledged');
      expect(result.acknowledgedBy).toBe('staff-1');
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'acknowledged',
          acknowledged_by: 'staff-1',
          acknowledged_at: expect.any(String),
        }),
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'call-1');
    });

    it('deve lançar erro se acknowledge falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Falha ao acknowledger' },
      });

      await expect(repository.acknowledge('call-1', 'staff-1')).rejects.toThrow(
        'Falha ao acknowledger',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // complete
  // ---------------------------------------------------------------------------
  describe('complete', () => {
    it('deve definir status=completed e completed_at', async () => {
      const dbRow = createDbWaiterCall({
        status: 'completed',
        completed_at: '2026-02-20T12:05:00.000Z',
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.complete('call-1');

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(String),
        }),
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'call-1');
    });

    it('deve lançar erro se complete falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Falha ao completar' },
      });

      await expect(repository.complete('call-1')).rejects.toThrow('Falha ao completar');
    });
  });

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------
  describe('cancel', () => {
    it('deve definir status=cancelled', async () => {
      const dbRow = createDbWaiterCall({ status: 'cancelled' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.cancel('call-1');

      expect(result.status).toBe('cancelled');
      expect(builder.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'call-1');
    });

    it('deve lançar erro se cancel falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Falha ao cancelar' },
      });

      await expect(repository.cancel('call-1')).rejects.toThrow('Falha ao cancelar');
    });
  });

  // ---------------------------------------------------------------------------
  // mapToDetails
  // ---------------------------------------------------------------------------
  describe('mapToDetails', () => {
    it('deve incluir tableNumber e tableName da view', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({ table_number: 5, table_name: 'Mesa 5' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].tableNumber).toBe(5);
      expect(result[0].tableName).toBe('Mesa 5');
    });

    it('deve incluir customerName quando presente', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({ customer_name: 'João Silva' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].customerName).toBe('João Silva');
    });

    it('deve incluir customerName como null quando ausente', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({ customer_name: null }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].customerName).toBeNull();
    });

    it('deve incluir acknowledgedByName da view', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({ acknowledged_by_name: 'Admin User' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].acknowledgedByName).toBe('Admin User');
    });

    it('deve incluir assignedWaiterName e assignedWaiterId', async () => {
      const dbRows = [
        createDbWaiterCallWithDetails({
          assigned_waiter_name: 'Waiter Maria',
          assigned_waiter_id: 'staff-3',
        }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].assignedWaiterName).toBe('Waiter Maria');
      expect(result[0].assignedWaiterId).toBe('staff-3');
    });
  });

  // ---------------------------------------------------------------------------
  // mapToEntity (via findById)
  // ---------------------------------------------------------------------------
  describe('mapToEntity', () => {
    it('deve mapear snake_case para camelCase correctamente', async () => {
      const dbRow = createDbWaiterCall({
        table_id: 'table-5',
        session_id: 'session-abc',
        session_customer_id: 'cust-xyz',
        call_type: 'bill',
        acknowledged_by: 'staff-2',
        acknowledged_at: '2026-02-20T10:00:00.000Z',
        completed_at: '2026-02-20T10:05:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('call-1');

      expect(result?.tableId).toBe('table-5');
      expect(result?.sessionId).toBe('session-abc');
      expect(result?.sessionCustomerId).toBe('cust-xyz');
      expect(result?.callType).toBe('bill');
      expect(result?.acknowledgedBy).toBe('staff-2');
      expect(result?.acknowledgedAt).toBeInstanceOf(Date);
      expect(result?.completedAt).toBeInstanceOf(Date);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('deve mapear datas nulas como null', async () => {
      const dbRow = createDbWaiterCall({
        acknowledged_at: null,
        completed_at: null,
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('call-1');

      expect(result?.acknowledgedAt).toBeNull();
      expect(result?.completedAt).toBeNull();
    });

    it('deve mapear sessionCustomerId como null quando ausente', async () => {
      const dbRow = createDbWaiterCall({ session_customer_id: null });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('call-1');

      expect(result?.sessionCustomerId).toBeNull();
    });
  });
});
