import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGameSession } from '@/presentation/hooks/useGameSession';
import { useDependencies } from '@/presentation/contexts/DependencyContext';
import type { GameSession } from '@/domain/entities/GameSession';
import type { GameQuestion } from '@/domain/entities/GameQuestion';
import type { GameAnswer } from '@/domain/entities/GameAnswer';
import type { GamePrize } from '@/domain/entities/GamePrize';
import type { LeaderboardEntry } from '@/domain/repositories/IGameAnswerRepository';

// Mock do DependencyContext
vi.mock('@/presentation/contexts/DependencyContext', () => ({
  useDependencies: vi.fn(),
}));

describe('useGameSession', () => {
  let mockStartGameSession: any;
  let mockSubmitGameAnswer: any;
  let mockCompleteGameSession: any;
  let mockGetGameLeaderboard: any;
  let mockRedeemGamePrize: any;

  const mockGameSession: GameSession = {
    id: 'gs-001',
    sessionId: 'session-abc',
    gameType: null,
    status: 'active',
    roundNumber: 1,
    totalQuestions: 5,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
  };

  const mockQuestions: GameQuestion[] = [
    {
      id: 'q-001',
      gameType: 'quiz',
      questionText: 'Qual é o peixe mais usado?',
      options: ['Salmão', 'Atum', 'Cavala', 'Sardinha'],
      correctAnswerIndex: 0,
      optionA: null,
      optionB: null,
      category: 'ingredientes',
      difficulty: 1,
      points: 10,
      isActive: true,
      restaurantId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockAnswer: GameAnswer = {
    id: 'ans-001',
    gameSessionId: 'gs-001',
    sessionCustomerId: 'sc-001',
    questionId: 'q-001',
    productId: null,
    gameType: 'quiz',
    answer: { selectedIndex: 0 },
    scoreEarned: 10,
    answeredAt: new Date(),
  };

  const mockLeaderboard: LeaderboardEntry[] = [
    { sessionCustomerId: 'sc-001', displayName: 'Salmão Lover', totalScore: 30 },
    { sessionCustomerId: 'sc-002', displayName: 'Wasabi Ninja', totalScore: 20 },
  ];

  const mockPrize: GamePrize = {
    id: 'prize-001',
    sessionId: 'session-abc',
    gameSessionId: 'gs-001',
    sessionCustomerId: 'sc-001',
    displayName: 'Salmão Lover',
    prizeType: 'discount_percentage',
    prizeValue: '10',
    prizeDescription: '10% de desconto',
    totalScore: 30,
    redeemed: false,
    redeemedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockStartGameSession = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { gameSession: mockGameSession, questions: mockQuestions },
      }),
    };

    mockSubmitGameAnswer = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: mockAnswer,
      }),
    };

    mockCompleteGameSession = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { leaderboard: mockLeaderboard, prize: mockPrize },
      }),
    };

    mockGetGameLeaderboard = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: mockLeaderboard,
      }),
    };

    mockRedeemGamePrize = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockPrize, redeemed: true, redeemedAt: new Date() },
      }),
    };

    vi.mocked(useDependencies).mockReturnValue({
      startGameSession: mockStartGameSession,
      submitGameAnswer: mockSubmitGameAnswer,
      completeGameSession: mockCompleteGameSession,
      getGameLeaderboard: mockGetGameLeaderboard,
      redeemGamePrize: mockRedeemGamePrize,
    } as any);
  });

  // =====================================================
  // Estado inicial
  // =====================================================
  it('deve ter estado inicial correto', () => {
    const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

    expect(result.current.gameSession).toBeNull();
    expect(result.current.questions).toEqual([]);
    expect(result.current.answers).toEqual([]);
    expect(result.current.leaderboard).toEqual([]);
    expect(result.current.currentPrize).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // =====================================================
  // startGame()
  // =====================================================
  describe('startGame', () => {
    it('deve iniciar jogo com sucesso', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame();
      });

      expect(result.current.gameSession).toEqual(mockGameSession);
      expect(result.current.questions).toEqual(mockQuestions);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('deve passar config ao use case', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame({ questionsPerRound: 10, restaurantId: 'rest-1' });
      });

      expect(mockStartGameSession.execute).toHaveBeenCalledWith({
        sessionId: 'session-abc',
        questionsPerRound: 10,
        restaurantId: 'rest-1',
      });
    });

    it('deve limpar state anterior ao iniciar novo jogo', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      // Start first game
      await act(async () => {
        await result.current.startGame();
      });

      expect(result.current.answers).toEqual([]);
      expect(result.current.currentPrize).toBeNull();
    });

    it('deve tratar erro do use case', async () => {
      mockStartGameSession.execute.mockResolvedValue({
        success: false,
        error: 'Sem perguntas disponíveis',
      });

      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame();
      });

      expect(result.current.error).toBe('Sem perguntas disponíveis');
      expect(result.current.gameSession).toBeNull();
    });

    it('deve tratar excepção inesperada', async () => {
      mockStartGameSession.execute.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  // =====================================================
  // submitAnswer()
  // =====================================================
  describe('submitAnswer', () => {
    it('deve submeter resposta e adicionar ao array', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      // Start game first
      await act(async () => {
        await result.current.startGame();
      });

      let answer: GameAnswer | null = null;
      await act(async () => {
        answer = await result.current.submitAnswer({
          questionId: 'q-001',
          gameType: 'quiz',
          answer: { selectedIndex: 0 },
          sessionCustomerId: 'sc-001',
        });
      });

      expect(answer).toEqual(mockAnswer);
      expect(result.current.answers).toHaveLength(1);
      expect(result.current.answers[0].scoreEarned).toBe(10);
    });

    it('deve retornar null sem sessão ativa', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      let answer: GameAnswer | null = null;
      await act(async () => {
        answer = await result.current.submitAnswer({
          questionId: 'q-001',
          gameType: 'quiz',
          answer: {},
        });
      });

      expect(answer).toBeNull();
      expect(result.current.error).toBe('Nenhuma sessão de jogo ativa');
    });

    it('deve tratar erro do use case', async () => {
      mockSubmitGameAnswer.execute.mockResolvedValue({
        success: false,
        error: 'Resposta já submetida',
      });

      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame();
      });

      let answer: GameAnswer | null = null;
      await act(async () => {
        answer = await result.current.submitAnswer({
          questionId: 'q-001',
          gameType: 'quiz',
          answer: {},
        });
      });

      expect(answer).toBeNull();
      expect(result.current.error).toBe('Resposta já submetida');
    });
  });

  // =====================================================
  // completeGame()
  // =====================================================
  describe('completeGame', () => {
    it('deve completar jogo e receber leaderboard + prémio', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame();
      });

      await act(async () => {
        await result.current.completeGame({
          gamesEnabled: true,
          gamesMode: 'selection',
          gamesPrizeType: 'discount_percentage',
          gamesPrizeValue: '10',
          gamesPrizeProductId: null,
          gamesMinRoundsForPrize: 1,
          gamesQuestionsPerRound: 5,
        });
      });

      expect(result.current.leaderboard).toEqual(mockLeaderboard);
      expect(result.current.currentPrize).toEqual(mockPrize);
      expect(result.current.gameSession!.status).toBe('completed');
    });

    it('deve definir erro sem sessão ativa', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.completeGame({
          gamesEnabled: true,
          gamesMode: 'selection',
          gamesPrizeType: 'none',
          gamesPrizeValue: null,
          gamesPrizeProductId: null,
          gamesMinRoundsForPrize: 1,
          gamesQuestionsPerRound: 5,
        });
      });

      expect(result.current.error).toBe('Nenhuma sessão de jogo ativa');
    });

    it('deve tratar erro do use case', async () => {
      mockCompleteGameSession.execute.mockResolvedValue({
        success: false,
        error: 'Sessão já completada',
      });

      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.startGame();
      });

      await act(async () => {
        await result.current.completeGame({
          gamesEnabled: true,
          gamesMode: 'selection',
          gamesPrizeType: 'none',
          gamesPrizeValue: null,
          gamesPrizeProductId: null,
          gamesMinRoundsForPrize: 1,
          gamesQuestionsPerRound: 5,
        });
      });

      expect(result.current.error).toBe('Sessão já completada');
    });
  });

  // =====================================================
  // redeemPrize()
  // =====================================================
  describe('redeemPrize', () => {
    it('deve resgatar prémio com sucesso', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.redeemPrize('prize-001');
      });

      expect(result.current.currentPrize).not.toBeNull();
      expect(result.current.currentPrize!.redeemed).toBe(true);
    });

    it('deve tratar erro no resgate', async () => {
      mockRedeemGamePrize.execute.mockResolvedValue({
        success: false,
        error: 'Prémio já resgatado',
      });

      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.redeemPrize('prize-001');
      });

      expect(result.current.error).toBe('Prémio já resgatado');
    });
  });

  // =====================================================
  // refreshLeaderboard()
  // =====================================================
  describe('refreshLeaderboard', () => {
    it('deve atualizar leaderboard', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.refreshLeaderboard();
      });

      expect(result.current.leaderboard).toEqual(mockLeaderboard);
      expect(mockGetGameLeaderboard.execute).toHaveBeenCalledWith({ sessionId: 'session-abc' });
    });

    it('deve tratar erro ao carregar leaderboard', async () => {
      mockGetGameLeaderboard.execute.mockResolvedValue({
        success: false,
        error: 'Erro ao carregar',
      });

      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      await act(async () => {
        await result.current.refreshLeaderboard();
      });

      expect(result.current.error).toBe('Erro ao carregar');
    });
  });

  // =====================================================
  // reset()
  // =====================================================
  describe('reset', () => {
    it('deve limpar todo o estado', async () => {
      const { result } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

      // Fill state
      await act(async () => {
        await result.current.startGame();
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.gameSession).toBeNull();
      expect(result.current.questions).toEqual([]);
      expect(result.current.answers).toEqual([]);
      expect(result.current.currentPrize).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // =====================================================
  // Estabilidade de funções (useCallback)
  // =====================================================
  it('deve manter referências estáveis entre re-renders', () => {
    const { result, rerender } = renderHook(() => useGameSession({ sessionId: 'session-abc' }));

    const firstRender = {
      startGame: result.current.startGame,
      reset: result.current.reset,
      refreshLeaderboard: result.current.refreshLeaderboard,
      redeemPrize: result.current.redeemPrize,
    };

    rerender();

    expect(result.current.startGame).toBe(firstRender.startGame);
    expect(result.current.reset).toBe(firstRender.reset);
    expect(result.current.refreshLeaderboard).toBe(firstRender.refreshLeaderboard);
    expect(result.current.redeemPrize).toBe(firstRender.redeemPrize);
  });
});
