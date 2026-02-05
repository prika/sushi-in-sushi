/**
 * GetWaiterTablesUseCase - Obtém mesas atribuídas a um empregado
 */

import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { TableService } from '@/domain/services/TableService';
import { TableWithSession } from '@/domain/entities/Table';
import { TableStatus } from '@/domain/value-objects/TableStatus';
import { Location } from '@/domain/value-objects/Location';
import { Result, Results } from '../Result';

/**
 * DTO para mesa do empregado
 */
export interface WaiterTableDTO {
  id: string;
  number: number;
  name: string;
  location: Location;
  status: TableStatus;
  statusLabel: string;
  statusColor: string;
  isActive: boolean;
  hasActiveSession: boolean;
  activeSession: {
    id: string;
    isRodizio: boolean;
    numPeople: number;
    startedAt: string;
    totalAmount: number;
    durationMinutes: number;
  } | null;
}

/**
 * Input do use case
 */
export interface GetWaiterTablesInput {
  waiterId: string;
}

/**
 * Resposta do use case
 */
export interface GetWaiterTablesResponse {
  tables: WaiterTableDTO[];
  counts: {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
  };
  totalRevenue: number;
}

/**
 * Use case para obter mesas atribuídas a um empregado
 */
export class GetWaiterTablesUseCase {
  constructor(private tableRepository: ITableRepository) {}

  async execute(input: GetWaiterTablesInput): Promise<Result<GetWaiterTablesResponse>> {
    try {
      const { waiterId } = input;

      if (!waiterId) {
        return Results.error('ID do empregado é obrigatório');
      }

      const tables = await this.tableRepository.findByWaiter(waiterId);
      const now = new Date();

      // Mapear para DTOs
      const tableDTOs: WaiterTableDTO[] = tables.map((table) => this.mapToDTO(table, now));

      // Contar por status
      const counts = {
        total: tableDTOs.length,
        occupied: tableDTOs.filter((t) => t.status === 'occupied').length,
        available: tableDTOs.filter((t) => t.status === 'available').length,
        reserved: tableDTOs.filter((t) => t.status === 'reserved').length,
      };

      // Calcular total de faturação
      const totalRevenue = tableDTOs
        .filter((t) => t.activeSession)
        .reduce((sum, t) => sum + (t.activeSession?.totalAmount || 0), 0);

      return Results.success({
        tables: tableDTOs,
        counts,
        totalRevenue,
      });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar mesas do empregado'
      );
    }
  }

  private mapToDTO(table: TableWithSession, now: Date): WaiterTableDTO {
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
      hasActiveSession: !!table.activeSession,
      activeSession: table.activeSession
        ? {
            id: table.activeSession.id,
            isRodizio: table.activeSession.isRodizio,
            numPeople: table.activeSession.numPeople,
            startedAt: table.activeSession.startedAt.toISOString(),
            totalAmount: table.activeSession.totalAmount,
            durationMinutes,
          }
        : null,
    };
  }
}
