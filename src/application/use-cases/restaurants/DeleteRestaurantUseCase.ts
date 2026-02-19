import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import { Result, Results } from '../Result';

export class DeleteRestaurantUseCase {
  constructor(private restaurantRepository: IRestaurantRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      // Check if restaurant exists
      const existing = await this.restaurantRepository.findById(id);
      if (!existing) {
        return Results.error('Restaurante não encontrado', 'NOT_FOUND');
      }

      await this.restaurantRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao eliminar restaurante'
      );
    }
  }
}
