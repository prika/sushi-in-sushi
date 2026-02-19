/**
 * GetGameConfigUseCase - Obtém a configuração de jogos para um restaurante
 */

import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { GameConfig } from '@/domain/value-objects/GameConfig';
import { Result, Results } from '../Result';

export class GetGameConfigUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(input: { restaurantSlug: string }): Promise<Result<GameConfig>> {
    try {
      if (!input.restaurantSlug) {
        return Results.error('Slug do restaurante é obrigatório', 'MISSING_RESTAURANT_SLUG');
      }

      const restaurant = await this.restaurantRepository.findBySlug(input.restaurantSlug);

      if (!restaurant) {
        return Results.error('Restaurante não encontrado', 'RESTAURANT_NOT_FOUND');
      }

      const config: GameConfig = {
        gamesEnabled: restaurant.gamesEnabled,
        gamesMode: restaurant.gamesMode,
        gamesPrizeType: restaurant.gamesPrizeType,
        gamesPrizeValue: restaurant.gamesPrizeValue,
        gamesPrizeProductId: restaurant.gamesPrizeProductId,
        gamesMinRoundsForPrize: restaurant.gamesMinRoundsForPrize,
        gamesQuestionsPerRound: restaurant.gamesQuestionsPerRound,
      };

      return Results.success(config);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar configuração de jogos',
        'GET_CONFIG_ERROR'
      );
    }
  }
}
