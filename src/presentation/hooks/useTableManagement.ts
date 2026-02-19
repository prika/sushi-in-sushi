'use client';

/**
 * useTableManagement - Hook para gestão de mesas
 *
 * Este hook abstrai toda a lógica de:
 * - Fetch de mesas com status completo
 * - Subscrição real-time a alterações
 * - Operações de gestão de mesas e sessões
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDependencies } from '../contexts/DependencyContext';
import { TableDTO, TableStatisticsDTO } from '@/application/use-cases/tables/GetAllTablesUseCase';
import { TableStatus } from '@/domain/value-objects/TableStatus';
import { Location } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

/**
 * Opções do hook
 */
export interface UseTableManagementOptions {
  /**
   * Localização a filtrar (opcional)
   */
  location?: Location;

  /**
   * Ativar subscrição real-time (default: true)
   */
  realtime?: boolean;

  /**
   * Intervalo de refresh automático em ms (0 para desativar)
   */
  refreshInterval?: number;
}

/**
 * Resultado do hook
 */
export interface UseTableManagementResult {
  /**
   * Todas as mesas
   */
  tables: TableDTO[];

  /**
   * Mesas agrupadas por status
   */
  byStatus: Record<TableStatus, TableDTO[]>;

  /**
   * Mesas agrupadas por localização
   */
  byLocation: Record<Location, TableDTO[]>;

  /**
   * Estatísticas das mesas
   */
  statistics: TableStatisticsDTO;

  /**
   * Estado de carregamento
   */
  isLoading: boolean;

  /**
   * Erro (se existir)
   */
  error: string | null;

  /**
   * Força refresh dos dados
   */
  refresh: () => Promise<void>;

