/**
 * GetGameLeaderboardUseCase - Obtém o leaderboard de uma sessão
 */

import { IGameAnswerRepository, LeaderboardEntry } from '@/domain/repositories/IGameAnswerRepository';
import { GameService } from '@/domain/services/GameService';
import { Result, Results } from '../Result';

export class GetGameLeaderboardUseCase {
  constructor(private gameAnswerRepository: IGameAnswerRepository) {}

  async execute(input: { sessionId: string }): Promise<Result<LeaderboardEntry[]>> {
    try {
      if (!input.sessionId) {
        return Results.error('ID da sessão é obrigatório', 'MISSING_SESSION_ID');
      }

      const rawScores = await this.gameAnswerRepository.getSessionLeaderboard(input.sessionId);
      const leaderboard = GameService.buildLeaderboard(rawScores);

      return Results.success(leaderboard);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar leaderboard',
        'GET_LEADERBOARD_ERROR'
      );
    }
  }
}
