import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseGameQuestionRepository } from '@/infrastructure/repositories/SupabaseGameQuestionRepository';
import type { CreateGameQuestionData, UpdateGameQuestionData } from '@/domain/entities/GameQuestion';

/**
 * Tests for SupabaseGameQuestionRepository
 *
 * Verifies data mapping, query logic, and CRUD operations.
 */

function createDatabaseGameQuestion(overrides: Partial<{
  id: string;
  game_type: string;
  question_text: string;
  options: string[] | null;
  correct_answer_index: number | null;
  option_a: { label: string; imageUrl?: string } | null;
  option_b: { label: string; imageUrl?: string } | null;
  category: string | null;
  difficulty: number;
  points: number;
  is_active: boolean;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: 'q-001',
    game_type: 'quiz',
    question_text: 'Qual é o peixe mais usado no sushi?',
    options: ['Salmão', 'Atum', 'Cavala', 'Sardinha'],
    correct_answer_index: 0,
    option_a: null,
    option_b: null,
    category: 'ingredientes',
    difficulty: 1,
    points: 10,
    is_active: true,
    restaurant_id: null,
    created_at: '2024-06-01T10:00:00.000Z',
    updated_at: '2024-06-01T10:00:00.000Z',
    ...overrides,
  };
}

function createMockSupabaseClient() {
  const createQueryBuilder = (defaultResult: any = { data: [], error: null }) => {
    const builder: any = {};
    let result = defaultResult;

    const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'order', 'single'];
    chainMethods.forEach(method => {
      builder[method] = vi.fn(() => builder);
    });

    builder.then = (onFulfilled: (value: any) => any) => Promise.resolve(result).then(onFulfilled);
    builder.catch = (onRejected: (reason: any) => any) => Promise.resolve(result).catch(onRejected);

    builder.mockResolvedValue = (value: any) => {
      result = value;
      return builder;
    };

    return builder;
  };

  let currentBuilder = createQueryBuilder();

  const mockClient = {
    from: vi.fn(() => currentBuilder),
    _setBuilder: (builder: any) => { currentBuilder = builder; },
    _getBuilder: () => currentBuilder,
    _createBuilder: createQueryBuilder,
  };

  return mockClient;
}

