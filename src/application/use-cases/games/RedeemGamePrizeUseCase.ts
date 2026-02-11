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

      // Validate prize exists and is not already redeemed
      const existing = await this.gamePrizeRepository.findById(input.prizeId);
      if (!existing) {
        return Results.error('Prémio não encontrado', 'PRIZE_NOT_FOUND');
      }
      if (existing.redeemed) {
        return Results.error('Prémio já foi resgatado', 'PRIZE_ALREADY_REDEEMED');
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
