/**
 * GetTableByIdUseCase - Obtém uma mesa por ID
 */

import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { TableService } from '@/domain/services/TableService';
import { TableFullStatus } from '@/domain/entities/Table';
import { TableDTO } from './GetAllTablesUseCase';
import { Result, Results } from '../Result';

/**
 * Input do use case
 */
export interface GetTableByIdInput {
  tableId: string;
}

/**
 * Use case para obter uma mesa por ID
 */
export class GetTableByIdUseCase {
  constructor(private tableRepository: ITableRepository) {}

  async execute(input: GetTableByIdInput): Promise<Result<TableDTO>> {
    try {
      const { tableId } = input;

      if (!tableId) {
        return Results.error('ID da mesa é obrigatório');
      }

      const table = await this.tableRepository.findByIdFullStatus(tableId);

      if (!table) {
        return Results.error('Mesa não encontrada', 'TABLE_NOT_FOUND');
      }

      const now = new Date();
      const dto = this.mapToDTO(table, now);

      return Results.success(dto);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar mesa'
      );
    }
  }

  private mapToDTO(table: TableFullStatus, now: Date): TableDTO {
    const durationMinutes = table.activeSession
      ? Math.floor((now.getTime() - table.activeSession.startedAt.getTime()) / 60000)
      : 0;

    return {
      id: table.id,
      number: table.number,
      name: table.name,
      location: table.location,
      status: table.status,
      statusLabel: TableService.getStatusLabel(table.status),
      statusColor: TableService.getStatusColor(table.status),
      isActive: table.isActive,
      waiter: table.waiter,
      activeSession: table.activeSession
        ? {
            id: table.activeSession.id,
            isRodizio: table.activeSession.isRodizio,
            numPeople: table.activeSession.numPeople,
            startedAt: table.activeSession.startedAt.toISOString(),
            totalAmount: table.activeSession.totalAmount,
            pendingOrdersCount: table.activeSession.pendingOrdersCount,
            durationMinutes,
          }
        : null,
    };
  }
}
