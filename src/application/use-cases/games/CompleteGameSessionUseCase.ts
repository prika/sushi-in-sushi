/**
 * CompleteGameSessionUseCase - Completa uma sessão de jogo e verifica prémios
 */

import { IGameSessionRepository } from '@/domain/repositories/IGameSessionRepository';
import { IGameAnswerRepository, LeaderboardEntry } from '@/domain/repositories/IGameAnswerRepository';
import { IGamePrizeRepository } from '@/domain/repositories/IGamePrizeRepository';
import { GamePrize } from '@/domain/entities/GamePrize';
import { GameConfig } from '@/domain/value-objects/GameConfig';
import { GameService } from '@/domain/services/GameService';
import { Result, Results } from '../Result';

export interface CompleteGameSessionInput {
  gameSessionId: string;
  sessionId: string;
  config: GameConfig;
}

export interface CompleteGameSessionOutput {
  leaderboard: LeaderboardEntry[];
  prize: GamePrize | null;
}

export class CompleteGameSessionUseCase {
  constructor(
    private gameSessionRepository: IGameSessionRepository,
    private gameAnswerRepository: IGameAnswerRepository,
    private gamePrizeRepository: IGamePrizeRepository
  ) {}

  async execute(input: CompleteGameSessionInput): Promise<Result<CompleteGameSessionOutput>> {
    try {
      if (!input.gameSessionId) {
        return Results.error('ID da sessão de jogo é obrigatório', 'MISSING_GAME_SESSION_ID');
      }

      // Complete the game session
      await this.gameSessionRepository.complete(input.gameSessionId);

      // Get leaderboard for this session
      const rawLeaderboard = await this.gameAnswerRepository.getSessionLeaderboard(input.sessionId);

      // Get rounds played for prize eligibility
      const completedSessions = await this.gameSessionRepository.findBySessionId(
        input.sessionId,
        'completed'
      );
      const roundsPlayed = completedSessions.length;

      // Check if prize should be awarded
      let prize: GamePrize | null = null;
      const hasParticipants = rawLeaderboard.length > 0;

      if (GameService.shouldAwardPrize(input.config, roundsPlayed, hasParticipants)) {
        const topScorer = rawLeaderboard[0];
        const prizeType = input.config.gamesPrizeType;

        // shouldAwardPrize already guards against 'none', but be safe
        if (prizeType !== 'none' && topScorer) {
          const prizeDescription = GameService.buildPrizeDescription(
            prizeType,
            input.config.gamesPrizeValue
          );

          prize = await this.gamePrizeRepository.create({
            sessionId: input.sessionId,
            gameSessionId: input.gameSessionId,
            sessionCustomerId: topScorer.sessionCustomerId,
            displayName: topScorer.displayName,
            prizeType,
            prizeValue: input.config.gamesPrizeValue ?? '',
            prizeDescription,
            totalScore: topScorer.totalScore,
          });
        }
      }

      return Results.success({ leaderboard: rawLeaderboard, prize });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao completar sessão de jogo',
        'COMPLETE_SESSION_ERROR'
      );
    }
  }
}
