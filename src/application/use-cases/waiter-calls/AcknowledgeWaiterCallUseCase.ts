/**
 * AcknowledgeWaiterCallUseCase - Reconhece chamada (empregado a caminho)
 */

import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import { WaiterCall } from '@/domain/entities/WaiterCall';
import { Result, Results } from '../Result';

export class AcknowledgeWaiterCallUseCase {
  constructor(private waiterCallRepository: IWaiterCallRepository) {}

  async execute(id: string, staffId: string): Promise<Result<WaiterCall>> {
    try {
      const existing = await this.waiterCallRepository.findById(id);
      if (!existing) {
        return Results.error('Chamada não encontrada', 'NOT_FOUND');
      }

      if (existing.status !== 'pending') {
        return Results.error('Chamada já foi atendida', 'INVALID_STATUS');
      }

      const call = await this.waiterCallRepository.acknowledge(id, staffId);
      return Results.success(call);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao reconhecer chamada'
      );
    }
  }
}
