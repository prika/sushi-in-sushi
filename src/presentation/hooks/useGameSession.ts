'use client';

/**
 * useGameSession - Hook para gestão de sessões de jogo
 *
 * Abstrai toda a lógica de:
 * - Iniciar uma sessão de jogo
 * - Submeter respostas
 * - Completar uma sessão
 * - Leaderboard
 * - Prémios
 */

import { useState, useCallback } from 'react';
import { useDependencies } from '../contexts/DependencyContext';
import { GameSession } from '@/domain/entities/GameSession';
import { GameQuestion, GameType } from '@/domain/entities/GameQuestion';
import { GameAnswer } from '@/domain/entities/GameAnswer';
import { GamePrize } from '@/domain/entities/GamePrize';
import { GameConfig } from '@/domain/value-objects/GameConfig';
import { LeaderboardEntry } from '@/domain/repositories/IGameAnswerRepository';

export interface UseGameSessionOptions {
  sessionId: string;
}

export interface UseGameSessionResult {
  /** Sessão de jogo ativa */
  gameSession: GameSession | null;
  /** Perguntas da ronda atual */
  questions: GameQuestion[];
  /** Respostas submetidas na ronda atual */
  answers: GameAnswer[];
  /** Leaderboard da sessão (todas as rondas) */
  leaderboard: LeaderboardEntry[];
  /** Prémio ganho (se existir) */
  currentPrize: GamePrize | null;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Erro (se existir) */
  error: string | null;

  /** Iniciar uma nova sessão de jogo */
  startGame: (config?: { questionsPerRound?: number; restaurantId?: string | null }) => Promise<void>;
  /** Submeter resposta a uma pergunta */
  submitAnswer: (input: SubmitAnswerInput) => Promise<GameAnswer | null>;
  /** Completar a sessão de jogo */
  completeGame: (config: GameConfig) => Promise<void>;
  /** Resgatar um prémio */
  redeemPrize: (prizeId: string) => Promise<void>;
  /** Carregar leaderboard */
  refreshLeaderboard: () => Promise<void>;
  /** Reset do estado (para nova ronda) */
  reset: () => void;
}

export interface SubmitAnswerInput {
  questionId: string;
  gameType: GameType;
  answer: Record<string, unknown>;
  sessionCustomerId?: string | null;
  questionPoints?: number;
  correctAnswerIndex?: number | null;
}

export function useGameSession(options: UseGameSessionOptions): UseGameSessionResult {
  const { sessionId } = options;
  const {
    startGameSession,
    submitGameAnswer,
    completeGameSession,
    getGameLeaderboard,
    redeemGamePrize,
  } = useDependencies();

  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPrize, setCurrentPrize] = useState<GamePrize | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async (config?: { questionsPerRound?: number; restaurantId?: string | null }) => {
    setIsLoading(true);
    setError(null);
    setAnswers([]);
    setCurrentPrize(null);

    try {
      const result = await startGameSession.execute({
        sessionId,
        questionsPerRound: config?.questionsPerRound,
        restaurantId: config?.restaurantId,
      });

      if (result.success) {
        setGameSession(result.data.gameSession);
        setQuestions(result.data.questions);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar jogo');
    } finally {
      setIsLoading(false);
    }
  }, [startGameSession, sessionId]);

  const submitAnswer = useCallback(async (input: SubmitAnswerInput): Promise<GameAnswer | null> => {
    if (!gameSession) {
      setError('Nenhuma sessão de jogo ativa');
      return null;
    }

    setError(null);

    try {
      const result = await submitGameAnswer.execute({
        gameSessionId: gameSession.id,
        sessionCustomerId: input.sessionCustomerId,
        questionId: input.questionId,
        gameType: input.gameType,
        answer: input.answer,
        questionPoints: input.questionPoints,
        correctAnswerIndex: input.correctAnswerIndex,
      });

      if (result.success) {
        setAnswers(prev => [...prev, result.data]);
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao submeter resposta');
      return null;
    }
  }, [submitGameAnswer, gameSession]);

  const completeGame = useCallback(async (config: GameConfig) => {
    if (!gameSession) {
      setError('Nenhuma sessão de jogo ativa');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await completeGameSession.execute({
        gameSessionId: gameSession.id,
        sessionId,
        config,
      });

      if (result.success) {
        setLeaderboard(result.data.leaderboard);
        setCurrentPrize(result.data.prize);
        setGameSession(prev => prev ? { ...prev, status: 'completed' as const } : null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao completar jogo');
    } finally {
      setIsLoading(false);
    }
  }, [completeGameSession, gameSession, sessionId]);

  const redeemPrize = useCallback(async (prizeId: string) => {
    setError(null);

    try {
      const result = await redeemGamePrize.execute({ prizeId });

      if (result.success) {
        setCurrentPrize(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resgatar prémio');
    }
  }, [redeemGamePrize]);

  const refreshLeaderboard = useCallback(async () => {
    setError(null);

    try {
      const result = await getGameLeaderboard.execute({ sessionId });

      if (result.success) {
        setLeaderboard(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar leaderboard');
    }
  }, [getGameLeaderboard, sessionId]);

  const reset = useCallback(() => {
    setGameSession(null);
    setQuestions([]);
    setAnswers([]);
    setCurrentPrize(null);
    setError(null);
  }, []);

  return {
    gameSession,
    questions,
    answers,
    leaderboard,
    currentPrize,
    isLoading,
    error,
    startGame,
    submitAnswer,
    completeGame,
    redeemPrize,
    refreshLeaderboard,
    reset,
  };
}
