import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseTableRepository } from '@/infrastructure/repositories/SupabaseTableRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

/**
 * Tests for SupabaseTableRepository
 *
 * Verifica mapeamento de dados, lógica de queries, queries compostas
 * (waiter, session) e contagem por status usando um cliente Supabase mockado.
 */

function createDbTable(overrides: Partial<any> = {}) {
  return {
    id: 'table-1',
    number: 1,
    name: 'Mesa 1',
    location: 'circunvalacao',
    status: 'available',
    is_active: true,
    current_session_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseTableRepository', () => {
  let repository: SupabaseTableRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseTableRepository(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('deve retornar mesa mapeada quando encontrada', async () => {
      const dbRow = createDbTable();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('table-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('table-1');
      expect(result!.number).toBe(1);
      expect(result!.name).toBe('Mesa 1');
      expect(result!.location).toBe('circunvalacao');
      expect(result!.status).toBe('available');
      expect(result!.isActive).toBe(true);
      expect(result!.currentSessionId).toBeNull();
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(mockClient.from).toHaveBeenCalledWith('tables');
    });

    it('deve retornar null quando mesa nao existe', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('deve mapear currentSessionId quando presente', async () => {
      const dbRow = createDbTable({ current_session_id: 'session-1' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('table-1');

      expect(result!.currentSessionId).toBe('session-1');
    });
  });

  // ---------------------------------------------------------------------------
  // findByNumber
  // ---------------------------------------------------------------------------
  describe('findByNumber', () => {
    it('deve buscar mesa por numero e localizacao', async () => {
      const dbRow = createDbTable({ number: 5, location: 'boavista' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.findByNumber(5, 'boavista');

      expect(result).not.toBeNull();
      expect(result!.number).toBe(5);
      expect(result!.location).toBe('boavista');
      expect(builder.eq).toHaveBeenCalledWith('number', 5);
      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve retornar null quando mesa nao existe', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findByNumber(99, 'circunvalacao');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByIdWithWaiter
  // ---------------------------------------------------------------------------
  describe('findByIdWithWaiter', () => {
    it('deve retornar mesa com empregado atribuido', async () => {
      const dbTable = createDbTable();
      const waiterAssignment = {
        staff: { id: 'staff-1', name: 'Carlos' },
      };

      let callCount = 0;
      const builder1 = mockClient._createBuilder({ data: dbTable, error: null });
      const builder2 = mockClient._createBuilder({ data: waiterAssignment, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return builder1;
        return builder2;
      });

      const result = await repository.findByIdWithWaiter('table-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('table-1');
      expect(result!.waiter).not.toBeNull();
      expect(result!.waiter!.id).toBe('staff-1');
      expect(result!.waiter!.name).toBe('Carlos');
    });

    it('deve retornar mesa com waiter null se nao atribuido', async () => {
      const dbTable = createDbTable();

      let callCount = 0;
      const builder1 = mockClient._createBuilder({ data: dbTable, error: null });
      const builder2 = mockClient._createBuilder({ data: null, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return builder1;
        return builder2;
      });

      const result = await repository.findByIdWithWaiter('table-1');

      expect(result).not.toBeNull();
      expect(result!.waiter).toBeNull();
    });

    it('deve retornar null quando mesa nao existe', async () => {
      mockClient._newBuilder({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findByIdWithWaiter('nonexistent');

      expect(result).toBeNull();
    });

    it('deve lidar com staff como array (join retorna array)', async () => {
      const dbTable = createDbTable();
      const waiterAssignment = {
        staff: [{ id: 'staff-1', name: 'Ana' }, { id: 'staff-2', name: 'Bruno' }],
      };

      let callCount = 0;
      const builder1 = mockClient._createBuilder({ data: dbTable, error: null });
      const builder2 = mockClient._createBuilder({ data: waiterAssignment, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return builder1;
        return builder2;
      });

      const result = await repository.findByIdWithWaiter('table-1');

      expect(result!.waiter).not.toBeNull();
      expect(result!.waiter!.id).toBe('staff-1');
      expect(result!.waiter!.name).toBe('Ana');
    });
  });

  // ---------------------------------------------------------------------------
  // findByIdWithSession
  // ---------------------------------------------------------------------------
  describe('findByIdWithSession', () => {
    it('deve retornar mesa com sessao ativa', async () => {
      const dbTable = createDbTable({ current_session_id: 'session-1' });
      const dbSession = {
        id: 'session-1',
        is_rodizio: true,
        num_people: 4,
        started_at: '2026-01-01T19:00:00.000Z',
        total_amount: 120.50,
      };

      let callCount = 0;
      const builder1 = mockClient._createBuilder({ data: dbTable, error: null });
      const builder2 = mockClient._createBuilder({ data: dbSession, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return builder1;
        return builder2;
      });

      const result = await repository.findByIdWithSession('table-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('table-1');
      expect(result!.activeSession).not.toBeNull();
      expect(result!.activeSession!.id).toBe('session-1');
      expect(result!.activeSession!.isRodizio).toBe(true);
      expect(result!.activeSession!.numPeople).toBe(4);
      expect(result!.activeSession!.startedAt).toBeInstanceOf(Date);
      expect(result!.activeSession!.totalAmount).toBe(120.50);
    });

    it('deve retornar mesa sem sessao quando current_session_id e null', async () => {
      const dbTable = createDbTable({ current_session_id: null });
      mockClient._newBuilder({ data: dbTable, error: null });

      const result = await repository.findByIdWithSession('table-1');

      expect(result).not.toBeNull();
      expect(result!.activeSession).toBeNull();
      // Deve fazer apenas uma query (tables), nao buscar sessions
      expect(mockClient.from).toHaveBeenCalledTimes(1);
      expect(mockClient.from).toHaveBeenCalledWith('tables');
    });

    it('deve retornar activeSession null se sessao nao encontrada', async () => {
      const dbTable = createDbTable({ current_session_id: 'session-orphan' });

      let callCount = 0;
      const builder1 = mockClient._createBuilder({ data: dbTable, error: null });
      const builder2 = mockClient._createBuilder({ data: null, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return builder1;
        return builder2;
      });

      const result = await repository.findByIdWithSession('table-1');

      expect(result).not.toBeNull();
      expect(result!.activeSession).toBeNull();
    });

    it('deve retornar null quando mesa nao existe', async () => {
      mockClient._newBuilder({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findByIdWithSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('deve retornar lista de mesas sem filtros', async () => {
      const dbRows = [
        createDbTable({ id: 'table-1', number: 1 }),
        createDbTable({ id: 'table-2', number: 2 }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('table-1');
      expect(result[1].id).toBe('table-2');
      expect(mockClient.from).toHaveBeenCalledWith('tables');
    });

    it('deve aplicar filtro de location', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ location: 'boavista' });

      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve aplicar filtro de status', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ status: 'occupied' });

      expect(builder.eq).toHaveBeenCalledWith('status', 'occupied');
    });

    it('deve aplicar filtro de isActive', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ isActive: true });

      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('deve aplicar filtro hasActiveSession=true com not is null', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ hasActiveSession: true });

      expect(builder.not).toHaveBeenCalledWith('current_session_id', 'is', null);
    });

    it('deve aplicar filtro hasActiveSession=false com is null', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ hasActiveSession: false });

      expect(builder.is).toHaveBeenCalledWith('current_session_id', null);
    });

    it('deve ordenar por number', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll();

      expect(builder.order).toHaveBeenCalledWith('number');
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      await expect(repository.findAll()).rejects.toThrow('DB Error');
    });

    it('deve retornar array vazio se data for null', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findByWaiter
  // ---------------------------------------------------------------------------
  describe('findByWaiter', () => {
    it('deve retornar mesas atribuidas ao empregado', async () => {
      const assignments = [
        { table_id: 'table-1' },
        { table_id: 'table-2' },
      ];
      const dbTable1 = createDbTable({ id: 'table-1', number: 1, current_session_id: null });
      const dbTable2 = createDbTable({ id: 'table-2', number: 2, current_session_id: null });

      let callCount = 0;
      const assignmentBuilder = mockClient._createBuilder({ data: assignments, error: null });
      const tableBuilder1 = mockClient._createBuilder({ data: dbTable1, error: null });
      const tableBuilder2 = mockClient._createBuilder({ data: dbTable2, error: null });

      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return assignmentBuilder;   // waiter_tables query
        if (callCount === 2) return tableBuilder1;        // findByIdWithSession - table 1
        if (callCount === 3) return tableBuilder2;        // findByIdWithSession - table 2
        return mockClient._createBuilder({ data: null, error: null });
      });

      const result = await repository.findByWaiter('waiter-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('table-1');
      expect(result[1].id).toBe('table-2');
    });

    it('deve retornar array vazio se empregado nao tem mesas', async () => {
      mockClient._newBuilder({ data: [], error: null });

      const result = await repository.findByWaiter('waiter-no-tables');

      expect(result).toEqual([]);
    });

    it('deve lancar erro se query de atribuicoes falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Assignment error' } });

      await expect(repository.findByWaiter('waiter-1')).rejects.toThrow('Assignment error');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('deve criar mesa com dados mapeados correctamente', async () => {
      const dbRow = createDbTable({ id: 'new-table', number: 10, name: 'Mesa 10' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        number: 10,
        name: 'Mesa 10',
        location: 'circunvalacao',
      });

      expect(result.id).toBe('new-table');
      expect(result.number).toBe(10);
      expect(builder.insert).toHaveBeenCalledWith({
        number: 10,
        name: 'Mesa 10',
        location: 'circunvalacao',
        is_active: true,
        status: 'available',
      });
      expect(mockClient.from).toHaveBeenCalledWith('tables');
    });

    it('deve respeitar isActive quando fornecido', async () => {
      const dbRow = createDbTable({ is_active: false });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        number: 1,
        name: 'Mesa 1',
        location: 'boavista',
        isActive: false,
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
    });

    it('deve usar status available por defeito', async () => {
      const dbRow = createDbTable();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        number: 1,
        name: 'Mesa 1',
        location: 'circunvalacao',
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'available' })
      );
    });

    it('deve lancar erro se insert falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Duplicate number' } });

      await expect(
        repository.create({ number: 1, name: 'Mesa 1', location: 'circunvalacao' })
      ).rejects.toThrow('Duplicate number');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('deve atualizar mesa com campos parciais', async () => {
      const dbRow = createDbTable({ name: 'Mesa VIP', status: 'reserved' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('table-1', { name: 'Mesa VIP', status: 'reserved' });

      expect(result.name).toBe('Mesa VIP');
      expect(builder.update).toHaveBeenCalledWith({
        name: 'Mesa VIP',
        status: 'reserved',
      });
    });

    it('deve mapear currentSessionId para current_session_id', async () => {
      const dbRow = createDbTable({ current_session_id: 'session-1' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('table-1', { currentSessionId: 'session-1' });

      expect(builder.update).toHaveBeenCalledWith({
        current_session_id: 'session-1',
      });
    });

    it('deve mapear isActive para is_active', async () => {
      const dbRow = createDbTable({ is_active: false });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('table-1', { isActive: false });

      expect(builder.update).toHaveBeenCalledWith({
        is_active: false,
      });
    });

    it('deve mapear todos os campos correctamente', async () => {
      const dbRow = createDbTable();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('table-1', {
        number: 5,
        name: 'Mesa 5',
        location: 'boavista',
        status: 'occupied',
        isActive: true,
        currentSessionId: 'session-x',
      });

      expect(builder.update).toHaveBeenCalledWith({
        number: 5,
        name: 'Mesa 5',
        location: 'boavista',
        status: 'occupied',
        is_active: true,
        current_session_id: 'session-x',
      });
    });

    it('nao deve incluir campos nao fornecidos', async () => {
      const dbRow = createDbTable();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('table-1', { name: 'Novo Nome' });

      expect(builder.update).toHaveBeenCalledWith({ name: 'Novo Nome' });
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Update failed' } });

      await expect(repository.update('table-1', { name: 'X' })).rejects.toThrow('Update failed');
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------
  describe('updateStatus', () => {
    it('deve atualizar status da mesa', async () => {
      const dbRow = createDbTable({ status: 'occupied' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.updateStatus('table-1', 'occupied');

      expect(result.status).toBe('occupied');
      expect(builder.update).toHaveBeenCalledWith({ status: 'occupied' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'table-1');
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._newBuilder({ data: null, error: { message: 'Status update failed' } });

      await expect(repository.updateStatus('table-1', 'available')).rejects.toThrow('Status update failed');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('deve eliminar mesa com sucesso', async () => {
      const builder = mockClient._newBuilder({ error: null });

      await repository.delete('table-1');

      expect(mockClient.from).toHaveBeenCalledWith('tables');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'table-1');
    });

    it('deve lancar erro se delete falhar', async () => {
      mockClient._newBuilder({ error: { message: 'FK constraint - sessions exist' } });

      await expect(repository.delete('table-1')).rejects.toThrow('FK constraint - sessions exist');
    });
  });

  // ---------------------------------------------------------------------------
  // countByStatus
  // ---------------------------------------------------------------------------
  describe('countByStatus', () => {
    it('deve contar mesas agrupadas por status', async () => {
      const dbRows = [
        { status: 'available' },
        { status: 'available' },
        { status: 'available' },
        { status: 'occupied' },
        { status: 'occupied' },
        { status: 'reserved' },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.countByStatus();

      expect(result.available).toBe(3);
      expect(result.occupied).toBe(2);
      expect(result.reserved).toBe(1);
      expect(result.inactive).toBe(0);
    });

    it('deve aplicar filtro de location', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.countByStatus('boavista');

      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve retornar zeros quando nao ha mesas', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.countByStatus();

      expect(result.available).toBe(0);
      expect(result.reserved).toBe(0);
      expect(result.occupied).toBe(0);
      expect(result.inactive).toBe(0);
    });

    it('deve lancar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Count error' } });

      await expect(repository.countByStatus()).rejects.toThrow('Count error');
    });
  });

  // ---------------------------------------------------------------------------
  // toDomain - mapeamento geral
  // ---------------------------------------------------------------------------
  describe('toDomain (mapeamento)', () => {
    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbTable({
        id: 'table-42',
        number: 7,
        name: 'Mesa 7',
        location: 'boavista',
        status: 'occupied',
        is_active: false,
        current_session_id: 'session-99',
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T12:00:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('table-42');

      expect(result).toEqual({
        id: 'table-42',
        number: 7,
        name: 'Mesa 7',
        location: 'boavista',
        status: 'occupied',
        isActive: false,
        currentSessionId: 'session-99',
        createdAt: new Date('2026-01-15T10:00:00.000Z'),
        updatedAt: new Date('2026-01-15T12:00:00.000Z'),
      });
    });

    it('deve usar createdAt como fallback para updatedAt quando ausente', async () => {
      const dbRow = createDbTable({
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: undefined,
      });
      // Remove updated_at to trigger fallback
      delete dbRow.updated_at;
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('table-1');

      expect(result!.updatedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });
  });
});
