import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Restaurant } from '@/domain/entities/Restaurant';
import { Result, Results } from '../Result';

export class GetActiveRestaurantsUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(): Promise<Result<Restaurant[]>> {
    try {
      console.log('[GetActiveRestaurantsUseCase] Executing...');
      const restaurants = await this.restaurantRepository.findActive();
      console.log('[GetActiveRestaurantsUseCase] Success, restaurants:', restaurants.length);
      return Results.success(restaurants);
    } catch (error) {
      console.error('[GetActiveRestaurantsUseCase] Error:', error);
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao listar restaurantes ativos'
      );
    }
  }
}
