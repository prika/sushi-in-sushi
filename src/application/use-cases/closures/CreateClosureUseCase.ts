/**
 * CreateClosureUseCase - Cria nova folga
 */

import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { RestaurantClosure, CreateClosureData } from '@/domain/entities/RestaurantClosure';
import { Result, Results } from '../Result';

export class CreateClosureUseCase {
  constructor(private closureRepository: IRestaurantClosureRepository) {}

  async execute(data: CreateClosureData, createdBy?: string): Promise<Result<RestaurantClosure>> {
    try {
      const closure = await this.closureRepository.create(data, createdBy);
      return Results.success(closure);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar folga'
      );
    }
  }
}
