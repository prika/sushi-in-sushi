/**
 * GetAllTablesUseCase - Obtém todas as mesas
 */

import { ITableRepository, TableFilter } from '@/domain/repositories/ITableRepository';
import { TableService } from '@/domain/services/TableService';
import { TableFullStatus } from '@/domain/entities/Table';
import { TableStatus } from '@/domain/value-objects/TableStatus';
import { Location } from '@/types/database';
import { Result, Results } from '../Result';

/**
 * DTO para mesa na resposta
 */
export interface TableDTO {
  id: string;
  number: number;
  name: string;
  location: Location;
  status: TableStatus;
  statusLabel: string;
  statusColor: string;
  isActive: boolean;
  waiter: {
    id: string;
    name: string;
  } | null;
  activeSession: {
    id: string;
    isRodizio: boolean;
    numPeople: number;
    startedAt: string;
    totalAmount: number;
    pendingOrdersCount: number;
    durationMinutes: number;
  } | null;
}

/**
 * Estatísticas de mesas
 */
export interface TableStatisticsDTO {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  inactive: number;
  occupancyRate: number;
  totalRevenue: number;
  averageRevenuePerTable: number;
}

/**
 * Resposta do use case
 */
export interface GetAllTablesResponse {
  tables: TableDTO[];
  byStatus: Record<TableStatus, TableDTO[]>;
  byLocation: Record<Location, TableDTO[]>;
  statistics: TableStatisticsDTO;
}

/**
 * Use case para obter todas as mesas
 */
export class GetAllTablesUseCase {
  constructor(private tableRepository: ITableRepository) {}

  async execute(filter?: TableFilter): Promise<Result<GetAllTablesResponse>> {
    try {
      const tables = await this.tableRepository.findAllFullStatus(filter);
      const now = new Date();

      // Mapear para DTOs
      const tableDTOs: TableDTO[] = tables.map((table) => this.mapToDTO(table, now));

      // Agrupar por status
      const byStatus: Record<TableStatus, TableDTO[]> = {
        available: tableDTOs.filter((t) => t.status === 'available'),
        reserved: tableDTOs.filter((t) => t.status === 'reserved'),
        occupied: tableDTOs.filter((t) => t.status === 'occupied'),
        inactive: tableDTOs.filter((t) => t.status === 'inactive'),
      };

      // Agrupar por localização
      const byLocation: Record<Location, TableDTO[]> = {
        circunvalacao: tableDTOs.filter((t) => t.location === 'circunvalacao'),
        boavista: tableDTOs.filter((t) => t.location === 'boavista'),
      };

      // Estatísticas
      const statistics = TableService.getStatistics(tables);

      return Results.success({
        tables: tableDTOs,
        byStatus,
        byLocation,
        statistics,
      });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar mesas'
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
