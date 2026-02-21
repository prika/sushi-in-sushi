import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStaffRepository } from '@/infrastructure/repositories/SupabaseStaffRepository';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

/**
 * Testes para SupabaseStaffRepository
 *
 * Verifica mapeamento de dados, queries com filtros, hashing de password e
 * gestão de atribuições de mesas. Usa cliente Supabase mockado.
 */

function createDbStaff(overrides: Partial<any> = {}) {
  return {
    id: 'staff-1',
    email: 'admin@test.com',
    name: 'Admin User',
    password_hash: 'hashed-pw',
    role_id: 1,
    location: 'circunvalacao',
    phone: null,
    is_active: true,
    last_login: null,
    created_at: '2026-01-01T00:00:00.000Z',
    roles: { id: 1, name: 'admin', description: 'Administrator' },
    ...overrides,
  };
}

describe('SupabaseStaffRepository', () => {
  let repository: SupabaseStaffRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    repository = new SupabaseStaffRepository(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('deve retornar lista de staff sem filtro', async () => {
      const dbRows = [
        createDbStaff({ id: 'staff-1', name: 'Admin User' }),
        createDbStaff({ id: 'staff-2', name: 'Chef', role_id: 2, roles: { id: 2, name: 'kitchen', description: 'Kitchen' } }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Admin User');
      expect(result[0].role.name).toBe('admin');
      expect(result[1].role.name).toBe('kitchen');
      expect(mockClient.from).toHaveBeenCalledWith('staff');
    });

    it('deve aplicar filtro de roleId', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ roleId: 3 });

      expect(builder.eq).toHaveBeenCalledWith('role_id', 3);
    });

    it('deve aplicar filtro de localização', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ location: 'boavista' });

      expect(builder.eq).toHaveBeenCalledWith('location', 'boavista');
    });

    it('deve aplicar filtro de isActive', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ isActive: false });

      expect(builder.eq).toHaveBeenCalledWith('is_active', false);
    });

    it('deve aplicar filtro de pesquisa', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ search: 'admin' });

      expect(builder.or).toHaveBeenCalledWith('name.ilike.%admin%,email.ilike.%admin%');
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
    it('deve retornar staff por ID com role', async () => {
      const dbRow = createDbStaff({ id: 'staff-1' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('staff-1');
      expect(result?.email).toBe('admin@test.com');
      expect(result?.passwordHash).toBe('hashed-pw');
      expect(result?.roleId).toBe(1);
      expect(result?.role).toEqual({ id: 1, name: 'admin', description: 'Administrator' });
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

      await expect(repository.findById('staff-1')).rejects.toThrow('Erro inesperado');
    });
  });

  // ---------------------------------------------------------------------------
  // findByEmail
  // ---------------------------------------------------------------------------
  describe('findByEmail', () => {
    it('deve retornar staff por email', async () => {
      const dbRow = createDbStaff({ email: 'chef@test.com', name: 'Chef' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByEmail('chef@test.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('chef@test.com');
      expect(result?.name).toBe('Chef');
    });

    it('deve retornar null com código PGRST116', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await repository.findByEmail('nao-existe@test.com');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Erro de BD' },
      });

      await expect(repository.findByEmail('test@test.com')).rejects.toThrow('Erro de BD');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('deve criar staff com password hashed via bcrypt', async () => {
      const dbRow = createDbStaff({ id: 'staff-new', password_hash: 'hashed-password' });
      // Remove roles since create returns mapToStaff (without role join)
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      const result = await repository.create({
        email: 'novo@test.com',
        name: 'Novo Staff',
        password: 'senha-segura',
        roleId: 3,
        location: 'boavista',
        phone: '+351911111111',
      });

      const bcrypt = (await import('bcryptjs')).default;
      expect(bcrypt.hash).toHaveBeenCalledWith('senha-segura', 10);

      expect(builder.insert).toHaveBeenCalledWith({
        email: 'novo@test.com',
        name: 'Novo Staff',
        password_hash: 'hashed-password',
        role_id: 3,
        location: 'boavista',
        phone: '+351911111111',
      });

      expect(result.id).toBe('staff-new');
    });

    it('deve mapear roleId para role_id', async () => {
      const dbRow = createDbStaff({ role_id: 2 });
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      await repository.create({
        email: 'kitchen@test.com',
        name: 'Kitchen Staff',
        password: 'pw',
        roleId: 2,
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ role_id: 2 }),
      );
    });

    it('deve usar null para location e phone quando não fornecidos', async () => {
      const dbRow = createDbStaff({ location: null, phone: null });
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      await repository.create({
        email: 'test@test.com',
        name: 'Test',
        password: 'pw',
        roleId: 1,
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ location: null, phone: null }),
      );
    });

    it('deve lançar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Email duplicado' },
      });

      await expect(
        repository.create({
          email: 'dup@test.com',
          name: 'Dup',
          password: 'pw',
          roleId: 1,
        }),
      ).rejects.toThrow('Email duplicado');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('deve atualizar campos parciais', async () => {
      const dbRow = createDbStaff({ name: 'Nome Atualizado' });
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      const result = await repository.update('staff-1', { name: 'Nome Atualizado' });

      expect(result.name).toBe('Nome Atualizado');
      expect(builder.update).toHaveBeenCalledWith({ name: 'Nome Atualizado' });
      expect(builder.eq).toHaveBeenCalledWith('id', 'staff-1');
    });

    it('deve fazer hash da password quando fornecida', async () => {
      const dbRow = createDbStaff({ password_hash: 'hashed-password' });
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      await repository.update('staff-1', { password: 'nova-senha' });

      const bcrypt = (await import('bcryptjs')).default;
      expect(bcrypt.hash).toHaveBeenCalledWith('nova-senha', 10);
      expect(builder.update).toHaveBeenCalledWith({ password_hash: 'hashed-password' });
    });

    it('deve mapear isActive para is_active', async () => {
      const dbRow = createDbStaff({ is_active: false });
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      await repository.update('staff-1', { isActive: false });

      expect(builder.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('deve mapear roleId para role_id', async () => {
      const dbRow = createDbStaff({ role_id: 2 });
      const { roles, ...dbRowWithoutRoles } = dbRow;
      const builder = mockClient._newBuilder({ data: dbRowWithoutRoles, error: null });

      await repository.update('staff-1', { roleId: 2 });

      expect(builder.update).toHaveBeenCalledWith({ role_id: 2 });
    });

    it('deve lançar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Update falhou' },
      });

      await expect(repository.update('staff-1', { name: 'X' })).rejects.toThrow('Update falhou');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('deve eliminar staff por ID', async () => {
      const builder = mockClient._newBuilder({ error: null });

      await repository.delete('staff-1');

      expect(mockClient.from).toHaveBeenCalledWith('staff');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'staff-1');
    });

    it('deve lançar erro se delete falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ error: { message: 'FK constraint' } });

      await expect(repository.delete('staff-1')).rejects.toThrow('FK constraint');
    });
  });

  // ---------------------------------------------------------------------------
  // getAllRoles
  // ---------------------------------------------------------------------------
  describe('getAllRoles', () => {
    it('deve retornar lista de roles com name e description', async () => {
      const dbRoles = [
        { id: 1, name: 'admin', description: 'Administrator' },
        { id: 2, name: 'kitchen', description: 'Kitchen staff' },
        { id: 3, name: 'waiter', description: null },
        { id: 4, name: 'customer', description: 'Customer' },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRoles, error: null });

      const result = await repository.getAllRoles();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ id: 1, name: 'admin', description: 'Administrator' });
      expect(result[2].description).toBe(''); // null -> ''
      expect(mockClient.from).toHaveBeenCalledWith('roles');
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Roles query failed' },
      });

      await expect(repository.getAllRoles()).rejects.toThrow('Roles query failed');
    });

    it('deve retornar array vazio quando data é null', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.getAllRoles();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // assignTables
  // ---------------------------------------------------------------------------
  describe('assignTables', () => {
    it('deve remover atribuições antigas e inserir novas', async () => {
      // First call: delete old assignments
      const deleteBuilder = mockClient._newBuilder({ error: null });

      // We need to track both from() calls
      let fromCallCount = 0;
      const insertBuilder = mockClient._createBuilder({ error: null });

      mockClient.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount <= 1) {
          return deleteBuilder;
        }
        return insertBuilder;
      });

      await repository.assignTables('staff-1', ['table-1', 'table-2']);

      expect(mockClient.from).toHaveBeenCalledWith('waiter_tables');
      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledWith('staff_id', 'staff-1');
      expect(insertBuilder.insert).toHaveBeenCalledWith([
        { staff_id: 'staff-1', table_id: 'table-1' },
        { staff_id: 'staff-1', table_id: 'table-2' },
      ]);
    });

    it('deve apenas remover atribuições quando lista vazia', async () => {
      const deleteBuilder = mockClient._newBuilder({ error: null });

      await repository.assignTables('staff-1', []);

      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledWith('staff_id', 'staff-1');
      // from() should only be called once (delete), not twice (no insert)
      expect(mockClient.from).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro se insert falhar', async () => {
      let fromCallCount = 0;
      const deleteBuilder = mockClient._createBuilder({ error: null });
      const insertBuilder = mockClient._createBuilder({ error: { message: 'Insert falhou' } });

      mockClient.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount <= 1) return deleteBuilder;
        return insertBuilder;
      });

      await expect(repository.assignTables('staff-1', ['table-1'])).rejects.toThrow('Insert falhou');
    });
  });

  // ---------------------------------------------------------------------------
  // getAssignedTables
  // ---------------------------------------------------------------------------
  describe('getAssignedTables', () => {
    it('deve retornar array de table_id', async () => {
      const dbData = [
        { table_id: 'table-1' },
        { table_id: 'table-2' },
        { table_id: 'table-3' },
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbData, error: null });

      const result = await repository.getAssignedTables('staff-1');

      expect(result).toEqual(['table-1', 'table-2', 'table-3']);
      expect(mockClient.from).toHaveBeenCalledWith('waiter_tables');
    });

    it('deve retornar array vazio quando sem atribuições', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.getAssignedTables('staff-1');

      expect(result).toEqual([]);
    });

    it('deve lançar erro se query falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Query falhou' },
      });

      await expect(repository.getAssignedTables('staff-1')).rejects.toThrow('Query falhou');
    });
  });

  // ---------------------------------------------------------------------------
  // addTableAssignment
  // ---------------------------------------------------------------------------
  describe('addTableAssignment', () => {
    it('deve fazer upsert de atribuição', async () => {
      const builder = mockClient._newBuilder({ error: null });

      await repository.addTableAssignment('staff-1', 'table-5');

      expect(mockClient.from).toHaveBeenCalledWith('waiter_tables');
      expect(builder.upsert).toHaveBeenCalledWith(
        { staff_id: 'staff-1', table_id: 'table-5' },
        { onConflict: 'staff_id,table_id' },
      );
    });

    it('deve lançar erro se upsert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({ error: { message: 'Upsert falhou' } });

      await expect(repository.addTableAssignment('staff-1', 'table-5')).rejects.toThrow(
        'Upsert falhou',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // mapToEntity (mapeamento de dados)
  // ---------------------------------------------------------------------------
  describe('mapToEntity', () => {
    it('deve mapear password_hash para passwordHash', async () => {
      const dbRow = createDbStaff({ password_hash: 'secret-hash' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.passwordHash).toBe('secret-hash');
    });

    it('deve mapear role_id para roleId', async () => {
      const dbRow = createDbStaff({ role_id: 3 });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.roleId).toBe(3);
    });

    it('deve mapear is_active para isActive', async () => {
      const dbRow = createDbStaff({ is_active: false });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.isActive).toBe(false);
    });

    it('deve converter last_login para Date quando presente', async () => {
      const dbRow = createDbStaff({ last_login: '2026-02-20T10:00:00.000Z' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.lastLogin).toBeInstanceOf(Date);
    });

    it('deve manter last_login como null quando ausente', async () => {
      const dbRow = createDbStaff({ last_login: null });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.lastLogin).toBeNull();
    });

    it('deve converter created_at para Date', async () => {
      const dbRow = createDbStaff();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it('deve incluir dados da role no resultado', async () => {
      const dbRow = createDbStaff({
        roles: { id: 3, name: 'waiter', description: 'Empregado de mesa' },
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('staff-1');

      expect(result?.role).toEqual({
        id: 3,
        name: 'waiter',
        description: 'Empregado de mesa',
      });
    });
  });
});
