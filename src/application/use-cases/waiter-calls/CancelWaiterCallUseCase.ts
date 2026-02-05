/**
 * CancelWaiterCallUseCase - Cancela chamada
 */

import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCall } from '@/domain/entities/WaiterCall';
import { Result, Results } from '../Result';

export class CancelWaiterCallUseCase {
  constructor(private waiterCallRepository: IWaiterCallRepository) {}

  async execute(id: string): Promise<Result<WaiterCall>> {
    try {
      const existing = await this.waiterCallRepository.findById(id);
      if (!existing) {
        return Results.error('Chamada não encontrada', 'NOT_FOUND');
      }

      if (existing.status === 'completed') {
        return Results.error('Não é possível cancelar chamada concluída', 'INVALID_STATUS');
      }

      if (existing.status === 'cancelled') {
        return Results.error('Chamada já está cancelada', 'ALREADY_CANCELLED');
      }

      const call = await this.waiterCallRepository.cancel(id);
      return Results.success(call);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao cancelar chamada'
      );
    }
  }
}
