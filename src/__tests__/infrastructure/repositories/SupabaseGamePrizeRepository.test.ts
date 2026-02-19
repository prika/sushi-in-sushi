import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseGamePrizeRepository } from '@/infrastructure/repositories/SupabaseGamePrizeRepository';
import type { CreateGamePrizeData } from '@/domain/entities/GamePrize';

/**
 * Tests for SupabaseGamePrizeRepository
 *
 * Verifies prize creation, retrieval, and redemption logic.
 */

function createDatabaseGamePrize(overrides: Partial<{
  id: string;
  session_id: string;
  game_session_id: string | null;
  session_customer_id: string | null;
  display_name: string;
  prize_type: string;
  prize_value: string;
  prize_description: string | null;
  total_score: number;
  redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}> = {}) {
  return {
    id: 'prize-001',
    session_id: 'session-abc',
    game_session_id: 'gs-001',
    session_customer_id: 'sc-001',
    display_name: 'Salmão Lover',
    prize_type: 'discount_percentage',
    prize_value: '10',
    prize_description: '10% de desconto',
    total_score: 45,
    redeemed: false,
    redeemed_at: null,
    created_at: '2024-06-01T10:30:00.000Z',
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

    builder.then = (onFulfilled: (value: any) => any) => Promise.resolve(result).then(onFulfilled);
    builder.catch = (onRejected: (reason: any) => any) => Promise.resolve(result).catch(onRejected);

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

describe('SupabaseGamePrizeRepository', () => {
  let repository: SupabaseGamePrizeRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    repository = new SupabaseGamePrizeRepository(mockClient as any);
  });

  // =====================================================
  // create()
  // =====================================================
  describe('create', () => {
    it('deve criar prémio com todos os campos', async () => {
      const dbRow = createDatabaseGamePrize();
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const input: CreateGamePrizeData = {
        sessionId: 'session-abc',
        gameSessionId: 'gs-001',
        sessionCustomerId: 'sc-001',
        displayName: 'Salmão Lover',
        prizeType: 'discount_percentage',
        prizeValue: '10',
        prizeDescription: '10% de desconto',
        totalScore: 45,
      };

      const result = await repository.create(input);

      expect(result.sessionId).toBe('session-abc');
      expect(result.prizeType).toBe('discount_percentage');
      expect(result.prizeValue).toBe('10');
      expect(result.redeemed).toBe(false);
      expect(mockClient.from).toHaveBeenCalledWith('game_prizes');
    });

    it('deve criar prémio com campos opcionais null', async () => {
      const dbRow = createDatabaseGamePrize({
        game_session_id: null,
        session_customer_id: null,
        prize_description: null,
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const input: CreateGamePrizeData = {
        sessionId: 'session-abc',
        displayName: 'Anon',
        prizeType: 'free_product',
        prizeValue: 'Miso Soup',
      };

      const result = await repository.create(input);

      expect(result.gameSessionId).toBeNull();
      expect(result.sessionCustomerId).toBeNull();
      expect(result.prizeDescription).toBeNull();
    });

    it('deve lançar erro quando criação falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(repository.create({
        sessionId: 'session-abc',
        displayName: 'Test',
        prizeType: 'discount_percentage',
        prizeValue: '5',
      })).rejects.toThrow('Insert failed');
    });
  });

  // =====================================================
  // findBySession()
  // =====================================================
  describe('findBySession', () => {
    it('deve retornar prémios da sessão ordenados', async () => {
      const dbRows = [
        createDatabaseGamePrize({ id: 'prize-1' }),
        createDatabaseGamePrize({ id: 'prize-2', prize_type: 'free_product' }),
      ];
      mockClient._getBuilder().mockResolvedValue({ data: dbRows, error: null });

      const result = await repository.findBySession('session-abc');

      expect(result).toHaveLength(2);
      expect(mockClient._getBuilder().eq).toHaveBeenCalledWith('session_id', 'session-abc');
      expect(mockClient._getBuilder().order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('deve retornar array vazio quando sem prémios', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: null });

      const result = await repository.findBySession('session-abc');

      expect(result).toEqual([]);
    });

    it('deve lançar erro quando query falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      await expect(repository.findBySession('session-abc')).rejects.toThrow('Query failed');
    });
  });

  // =====================================================
  // findById()
  // =====================================================
  describe('findById', () => {
    it('deve retornar prémio por ID', async () => {
      const dbRow = createDatabaseGamePrize({ id: 'prize-123' });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('prize-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('prize-123');
      expect(result!.displayName).toBe('Salmão Lover');
    });

    it('deve retornar null quando PGRST116', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve lançar erro para outros erros', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'DB error' } });

      await expect(repository.findById('prize-123')).rejects.toThrow('DB error');
    });
  });

  // =====================================================
  // redeem()
  // =====================================================
  describe('redeem', () => {
    it('deve marcar prémio como resgatado', async () => {
      const dbRow = createDatabaseGamePrize({
        id: 'prize-001',
        redeemed: true,
        redeemed_at: '2024-06-01T11:00:00.000Z',
      });
      const builder = mockClient._createBuilder({ data: dbRow, error: null });
      mockClient._setBuilder(builder);

      const result = await repository.redeem('prize-001');

      expect(result.redeemed).toBe(true);
      expect(result.redeemedAt).toBeInstanceOf(Date);
      expect(builder.update).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'prize-001');
    });

    it('deve lançar erro quando redeem falha', async () => {
      mockClient._getBuilder().mockResolvedValue({ data: null, error: { message: 'Redeem failed' } });

      await expect(repository.redeem('prize-001')).rejects.toThrow('Redeem failed');
    });
  });

  // =====================================================
  // Mapeamento de dados
  // =====================================================
  describe('mapeamento snake_case → camelCase', () => {
    it('deve mapear todos os campos corretamente', async () => {
      const dbRow = createDatabaseGamePrize({
        id: 'prize-map',
        session_id: 'session-xyz',
        game_session_id: 'gs-123',
        session_customer_id: 'sc-456',
        display_name: 'Wasabi Ninja',
        prize_type: 'free_dinner',
        prize_value: 'Jantar para 2',
        prize_description: 'Jantar completo grátis',
        total_score: 100,
        redeemed: true,
        redeemed_at: '2024-06-01T11:00:00.000Z',
      });
      mockClient._getBuilder().mockResolvedValue({ data: dbRow, error: null });

      const result = await repository.findById('prize-map');

      expect(result).toEqual({
        id: 'prize-map',
        sessionId: 'session-xyz',
        gameSessionId: 'gs-123',
        sessionCustomerId: 'sc-456',
        displayName: 'Wasabi Ninja',
        prizeType: 'free_dinner',
        prizeValue: 'Jantar para 2',
        prizeDescription: 'Jantar completo grátis',
        totalScore: 100,
        redeemed: true,
        redeemedAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });
  });
});
