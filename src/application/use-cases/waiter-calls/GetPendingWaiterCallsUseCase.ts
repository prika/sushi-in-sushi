/**
 * GetPendingWaiterCallsUseCase - Obtém chamadas pendentes
 */

import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCallWithDetails } from '@/domain/entities/WaiterCall';
import { Result, Results } from '../Result';

export class GetPendingWaiterCallsUseCase {
  constructor(private waiterCallRepository: IWaiterCallRepository) {}

  async execute(location?: string): Promise<Result<WaiterCallWithDetails[]>> {
    try {
      const calls = await this.waiterCallRepository.findPending(location);
      return Results.success(calls);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar chamadas pendentes'
      );
    }
  }
}
