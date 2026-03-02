import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseGameAnswerRepository } from '@/infrastructure/repositories/SupabaseGameAnswerRepository';
import type { CreateGameAnswerData } from '@/domain/entities/GameAnswer';

/**
 * Tests for SupabaseGameAnswerRepository
 *
 * Verifies answer creation, retrieval, and leaderboard aggregation logic.
 */

function createDatabaseGameAnswer(overrides: Partial<{
  id: string;
  game_session_id: string;
  session_customer_id: string | null;
  question_id: string | null;
  product_id: number | null;
  game_type: string;
  answer: Record<string, unknown>;
  score_earned: number;
  answered_at: string;
}> = {}) {
  return {
    id: 'ans-001',
    game_session_id: 'gs-001',
    session_customer_id: 'sc-001',
    question_id: 'q-001',
    product_id: null,
    game_type: 'quiz',
    answer: { selectedIndex: 0 },
    score_earned: 10,
    answered_at: '2024-06-01T10:05:00.000Z',
    ...overrides,
  };
}

function createMockSupabaseClient() {
  const createQueryBuilder = (defaultResult: any = { data: [], error: null }) => {
    const builder: any = {};
    let result = defaultResult;

    const chainMethods = ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'in', 'order', 'single'];
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

  // Track separate builders per query chain
  const builders: any[] = [];
  let builderIndex = 0;

  return {
    from: vi.fn(() => {
      if (builders.length > 0 && builderIndex < builders.length) {
        return builders[builderIndex++];
      }
      return currentBuilder;
    }),
    _setBuilder: (builder: any) => { currentBuilder = builder; builderIndex = 0; builders.length = 0; },
    _getBuilder: () => currentBuilder,
    _createBuilder: createQueryBuilder,
    _setBuilders: (b: any[]) => { builders.push(...b); builderIndex = 0; },
    _resetBuilders: () => { builders.length = 0; builderIndex = 0; },
  };
}

