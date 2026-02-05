/**
 * DeleteClosureUseCase - Remove folga
 */

import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { Result, Results } from '../Result';

export class DeleteClosureUseCase {
  constructor(private closureRepository: IRestaurantClosureRepository) {}

  async execute(id: number): Promise<Result<void>> {
    try {
      const existing = await this.closureRepository.findById(id);
      if (!existing) {
        return Results.error('Folga não encontrada', 'NOT_FOUND');
      }

      await this.closureRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao remover folga'
      );
    }
  }
}
