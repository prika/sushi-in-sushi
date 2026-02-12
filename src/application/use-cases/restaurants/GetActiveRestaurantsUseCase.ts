import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Restaurant } from '@/domain/entities/Restaurant';
import { Result, Results } from '../Result';

export class GetActiveRestaurantsUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(): Promise<Result<Restaurant[]>> {
    try {
      const restaurants = await this.restaurantRepository.findActive();
      return Results.success(restaurants);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao listar restaurantes ativos'
      );
    }
  }
}
