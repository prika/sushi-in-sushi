import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Restaurant, RestaurantFilter } from '@/domain/entities/Restaurant';
import { Result, Results } from '../Result';

interface GetAllRestaurantsInput {
  filter?: RestaurantFilter;
}

export class GetAllRestaurantsUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(input?: GetAllRestaurantsInput): Promise<Result<Restaurant[]>> {
    try {
      const restaurants = await this.restaurantRepository.findAll(input?.filter);
      return Results.success(restaurants);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao listar restaurantes'
      );
    }
  }
}
