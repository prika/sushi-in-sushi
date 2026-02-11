/**
 * RedeemGamePrizeUseCase - Resgata um prémio de jogo
 */

import { IGamePrizeRepository } from '@/domain/repositories/IGamePrizeRepository';
import { GamePrize } from '@/domain/entities/GamePrize';
import { Result, Results } from '../Result';

export class RedeemGamePrizeUseCase {
  constructor(private gamePrizeRepository: IGamePrizeRepository) {}

  async execute(input: { prizeId: string }): Promise<Result<GamePrize>> {
    try {
      if (!input.prizeId) {
        return Results.error('ID do prémio é obrigatório', 'MISSING_PRIZE_ID');
      }

      const prize = await this.gamePrizeRepository.redeem(input.prizeId);

      return Results.success(prize);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao resgatar prémio',
        'REDEEM_PRIZE_ERROR'
      );
    }
  }
}
