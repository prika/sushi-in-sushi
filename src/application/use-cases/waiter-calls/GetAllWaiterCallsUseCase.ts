/**
 * GetAllWaiterCallsUseCase - Obtém todas as chamadas
 */

import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCallWithDetails, WaiterCallFilter } from '@/domain/entities/WaiterCall';
import { Result, Results } from '../Result';

export class GetAllWaiterCallsUseCase {
  constructor(private waiterCallRepository: IWaiterCallRepository) {}

  async execute(filter?: WaiterCallFilter): Promise<Result<WaiterCallWithDetails[]>> {
    try {
      const calls = await this.waiterCallRepository.findAll(filter);
      return Results.success(calls);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar chamadas'
      );
    }
  }
}
