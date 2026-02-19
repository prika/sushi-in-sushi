/**
 * GetRecurringClosuresUseCase - Obtém folgas semanais recorrentes
 */

import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { RestaurantClosure } from '@/domain/entities/RestaurantClosure';
import { Result, Results } from '../Result';

export class GetRecurringClosuresUseCase {
  constructor(private closureRepository: IRestaurantClosureRepository) {}

  async execute(): Promise<Result<RestaurantClosure[]>> {
    try {
      const closures = await this.closureRepository.findRecurring();
      return Results.success(closures);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar folgas semanais'
      );
    }
  }
}
