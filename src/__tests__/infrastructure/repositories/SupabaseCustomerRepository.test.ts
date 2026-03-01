import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient, type MockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import { SupabaseCustomerRepository } from '@/infrastructure/repositories/SupabaseCustomerRepository';

/**
 * Tests for SupabaseCustomerRepository
 *
 * Verifica mapeamento de dados, queries com filtros, e operacoes CRUD.
 * Usa mock do Supabase client para testar sem dependencias de base de dados.
 */

function createDbCustomer(overrides: Partial<any> = {}) {
  return {
    id: 'cust-1',
    email: 'test@test.com',
    name: 'Test Customer',
    phone: '+351912345678',
    birth_date: '1990-01-15',
    preferred_location: 'circunvalacao',
    marketing_consent: true,
    points: 100,
    total_spent: 250.50,
    visit_count: 5,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SupabaseCustomerRepository', () => {
  let repository: SupabaseCustomerRepository;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseCustomerRepository(mockClient as any);
  });

  describe('findAll', () => {
    it('deve retornar lista de clientes mapeados sem filtro', async () => {
      const dbRows = [
        createDbCustomer({ id: 'cust-1', name: 'Alice' }),
        createDbCustomer({ id: 'cust-2', name: 'Bob', email: 'bob@test.com' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(mockClient.from).toHaveBeenCalledWith('customers');
      expect(mockClient._getBuilder().select).toHaveBeenCalledWith('*');
      expect(mockClient._getBuilder().order).toHaveBeenCalledWith('name');
    });

    it('deve aplicar filtro de localizacao', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ location: 'boavista' });

      expect(builder.eq).toHaveBeenCalledWith('preferred_location', 'boavista');
    });

    it('deve aplicar filtro isActive', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ isActive: true });

      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('deve aplicar filtro isActive false', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ isActive: false });

      expect(builder.eq).toHaveBeenCalledWith('is_active', false);
    });

    it('deve aplicar filtro hasMarketing', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ hasMarketing: true });

      expect(builder.eq).toHaveBeenCalledWith('marketing_consent', true);
    });

    it('deve aplicar filtro de pesquisa', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({ search: 'alice' });

      expect(builder.or).toHaveBeenCalledWith(
        'name.ilike.%alice%,email.ilike.%alice%,phone.ilike.%alice%'
      );
    });

    it('deve aplicar multiplos filtros em simultaneo', async () => {
      const builder = mockClient._newBuilder({ data: [], error: null });

      await repository.findAll({
        location: 'circunvalacao',
        isActive: true,
        hasMarketing: false,
        search: 'test',
      });

      expect(builder.eq).toHaveBeenCalledWith('preferred_location', 'circunvalacao');
      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
      expect(builder.eq).toHaveBeenCalledWith('marketing_consent', false);
      expect(builder.or).toHaveBeenCalled();
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

    it('deve mapear snake_case para camelCase correctamente', async () => {
      const dbRow = createDbCustomer();
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0].birthDate).toBe('1990-01-15');
      expect(result[0].preferredLocation).toBe('circunvalacao');
      expect(result[0].marketingConsent).toBe(true);
      expect(result[0].totalSpent).toBe(250.50);
      expect(result[0].visitCount).toBe(5);
      expect(result[0].isActive).toBe(true);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('deve retornar cliente com historico quando encontrado', async () => {
      const dbRow = createDbCustomer();
      const firstBuilder = mockClient._createBuilder({ data: dbRow, error: null });
      const secondBuilder = mockClient._createBuilder({ data: null, error: null, count: 3 });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      const result = await repository.findById('cust-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('cust-1');
      expect(result!.name).toBe('Test Customer');
      expect(result!.reservations).toBe(3);
      expect(result!.lastVisit).toBeNull();
      expect(result!.birthDate).toBe('1990-01-15');
      expect(result!.preferredLocation).toBe('circunvalacao');
    });

    it('deve retornar 0 reservas quando count e null', async () => {
      const dbRow = createDbCustomer();
      const firstBuilder = mockClient._createBuilder({ data: dbRow, error: null });
      const secondBuilder = mockClient._createBuilder({ data: null, error: null, count: null });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      const result = await repository.findById('cust-1');

      expect(result!.reservations).toBe(0);
    });

    it('deve retornar null quando nao encontrado (PGRST116)', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('deve lancar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Database connection error' },
      });

      await expect(repository.findById('cust-1')).rejects.toThrow('Database connection error');
    });

    it('deve fazer segunda query a tabela reservations com count', async () => {
      const dbRow = createDbCustomer({ email: 'specific@email.com' });
      const firstBuilder = mockClient._createBuilder({ data: dbRow, error: null });
      const secondBuilder = mockClient._createBuilder({ data: null, error: null, count: 7 });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      await repository.findById('cust-1');

      expect(mockClient.from).toHaveBeenCalledWith('customers');
      expect(mockClient.from).toHaveBeenCalledWith('reservations');
      expect(secondBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(secondBuilder.eq).toHaveBeenCalledWith('email', 'specific@email.com');
    });
  });

  describe('findByEmail', () => {
    it('deve retornar cliente quando encontrado por email', async () => {
      const dbRow = createDbCustomer({ email: 'alice@test.com' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findByEmail('alice@test.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('alice@test.com');
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('email', 'alice@test.com');
      expect(mockClient._getBuilder().single).toHaveBeenCalled();
    });

    it('deve retornar null quando nao encontrado (PGRST116)', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await repository.findByEmail('nobody@test.com');

      expect(result).toBeNull();
    });

    it('deve lancar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { code: 'INTERNAL', message: 'Query timeout' },
      });

      await expect(repository.findByEmail('test@test.com')).rejects.toThrow('Query timeout');
    });
  });

  describe('create', () => {
    it('deve criar cliente com mapeamento correcto de campos', async () => {
      const dbRow = createDbCustomer();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        email: 'test@test.com',
        name: 'Test Customer',
        phone: '+351912345678',
        birthDate: '1990-01-15',
        preferredLocation: 'circunvalacao',
        marketingConsent: true,
      });

      expect(builder.insert).toHaveBeenCalledWith({
        email: 'test@test.com',
        name: 'Test Customer',
        phone: '+351912345678',
        birth_date: '1990-01-15',
        preferred_location: 'circunvalacao',
        marketing_consent: true,
        points: 0,
        total_spent: 0,
        visit_count: 0,
      });
      expect(result.id).toBe('cust-1');
    });

    it('deve inicializar points, totalSpent e visitCount a zero', async () => {
      const dbRow = createDbCustomer({ points: 0, total_spent: 0, visit_count: 0 });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.create({
        email: 'new@test.com',
        name: 'New Customer',
      });

      const insertArg = builder.insert.mock.calls[0][0];
      expect(insertArg.points).toBe(0);
      expect(insertArg.total_spent).toBe(0);
      expect(insertArg.visit_count).toBe(0);
      expect(result.points).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.visitCount).toBe(0);
    });

    it('deve tratar campos opcionais como null', async () => {
      const dbRow = createDbCustomer({
        phone: null,
        birth_date: null,
        preferred_location: null,
        marketing_consent: false,
      });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({
        email: 'minimal@test.com',
        name: 'Minimal Customer',
      });

      const insertArg = builder.insert.mock.calls[0][0];
      expect(insertArg.phone).toBeNull();
      expect(insertArg.birth_date).toBeNull();
      expect(insertArg.preferred_location).toBeNull();
      expect(insertArg.marketing_consent).toBe(false);
    });

    it('deve chamar select e single apos insert', async () => {
      const dbRow = createDbCustomer();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.create({ email: 'test@test.com', name: 'Test' });

      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
    });

    it('deve lancar erro se insert falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Duplicate email' },
      });

      await expect(
        repository.create({ email: 'dup@test.com', name: 'Dup' })
      ).rejects.toThrow('Duplicate email');
    });
  });

  describe('update', () => {
    it('deve atualizar com mapeamento parcial de campos', async () => {
      const dbRow = createDbCustomer({ name: 'Updated Name', email: 'new@email.com' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      const result = await repository.update('cust-1', {
        name: 'Updated Name',
        email: 'new@email.com',
      });

      expect(builder.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        email: 'new@email.com',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('deve mapear todos os campos camelCase para snake_case', async () => {
      const dbRow = createDbCustomer();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('cust-1', {
        birthDate: '1995-06-20',
        preferredLocation: 'boavista',
        marketingConsent: false,
        totalSpent: 500,
        visitCount: 10,
        isActive: false,
        points: 200,
      });

      expect(builder.update).toHaveBeenCalledWith({
        birth_date: '1995-06-20',
        preferred_location: 'boavista',
        marketing_consent: false,
        total_spent: 500,
        visit_count: 10,
        is_active: false,
        points: 200,
      });
    });

    it('deve incluir apenas campos definidos no update', async () => {
      const dbRow = createDbCustomer({ phone: '+351999999999' });
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('cust-1', { phone: '+351999999999' });

      expect(builder.update).toHaveBeenCalledWith({ phone: '+351999999999' });
    });

    it('deve chamar eq com id correcto', async () => {
      const dbRow = createDbCustomer();
      const builder = mockClient._newBuilder({ data: dbRow, error: null });

      await repository.update('cust-42', { name: 'X' });

      expect(builder.eq).toHaveBeenCalledWith('id', 'cust-42');
    });

    it('deve lancar erro se update falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(repository.update('cust-1', { name: 'X' })).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('deve eliminar cliente por ID', async () => {
      const builder = mockClient._newBuilder({ data: null, error: null });

      await repository.delete('cust-1');

      expect(mockClient.from).toHaveBeenCalledWith('customers');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'cust-1');
    });

    it('deve lancar erro se delete falhar', async () => {
      mockClient._getBuilder().mockResolvedValue({
        data: null,
        error: { message: 'FK constraint violation' },
      });

      await expect(repository.delete('cust-1')).rejects.toThrow('FK constraint violation');
    });
  });

  describe('addPoints', () => {
    it('deve ler pontos actuais e adicionar novos pontos', async () => {
      const firstBuilder = mockClient._createBuilder({
        data: { points: 100 },
        error: null,
      });
      const secondBuilder = mockClient._createBuilder({
        data: createDbCustomer({ points: 150 }),
        error: null,
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      const result = await repository.addPoints('cust-1', 50);

      expect(mockClient.from).toHaveBeenCalledTimes(2);
      expect(firstBuilder.select).toHaveBeenCalledWith('points');
      expect(firstBuilder.eq).toHaveBeenCalledWith('id', 'cust-1');
      expect(firstBuilder.single).toHaveBeenCalled();
      expect(secondBuilder.update).toHaveBeenCalledWith({ points: 150 });
      expect(secondBuilder.eq).toHaveBeenCalledWith('id', 'cust-1');
      expect(result.points).toBe(150);
    });

    it('deve tratar pontos actuais como 0 quando current e null', async () => {
      const firstBuilder = mockClient._createBuilder({
        data: null,
        error: null,
      });
      const secondBuilder = mockClient._createBuilder({
        data: createDbCustomer({ points: 25 }),
        error: null,
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      await repository.addPoints('cust-1', 25);

      expect(secondBuilder.update).toHaveBeenCalledWith({ points: 25 });
    });

    it('deve lancar erro se update falhar', async () => {
      const firstBuilder = mockClient._createBuilder({
        data: { points: 100 },
        error: null,
      });
      const secondBuilder = mockClient._createBuilder({
        data: null,
        error: { message: 'Update error' },
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      await expect(repository.addPoints('cust-1', 50)).rejects.toThrow('Update error');
    });
  });

  describe('recordVisit', () => {
    it('deve ler visit_count e total_spent actuais e incrementar', async () => {
      const firstBuilder = mockClient._createBuilder({
        data: { visit_count: 5, total_spent: 250.50 },
        error: null,
      });
      const secondBuilder = mockClient._createBuilder({
        data: createDbCustomer({ visit_count: 6, total_spent: 290.50 }),
        error: null,
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      const result = await repository.recordVisit('cust-1', 40);

      expect(mockClient.from).toHaveBeenCalledTimes(2);
      expect(firstBuilder.select).toHaveBeenCalledWith('visit_count, total_spent');
      expect(firstBuilder.eq).toHaveBeenCalledWith('id', 'cust-1');
      expect(secondBuilder.update).toHaveBeenCalledWith({
        visit_count: 6,
        total_spent: 290.50,
      });
      expect(result.visitCount).toBe(6);
      expect(result.totalSpent).toBe(290.50);
    });

    it('deve tratar valores actuais como 0 quando current e null', async () => {
      const firstBuilder = mockClient._createBuilder({
        data: null,
        error: null,
      });
      const secondBuilder = mockClient._createBuilder({
        data: createDbCustomer({ visit_count: 1, total_spent: 30 }),
        error: null,
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      await repository.recordVisit('cust-1', 30);

      expect(secondBuilder.update).toHaveBeenCalledWith({
        visit_count: 1,
        total_spent: 30,
      });
    });

    it('deve lancar erro se update falhar', async () => {
      const firstBuilder = mockClient._createBuilder({
        data: { visit_count: 5, total_spent: 250 },
        error: null,
      });
      const secondBuilder = mockClient._createBuilder({
        data: null,
        error: { message: 'Record visit error' },
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstBuilder : secondBuilder;
      });

      await expect(repository.recordVisit('cust-1', 50)).rejects.toThrow('Record visit error');
    });
  });

  describe('mapeamento de dados', () => {
    it('deve converter datas string para objectos Date', async () => {
      const dbRow = createDbCustomer({
        created_at: '2026-06-15T10:30:00.000Z',
        updated_at: '2026-06-16T14:00:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2026-06-15T10:30:00.000Z');
      expect(result[0].updatedAt.toISOString()).toBe('2026-06-16T14:00:00.000Z');
    });

    it('deve mapear todos os campos snake_case para camelCase', async () => {
      const dbRow = createDbCustomer({
        birth_date: '2000-12-25',
        preferred_location: 'boavista',
        marketing_consent: false,
        total_spent: 999.99,
        visit_count: 42,
        is_active: false,
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0]).toEqual(
        expect.objectContaining({
          birthDate: '2000-12-25',
          preferredLocation: 'boavista',
          marketingConsent: false,
          totalSpent: 999.99,
          visitCount: 42,
          isActive: false,
        })
      );
    });

    it('deve preservar campos simples sem transformacao', async () => {
      const dbRow = createDbCustomer({
        id: 'abc-123',
        email: 'hello@world.com',
        name: 'John Doe',
        phone: null,
        points: 0,
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0].id).toBe('abc-123');
      expect(result[0].email).toBe('hello@world.com');
      expect(result[0].name).toBe('John Doe');
      expect(result[0].phone).toBeNull();
      expect(result[0].points).toBe(0);
    });
  });
});