  /**
   * Altera o status de uma mesa
   */
  changeTableStatus: (
    tableId: string,
    newStatus: TableStatus,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;

  /**
   * Marca mesa como inativa
   */
  markTableInactive: (
    tableId: string,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;

  /**
   * Reativa uma mesa
   */
  reactivateTable: (tableId: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * Inicia uma sessão walk-in
   */
  startWalkInSession: (
    tableId: string,
    isRodizio: boolean,
    numPeople: number
  ) => Promise<{ success: boolean; sessionId?: string; error?: string }>;

  /**
   * Pede a conta de uma sessão
   */
  requestBill: (sessionId: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * Fecha uma sessão
   */
  closeSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook para gestão de mesas
 */
export function useTableManagement(
  options: UseTableManagementOptions = {}
): UseTableManagementResult {
  const {
    location,
    realtime = true,
    refreshInterval = 30000,
  } = options;

  const {
    tableRepository,
    startSession: startSessionUseCase,
    closeSession: closeSessionUseCase,
    requestBill: requestBillUseCase,
  } = useDependencies();

  // Estado
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [byStatus, setByStatus] = useState<Record<TableStatus, TableDTO[]>>({
    available: [],
    reserved: [],
    occupied: [],
    inactive: [],
  });
  const [byLocation, setByLocation] = useState<Record<Location, TableDTO[]>>({
    circunvalacao: [],
    boavista: [],
  });
  const [statistics, setStatistics] = useState<TableStatisticsDTO>({
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
    inactive: 0,
    occupancyRate: 0,
    totalRevenue: 0,
    averageRevenuePerTable: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const supabaseRef = useRef(createClient());

  /**
   * Carrega mesas do servidor
   */
  const fetchTables = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allTables = await tableRepository.findAllFullStatus(
        location ? { location } : undefined
      );
      const now = new Date();

      // Mapear para DTOs
      const tableDTOs: TableDTO[] = allTables.map((table) => {
        const durationMinutes = table.activeSession
          ? Math.floor((now.getTime() - table.activeSession.startedAt.getTime()) / 60000)
          : 0;

        return {
          id: table.id,
          number: table.number,
          name: table.name,
          location: table.location,
          status: table.status,
          statusLabel: getStatusLabel(table.status),
          statusColor: getStatusColor(table.status),
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
      });

      // Agrupar por status
      const grouped: Record<TableStatus, TableDTO[]> = {
        available: tableDTOs.filter((t) => t.status === 'available'),
        reserved: tableDTOs.filter((t) => t.status === 'reserved'),
        occupied: tableDTOs.filter((t) => t.status === 'occupied'),
        inactive: tableDTOs.filter((t) => t.status === 'inactive'),
      };

      // Agrupar por localização
      const byLoc: Record<Location, TableDTO[]> = {
        circunvalacao: tableDTOs.filter((t) => t.location === 'circunvalacao'),
        boavista: tableDTOs.filter((t) => t.location === 'boavista'),
      };

      // Calcular estatísticas
      const activeTables = grouped.available.length + grouped.occupied.length + grouped.reserved.length;
      const occupancyRate = activeTables > 0 ? (grouped.occupied.length / activeTables) * 100 : 0;
      const totalRevenue = tableDTOs
        .filter((t) => t.activeSession)
        .reduce((sum, t) => sum + (t.activeSession?.totalAmount || 0), 0);
      const averageRevenuePerTable = grouped.occupied.length > 0
        ? totalRevenue / grouped.occupied.length
        : 0;

      const stats: TableStatisticsDTO = {
        total: tableDTOs.length,
        available: grouped.available.length,
        occupied: grouped.occupied.length,
        reserved: grouped.reserved.length,
        inactive: grouped.inactive.length,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalRevenue,
        averageRevenuePerTable: Math.round(averageRevenuePerTable * 100) / 100,
      };

      setTables(tableDTOs);
      setByStatus(grouped);
      setByLocation(byLoc);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas');
    } finally {
      setIsLoading(false);
    }
  }, [tableRepository, location]);

  /**
   * Altera o status de uma mesa
   */
  const changeTableStatus = useCallback(
    async (
      tableId: string,
      newStatus: TableStatus,
      _reason?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await tableRepository.updateStatus(tableId, newStatus);
        await fetchTables();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Erro ao alterar estado',
        };
      }
    },
    [tableRepository, fetchTables]
  );

  /**
   * Marca mesa como inativa
   */
  const markTableInactive = useCallback(
    async (tableId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
      const table = tables.find((t) => t.id === tableId);
      if (table?.activeSession) {
        return {
          success: false,
          error: 'Não é possível desativar mesa com sessão ativa',
        };
      }
      return changeTableStatus(tableId, 'inactive', reason);
    },
    [tables, changeTableStatus]
  );

  /**
   * Reativa uma mesa
   */
  const reactivateTable = useCallback(
    async (tableId: string): Promise<{ success: boolean; error?: string }> => {
      return changeTableStatus(tableId, 'available', 'Mesa reativada');
    },
    [changeTableStatus]
  );

  /**
   * Inicia uma sessão walk-in
   */
  const startWalkInSession = useCallback(
    async (
      tableId: string,
      isRodizio: boolean,
      numPeople: number
    ): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
      const table = tables.find((t) => t.id === tableId);
      if (table?.status === 'occupied') {
        return { success: false, error: 'Mesa já está ocupada' };
      }
      if (table?.status === 'inactive') {
        return { success: false, error: 'Mesa está inativa' };
      }

      const result = await startSessionUseCase.execute({
        tableId,
        isRodizio,
        numPeople,
      });

      if (result.success && result.data) {
        await fetchTables();
        return { success: true, sessionId: result.data.id };
      } else {
        return { success: false, error: result.error ?? 'Erro ao iniciar sessão' };
      }
    },
    [tables, startSessionUseCase, fetchTables]
  );

  /**
   * Pede a conta de uma sessão
   */
  const requestBill = useCallback(
    async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      const result = await requestBillUseCase.execute({ sessionId });

      if (result.success) {
        await fetchTables();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    },
    [requestBillUseCase, fetchTables]
  );

  /**
   * Fecha uma sessão
   */
  const closeSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      const result = await closeSessionUseCase.execute({ sessionId });

      if (result.success) {
        await fetchTables();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    },
    [closeSessionUseCase, fetchTables]
  );

  // Fetch inicial
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchTables, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchTables]);

  // Real-time subscriptions
  useEffect(() => {
    if (!realtime) return;

    const supabase = supabaseRef.current;

    const tablesChannel = supabase
      .channel('tables-management-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => fetchTables()
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel('sessions-management-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => fetchTables()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [realtime, fetchTables]);

  return {
    tables,
    byStatus,
    byLocation,
    statistics,
    isLoading,
    error,
    refresh: fetchTables,
    changeTableStatus,
    markTableInactive,
    reactivateTable,
    startWalkInSession,
    requestBill,
    closeSession,
  };
}

// Helper functions
function getStatusLabel(status: TableStatus): string {
  const labels: Record<TableStatus, string> = {
    available: 'Disponível',
    reserved: 'Reservada',
    occupied: 'Ocupada',
    inactive: 'Inativa',
  };
  return labels[status];
}

function getStatusColor(status: TableStatus): string {
  const colors: Record<TableStatus, string> = {
    available: 'green',
    reserved: 'yellow',
    occupied: 'red',
    inactive: 'gray',
  };
  return colors[status];
}
