/**
 * CheckClosureUseCase - Verifica se restaurante está fechado numa data
 */

import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import { ClosureCheckResult } from '@/domain/entities/RestaurantClosure';
import { Result, Results } from '../Result';

export class CheckClosureUseCase {
  constructor(private closureRepository: IRestaurantClosureRepository) {}

  async execute(date: string, location?: string): Promise<Result<ClosureCheckResult>> {
    try {
      const result = await this.closureRepository.checkClosure(date, location);
      return Results.success(result);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao verificar folga'
      );
    }
  }
}
