/**
 * GetAllClosuresUseCase - Obtém todas as folgas do restaurante
 */

import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { RestaurantClosure, ClosureFilter } from '@/domain/entities/RestaurantClosure';
import { Result, Results } from '../Result';

export class GetAllClosuresUseCase {
  constructor(private closureRepository: IRestaurantClosureRepository) {}

  async execute(filter?: ClosureFilter): Promise<Result<RestaurantClosure[]>> {
    try {
      const closures = await this.closureRepository.findAll(filter);
      return Results.success(closures);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar folgas'
      );
    }
  }
}
