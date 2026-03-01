import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseGameSessionRepository } from '@/infrastructure/repositories/SupabaseGameSessionRepository';

/**
 * Tests for SupabaseGameSessionRepository
 *
 * Verifies session creation, status transitions, and query logic.
 */

function createDatabaseGameSession(overrides: Partial<{
  id: string;
  session_id: string;
  game_type: string | null;
  status: string;
  round_number: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}> = {}) {
  return {
    id: 'gs-001',
    session_id: 'session-abc',
    game_type: null as string | null,
    status: 'active',
    round_number: 1,
    total_questions: 6,
    started_at: '2024-06-01T10:00:00.000Z',
    completed_at: null,
    created_at: '2024-06-01T10:00:00.000Z',
    ...overrides,
  };
}

function createMockSupabaseClient() {
  const createQueryBuilder = (defaultResult: any = { data: [], error: null }) => {
    const builder: any = {};
    let result = defaultResult;

    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'];
    chainMethods.forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    builder.then = (onFulfilled: (_value: any) => any) => Promise.resolve(result).then(onFulfilled);
    builder.catch = (onRejected: (_reason: any) => any) => Promise.resolve(result).catch(onRejected);

    builder.mockResolvedValue = (value: any) => {
      result = value;
      return builder;
    };

    return builder;
  };

  let currentBuilder = createQueryBuilder();

  return {
    from: vi.fn(() => currentBuilder),
    _setBuilder: (builder: any) => { currentBuilder = builder; },
    _getBuilder: () => currentBuilder,
    _createBuilder: createQueryBuilder,
  };
}

describe('SupabaseGameSessionRepository', () => {
  let repository: SupabaseGameSessionRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseGameSessionRepository(mockClient as any);
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar sessão de jogo com defaults', async () => {
      const dbRow = createDatabaseGameSession();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.create({ sessionId: 'session-abc' });

      expect(result.sessionId).toBe('session-abc');
      expect(result.status).toBe('active');
      expect(result.roundNumber).toBe(1);
      expect(mockClient.from).toHaveBeenCalledWith('game_sessions');
      expect(mockClient._getBuilder().insert).toHaveBeenCalled();
    });

    it('deve criar sessão com roundNumber e totalQuestions', async () => {
      const dbRow = createDatabaseGameSession({ round_number: 3, total_questions: 10 });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.create({
        sessionId: 'session-abc',
        roundNumber: 3,
        totalQuestions: 10,
      });

      expect(result.roundNumber).toBe(3);
      expect(result.totalQuestions).toBe(10);
    });

    it('deve lançar erro quando criação falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(repository.create({ sessionId: 'session-abc' })).rejects.toThrow('Insert failed');
    });
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar sessão por ID', async () => {
      const dbRow = createDatabaseGameSession({ id: 'gs-123' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('gs-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('gs-123');
      expect(result!.status).toBe('active');
    });

    it('deve retornar null quando PGRST116', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'DB error' } });

      await expect(repository.findById('gs-123')).rejects.toThrow('DB error');
    });
  });

  // =====================================================
  // findBySessionId()
  // =====================================================
  describe('findBySessionId', () => {
    it('deve retornar sessões por sessionId', async () => {
      const dbRows = [
        createDatabaseGameSession({ id: 'gs-1', round_number: 1 }),
        createDatabaseGameSession({ id: 'gs-2', round_number: 2 }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findBySessionId('session-abc');

      expect(result).toHaveLength(2);
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('session_id', 'session-abc');
    });

    it('deve filtrar por status quando fornecido', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findBySessionId('session-abc', 'completed');

      expect(builder.eq).toHaveBeenCalledWith('session_id', 'session-abc');
      expect(builder.eq).toHaveBeenCalledWith('status', 'completed');
    });

    it('deve lançar erro quando query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      await expect(repository.findBySessionId('session-abc')).rejects.toThrow('Query failed');
    });

    it('deve retornar array vazio quando sem resultados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findBySessionId('session-abc');

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // complete()
  // =====================================================
  describe('complete', () => {
    it('deve atualizar status para completed', async () => {
      const dbRow = createDatabaseGameSession({
        id: 'gs-001',
        status: 'completed',
        completed_at: '2024-06-01T10:30:00.000Z',
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.complete('gs-001');

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(builder.update).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'gs-001');
    });

    it('deve lançar erro quando atualização falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      await expect(repository.complete('gs-001')).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // abandon()
  // =====================================================
  describe('abandon', () => {
    it('deve atualizar status para abandoned', async () => {
      const dbRow = createDatabaseGameSession({
        id: 'gs-001',
        status: 'abandoned',
        completed_at: '2024-06-01T10:30:00.000Z',
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.abandon('gs-001');

      expect(result.status).toBe('abandoned');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(builder.update).toHaveBeenCalled();
    });

    it('deve lançar erro quando abandon falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Abandon failed' } });

      await expect(repository.abandon('gs-001')).rejects.toThrow('Abandon failed');
    });
  });

  // =====================================================
  // Mapeamento de dados
  // =====================================================
  describe('mapeamento snake_case → camelCase', () => {
    it('deve mapear todos os campos corretamente', async () => {
      const dbRow = createDatabaseGameSession({
        id: 'gs-map',
        session_id: 'session-xyz',
        status: 'completed',
        round_number: 2,
        total_questions: 8,
        started_at: '2024-06-01T10:00:00.000Z',
        completed_at: '2024-06-01T10:30:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('gs-map');

      expect(result).toEqual({
        id: 'gs-map',
        sessionId: 'session-xyz',
        gameType: null,
        status: 'completed',
        roundNumber: 2,
        totalQuestions: 8,
        startedAt: expect.any(Date),
        completedAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });

    it('deve mapear completedAt como null quando não completado', async () => {
      const dbRow = createDatabaseGameSession({ completed_at: null });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('gs-001');

      expect(result!.completedAt).toBeNull();
    });
  });
});
