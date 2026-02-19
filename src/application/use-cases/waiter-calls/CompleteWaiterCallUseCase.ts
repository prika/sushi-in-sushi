/**
 * CompleteWaiterCallUseCase - Conclui chamada (atendida)
 */

import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCall } from '@/domain/entities/WaiterCall';
import { Result, Results } from '../Result';

export class CompleteWaiterCallUseCase {
  constructor(private waiterCallRepository: IWaiterCallRepository) {}

  async execute(id: string): Promise<Result<WaiterCall>> {
    try {
      const existing = await this.waiterCallRepository.findById(id);
      if (!existing) {
        return Results.error('Chamada não encontrada', 'NOT_FOUND');
      }

      if (existing.status === 'completed') {
        return Results.error('Chamada já está concluída', 'ALREADY_COMPLETED');
      }

      if (existing.status === 'cancelled') {
        return Results.error('Chamada foi cancelada', 'INVALID_STATUS');
      }

      const call = await this.waiterCallRepository.complete(id);
      return Results.success(call);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao concluir chamada'
      );
    }
  }
}
