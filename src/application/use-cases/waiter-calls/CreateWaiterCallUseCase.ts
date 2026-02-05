/**
 * CreateWaiterCallUseCase - Cria nova chamada de empregado
 */

import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCall, CreateWaiterCallData } from '@/domain/entities/WaiterCall';
import { Result, Results } from '../Result';

export class CreateWaiterCallUseCase {
  constructor(private waiterCallRepository: IWaiterCallRepository) {}

  async execute(data: CreateWaiterCallData): Promise<Result<WaiterCall>> {
    try {
      const call = await this.waiterCallRepository.create(data);
      return Results.success(call);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar chamada'
      );
    }
  }
}