describe('SupabaseGameQuestionRepository', () => {
  let repository: SupabaseGameQuestionRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseGameQuestionRepository(mockClient as any);
  });

  // =====================================================
  // findAll()
  // =====================================================
  describe('findAll', () => {
    it('deve retornar todas as perguntas mapeadas', async () => {
      const dbRows = [
        createDatabaseGameQuestion({ id: 'q-001' }),
        createDatabaseGameQuestion({ id: 'q-002', game_type: 'preference', question_text: 'Salmão vs Atum?' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].gameType).toBe('quiz');
      expect(result[0].questionText).toBe('Qual é o peixe mais usado no sushi?');
      expect(result[1].gameType).toBe('preference');
      expect(mockClient.from).toHaveBeenCalledWith('game_questions');
    });

    it('deve converter datas corretamente', async () => {
      const dbRows = [createDatabaseGameQuestion()];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('deve retornar array vazio quando não há dados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('deve lançar erro quando Supabase falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(repository.findAll()).rejects.toThrow('DB error');
    });

    it('deve filtrar por gameType', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ gameType: 'quiz' });

      expect(builder.eq).toHaveBeenCalledWith('game_type', 'quiz');
    });

    it('deve filtrar por isActive', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ isActive: true });

      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('deve filtrar por restaurantId null (perguntas globais)', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ restaurantId: null });

      expect(builder.is).toHaveBeenCalledWith('restaurant_id', null);
    });

    it('deve filtrar por restaurantId específico', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ restaurantId: 'rest-1' });

      expect(builder.eq).toHaveBeenCalledWith('restaurant_id', 'rest-1');
    });

    it('deve filtrar por category', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findAll({ category: 'ingredientes' });

      expect(builder.eq).toHaveBeenCalledWith('category', 'ingredientes');
    });
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar pergunta por ID', async () => {
      const dbRow = createDatabaseGameQuestion({ id: 'q-123' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('q-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('q-123');
      expect(result!.gameType).toBe('quiz');
    });

    it('deve retornar null quando PGRST116 (não encontrado)', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'Unexpected error' } });

      await expect(repository.findById('q-123')).rejects.toThrow('Unexpected error');
    });
  });

  // =====================================================
  // findRandom()
  // =====================================================
  describe('findRandom', () => {
    it('deve retornar perguntas aleatórias até ao limite', async () => {
      const dbRows = Array.from({ length: 10 }, (_, i) =>
        createDatabaseGameQuestion({ id: `q-${i}` })
      );
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findRandom(3);

      expect(result).toHaveLength(3);
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('is_active', true);
    });

    it('deve filtrar por gameTypes', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findRandom(5, ['quiz', 'preference']);

      expect(builder.in).toHaveBeenCalledWith('game_type', ['quiz', 'preference']);
    });

    it('deve usar OR filter com restaurantId', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findRandom(5, undefined, 'rest-1');

      expect(builder.or).toHaveBeenCalledWith('restaurant_id.is.null,restaurant_id.eq.rest-1');
    });

    it('deve filtrar perguntas globais quando sem restaurantId', async () => {
      const builder = mockClient._createBuilder({ data: [], error: null });
      mockClient._setBuilder(builder);

      await repository.findRandom(5);

      expect(builder.is).toHaveBeenCalledWith('restaurant_id', null);
    });

    it('deve retornar array vazio quando sem dados', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: [], error: null });

      const result = await repository.findRandom(5);

      expect(result).toEqual([]);
    });
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar pergunta de quiz com todos os campos', async () => {
      const dbRow = createDatabaseGameQuestion();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const input: CreateGameQuestionData = {
        gameType: 'quiz',
        questionText: 'Qual é o peixe mais usado no sushi?',
        options: ['Salmão', 'Atum', 'Cavala', 'Sardinha'],
        correctAnswerIndex: 0,
        category: 'ingredientes',
        difficulty: 1,
        points: 10,
      };

      const result = await repository.create(input);

      expect(result.gameType).toBe('quiz');
      expect(result.questionText).toBe('Qual é o peixe mais usado no sushi?');
      expect(mockClient._getBuilder().insert).toHaveBeenCalled();
    });

    it('deve criar pergunta de preference com opções A/B', async () => {
      const dbRow = createDatabaseGameQuestion({
        game_type: 'preference',
        question_text: 'Qual preferes?',
        options: null,
        correct_answer_index: null,
        option_a: { label: 'Salmão' },
        option_b: { label: 'Atum' },
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const input: CreateGameQuestionData = {
        gameType: 'preference',
        questionText: 'Qual preferes?',
        optionA: { label: 'Salmão' },
        optionB: { label: 'Atum' },
      };

      const result = await repository.create(input);

      expect(result.gameType).toBe('preference');
      expect(result.optionA).toEqual({ label: 'Salmão' });
      expect(result.optionB).toEqual({ label: 'Atum' });
    });

    it('deve lançar erro quando Supabase falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(repository.create({
        gameType: 'quiz',
        questionText: 'Test?',
      })).rejects.toThrow('Insert failed');
    });
  });

  // =====================================================
  // update()
  // =====================================================
  describe('update', () => {
    it('deve atualizar campos parciais', async () => {
      const dbRow = createDatabaseGameQuestion({ points: 20, difficulty: 3 });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.update('q-001', { points: 20, difficulty: 3 });

      expect(result.points).toBe(20);
      expect(result.difficulty).toBe(3);
      expect(builder.update).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'q-001');
    });

    it('deve lançar erro quando Supabase falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      await expect(repository.update('q-001', { points: 20 })).rejects.toThrow('Update failed');
    });
  });

  // =====================================================
  // delete()
  // =====================================================
  describe('delete', () => {
    it('deve eliminar pergunta com sucesso', async () => {
      const builder = mockClient._createBuilder({ data: null, error: null });
      mockClient._setBuilder(builder);

      await repository.delete('q-001');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'q-001');
    });

    it('deve lançar erro quando delete falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'FK constraint' } });

      await expect(repository.delete('q-001')).rejects.toThrow('FK constraint');
    });
  });

  // =====================================================
  // Mapeamento de dados
  // =====================================================
  describe('mapeamento snake_case → camelCase', () => {
    it('deve mapear todos os campos corretamente', async () => {
      const dbRow = createDatabaseGameQuestion({
        id: 'q-map',
        game_type: 'quiz',
        question_text: 'Teste?',
        options: ['A', 'B', 'C', 'D'],
        correct_answer_index: 2,
        option_a: null,
        option_b: null,
        category: 'cultura',
        difficulty: 2,
        points: 15,
        is_active: true,
        restaurant_id: 'rest-1',
      });
      mockClient._getBuilder().mockResolvedValue({ data: [dbRow], error: null });

      const result = await repository.findAll();

      expect(result[0]).toEqual({
        id: 'q-map',
        gameType: 'quiz',
        questionText: 'Teste?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswerIndex: 2,
        optionA: null,
        optionB: null,
        category: 'cultura',
        difficulty: 2,
        points: 15,
        isActive: true,
        restaurantId: 'rest-1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
