/**
 * UpdateClosureUseCase - Atualiza folga
 */

import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { RestaurantClosure, UpdateClosureData } from '@/domain/entities/RestaurantClosure';
import { Result, Results } from '../Result';

export class UpdateClosureUseCase {
  constructor(private closureRepository: IRestaurantClosureRepository) {}

  async execute(id: number, data: UpdateClosureData): Promise<Result<RestaurantClosure>> {
    try {
      const existing = await this.closureRepository.findById(id);
      if (!existing) {
        return Results.error('Folga não encontrada', 'NOT_FOUND');
      }

      const closure = await this.closureRepository.update(id, data);
      return Results.success(closure);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar folga'
      );
    }
  }
}
