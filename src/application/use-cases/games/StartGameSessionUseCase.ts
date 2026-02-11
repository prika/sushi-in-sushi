/**
 * StartGameSessionUseCase - Inicia uma nova sessão de jogo
 */

import { IGameSessionRepository } from '@/domain/repositories/IGameSessionRepository';
import { IGameQuestionRepository } from '@/domain/repositories/IGameQuestionRepository';
import { GameSession } from '@/domain/entities/GameSession';
import { GameQuestion, GameType } from '@/domain/entities/GameQuestion';
import { Result, Results } from '../Result';

export interface StartGameSessionInput {
  sessionId: string;
  gameType?: GameType;
  questionsPerRound?: number;
  restaurantId?: string | null;
}

export interface StartGameSessionOutput {
  gameSession: GameSession;
  questions: GameQuestion[];
}

export class StartGameSessionUseCase {
  constructor(
    private gameSessionRepository: IGameSessionRepository,
    private gameQuestionRepository: IGameQuestionRepository
  ) {}

  async execute(input: StartGameSessionInput): Promise<Result<StartGameSessionOutput>> {
    try {
      if (!input.sessionId) {
        return Results.error('ID da sessão é obrigatório', 'MISSING_SESSION_ID');
      }

      const questionsPerRound = Math.max(1, Math.min(input.questionsPerRound ?? 5, 50));

      // Calculate round number from existing sessions
      const existingSessions = await this.gameSessionRepository.findBySessionId(input.sessionId);
      const roundNumber = existingSessions.length + 1;

      // Tinder mode: create session without fetching questions (products ARE the questions)
      if (input.gameType === 'tinder') {
        const gameSession = await this.gameSessionRepository.create({
          sessionId: input.sessionId,
          gameType: 'tinder',
          roundNumber,
          totalQuestions: 0,
        });
        return Results.success({ gameSession, questions: [] });
      }

      // Quiz/Preference: create session and fetch questions
      const gameSession = await this.gameSessionRepository.create({
        sessionId: input.sessionId,
        gameType: input.gameType ?? null,
        roundNumber,
        totalQuestions: questionsPerRound,
      });

      // Fetch random questions for this round, filtered by game type
      const gameTypes = input.gameType ? [input.gameType] : undefined;
      const questions = await this.gameQuestionRepository.findRandom(
        questionsPerRound,
        gameTypes,
        input.restaurantId
      );

      return Results.success({ gameSession, questions });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao iniciar sessão de jogo',
        'START_SESSION_ERROR'
      );
    }
  }
}
