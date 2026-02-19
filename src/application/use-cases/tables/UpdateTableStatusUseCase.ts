/**
 * UpdateTableStatusUseCase - Atualiza o status de uma mesa
 */

import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { TableService } from '@/domain/services/TableService';
import { TableStatus } from '@/domain/value-objects/TableStatus';
import { Result, Results } from '../Result';

/**
 * Input do use case
 */
export interface UpdateTableStatusInput {
  tableId: string;
  newStatus: TableStatus;
}

/**
 * Resposta do use case
 */
export interface UpdateTableStatusResponse {
  id: string;
  previousStatus: TableStatus;
  newStatus: TableStatus;
}

/**
 * Use case para atualizar o status de uma mesa
 */
export class UpdateTableStatusUseCase {
  constructor(private tableRepository: ITableRepository) {}

  async execute(input: UpdateTableStatusInput): Promise<Result<UpdateTableStatusResponse>> {
    try {
      const { tableId, newStatus } = input;

      if (!tableId) {
        return Results.error('ID da mesa é obrigatório');
      }

      if (!newStatus) {
        return Results.error('Novo status é obrigatório');
      }

      // Buscar mesa atual
      const table = await this.tableRepository.findById(tableId);

      if (!table) {
        return Results.error('Mesa não encontrada', 'TABLE_NOT_FOUND');
      }

      // Validar transição de status
      const validation = TableService.canChangeStatus(table, newStatus);
      if (!validation.isValid) {
        return Results.error(validation.error || 'Transição de status inválida');
      }

      const previousStatus = table.status;

      // Atualizar status
      await this.tableRepository.updateStatus(tableId, newStatus);

      return Results.success({
        id: tableId,
        previousStatus,
        newStatus,
      });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar status da mesa'
      );
    }
  }
}