describe('SupabaseGameAnswerRepository', () => {
  let repository: SupabaseGameAnswerRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseGameAnswerRepository(mockClient as any);
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar resposta via insert', async () => {
      const dbRow = createDatabaseGameAnswer();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const input: CreateGameAnswerData = {
        gameSessionId: 'gs-001',
        sessionCustomerId: 'sc-001',
        questionId: 'q-001',
        gameType: 'quiz',
        answer: { selectedIndex: 0 },
        scoreEarned: 10,
      };

      const result = await repository.create(input);

      expect(result.gameSessionId).toBe('gs-001');
      expect(result.scoreEarned).toBe(10);
      expect(mockClient.from).toHaveBeenCalledWith('game_answers');
      expect(mockClient._getBuilder().insert).toHaveBeenCalled();
    });

    it('deve criar resposta sem sessionCustomerId', async () => {
      const dbRow = createDatabaseGameAnswer({ session_customer_id: null });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.create({
        gameSessionId: 'gs-001',
        questionId: 'q-001',
        gameType: 'quiz',
        answer: { selectedIndex: 1 },
      });

      expect(result.sessionCustomerId).toBeNull();
    });

    it('deve lançar erro quando insert falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Insert failed', code: '42000' } });

      await expect(repository.create({
        gameSessionId: 'gs-001',
        questionId: 'q-001',
        gameType: 'quiz',
        answer: {},
      })).rejects.toThrow('Insert failed');
    });
  });

  // =====================================================
  // findByGameSession()
  // =====================================================
  describe('findByGameSession', () => {
    it('deve retornar respostas ordenadas por answered_at', async () => {
      const dbRows = [
        createDatabaseGameAnswer({ id: 'ans-1', answered_at: '2024-06-01T10:05:00.000Z' }),
        createDatabaseGameAnswer({ id: 'ans-2', answered_at: '2024-06-01T10:06:00.000Z' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findByGameSession('gs-001');

      expect(result).toHaveLength(2);
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('game_session_id', 'gs-001');
      expect(mockClient._getBuilder().order).toHaveBeenCalledWith('answered_at', { ascending: true });
    });

    it('deve lançar erro quando query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      await expect(repository.findByGameSession('gs-001')).rejects.toThrow('Query failed');
    });
  });

  // =====================================================
  // findBySessionCustomer()
  // =====================================================
  describe('findBySessionCustomer', () => {
    it('deve filtrar por gameSession e sessionCustomer', async () => {
      const dbRows = [createDatabaseGameAnswer()];
      const builder = mockClient._createBuilder({ data: dbRows, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.findBySessionCustomer('gs-001', 'sc-001');

      expect(result).toHaveLength(1);
      expect(builder.eq).toHaveBeenCalledWith('game_session_id', 'gs-001');
      expect(builder.eq).toHaveBeenCalledWith('session_customer_id', 'sc-001');
    });

    it('deve lançar erro quando query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      await expect(repository.findBySessionCustomer('gs-001', 'sc-001')).rejects.toThrow('Query failed');
    });
  });

  // =====================================================
  // getLeaderboard()
  // =====================================================
  describe('getLeaderboard', () => {
    it('deve agregar scores por jogador', async () => {
      // First call: game_answers
      const answersBuilder = mockClient._createBuilder({
        data: [
          { session_customer_id: 'sc-001', score_earned: 10 },
          { session_customer_id: 'sc-001', score_earned: 15 },
          { session_customer_id: 'sc-002', score_earned: 20 },
        ],
        error: null,
      });

      // Second call: session_customers
      const customersBuilder = mockClient._createBuilder({
        data: [
          { id: 'sc-001', display_name: 'Salmão Lover' },
          { id: 'sc-002', display_name: 'Wasabi Ninja' },
        ],
        error: null,
      });

      mockClient._setBuilders([answersBuilder, customersBuilder]);

      const result = await repository.getLeaderboard('gs-001');

      expect(result).toHaveLength(2);
      // Sorted by score desc: sc-002 (20) before sc-001 (25)
      // Actually sc-001 has 10+15=25 so should be first
      expect(result[0].totalScore).toBe(25);
      expect(result[0].displayName).toBe('Salmão Lover');
      expect(result[1].totalScore).toBe(20);
      expect(result[1].displayName).toBe('Wasabi Ninja');
    });

    it('deve retornar array vazio sem respostas', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.getLeaderboard('gs-001');

      expect(result).toEqual([]);
    });

    it('deve tratar jogadores anónimos', async () => {
      const answersBuilder = mockClient._createBuilder({
        data: [
          { session_customer_id: null, score_earned: 30 },
        ],
        error: null,
      });

      mockClient._setBuilders([answersBuilder]);

      const result = await repository.getLeaderboard('gs-001');

      expect(result).toHaveLength(1);
      expect(result[0].sessionCustomerId).toBeNull();
      expect(result[0].displayName).toBe('Anonymous');
    });

    it('deve lançar erro quando answers query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Answers error' } });

      await expect(repository.getLeaderboard('gs-001')).rejects.toThrow('Answers error');
    });
  });

  // =====================================================
  // getSessionLeaderboard()
  // =====================================================
  describe('getSessionLeaderboard', () => {
    it('deve agregar scores entre múltiplas game sessions', async () => {
      // First call: game_sessions -> get session IDs
      const sessionsBuilder = mockClient._createBuilder({
        data: [{ id: 'gs-1' }, { id: 'gs-2' }],
        error: null,
      });

      // Second call: game_answers
      const answersBuilder = mockClient._createBuilder({
        data: [
          { session_customer_id: 'sc-001', score_earned: 10 },
          { session_customer_id: 'sc-001', score_earned: 20 },
          { session_customer_id: 'sc-002', score_earned: 15 },
        ],
        error: null,
      });

      // Third call: session_customers
      const customersBuilder = mockClient._createBuilder({
        data: [
          { id: 'sc-001', display_name: 'Player 1' },
          { id: 'sc-002', display_name: 'Player 2' },
        ],
        error: null,
      });

      mockClient._setBuilders([sessionsBuilder, answersBuilder, customersBuilder]);

      const result = await repository.getSessionLeaderboard('session-abc');

      expect(result).toHaveLength(2);
      expect(result[0].totalScore).toBe(30); // sc-001: 10+20
      expect(result[1].totalScore).toBe(15); // sc-002
    });

    it('deve retornar array vazio sem game sessions', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.getSessionLeaderboard('session-abc');

      expect(result).toEqual([]);
    });

    it('deve lançar erro quando sessions query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Sessions error' } });

      await expect(repository.getSessionLeaderboard('session-abc')).rejects.toThrow('Sessions error');
    });
  });

  // =====================================================
  // Mapeamento de dados
  // =====================================================
  describe('mapeamento snake_case → camelCase', () => {
    it('deve mapear todos os campos corretamente', async () => {
      const dbRow = createDatabaseGameAnswer({
        id: 'ans-map',
        game_session_id: 'gs-123',
        session_customer_id: 'sc-456',
        question_id: 'q-789',
        game_type: 'preference',
        answer: { choice: 'A' },
        score_earned: 5,
        answered_at: '2024-06-01T10:10:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findByGameSession('gs-123');

      expect(result[0]).toEqual({
        id: 'ans-map',
        gameSessionId: 'gs-123',
        sessionCustomerId: 'sc-456',
        questionId: 'q-789',
        productId: null,
        gameType: 'preference',
        answer: { choice: 'A' },
        scoreEarned: 5,
        answeredAt: expect.any(Date),
      });
    });
  });
});
