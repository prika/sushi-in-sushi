'use client';

/**
 * useSessionManagement - Hook para gestão de sessões
 *
 * Fornece acesso às sessões ativas e operações de sessão
 * usando a arquitectura em camadas.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  useGetActiveSessionsUseCase,
  useStartSessionUseCase,
  useCloseSessionUseCase,
  useRequestBillUseCase,
} from '../contexts/DependencyContext';
import { SessionWithStats } from '@/application/use-cases/sessions/GetActiveSessionsUseCase';
import { Location } from '@/types/database';

interface UseSessionManagementOptions {
  location?: Location;
  enableRealtime?: boolean;
  refreshInterval?: number;
}

interface UseSessionManagementReturn {
  sessions: SessionWithStats[];
  counts: {
    active: number;
    pendingPayment: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startSession: (params: {
    tableId: string;
    isRodizio: boolean;
    numPeople: number;
  }) => Promise<{ success: boolean; error?: string }>;
  closeSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  requestBill: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useSessionManagement(
  options: UseSessionManagementOptions = {}
): UseSessionManagementReturn {
  const { location, enableRealtime = true, refreshInterval = 0 } = options;

  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [counts, setCounts] = useState({ active: 0, pendingPayment: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use cases
  const getActiveSessionsUseCase = useGetActiveSessionsUseCase();
  const startSessionUseCase = useStartSessionUseCase();
  const closeSessionUseCase = useCloseSessionUseCase();
  const requestBillUseCase = useRequestBillUseCase();

  const fetchSessions = useCallback(async () => {
    try {
      const result = await getActiveSessionsUseCase.execute({ location });

      if (result.success && result.data) {
        setSessions(result.data.sessions);
        setCounts(result.data.counts);
        setError(null);
      } else {
        setError(result.error || 'Erro ao carregar sessões');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [getActiveSessionsUseCase, location]);

  // Fetch inicial
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchSessions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSessions, refreshInterval]);

  // Real-time subscriptions
  useEffect(() => {
    if (!enableRealtime) return;

    const supabase = createClient();

    const channel = supabase
      .channel('sessions-management')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, fetchSessions]);

  const startSession = useCallback(
    async (params: { tableId: string; isRodizio: boolean; numPeople: number }) => {
      const result = await startSessionUseCase.execute(params);

      if (result.success) {
        await fetchSessions();
      }

      return {
        success: result.success,
        error: result.error,
      };
    },
    [startSessionUseCase, fetchSessions]
  );

  const closeSession = useCallback(
    async (sessionId: string) => {
      const result = await closeSessionUseCase.execute({ sessionId });

      if (result.success) {
        await fetchSessions();
      }

      return {
        success: result.success,
        error: result.error,
      };
    },
    [closeSessionUseCase, fetchSessions]
  );

  const requestBill = useCallback(
    async (sessionId: string) => {
      const result = await requestBillUseCase.execute({ sessionId });

      if (result.success) {
        await fetchSessions();
      }

      return {
        success: result.success,
        error: result.error,
      };
    },
    [requestBillUseCase, fetchSessions]
  );

  return {
    sessions,
    counts,
    isLoading,
    error,
    refresh: fetchSessions,
    startSession,
    closeSession,
    requestBill,
  };
}
