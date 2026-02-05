'use client';

/**
 * useWaiterCalls - Hook para gestão de chamadas de empregado
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseWaiterCallRepository } from '@/infrastructure/repositories/SupabaseWaiterCallRepository';
import {
  WaiterCall,
  WaiterCallWithDetails,
  CreateWaiterCallData,
  WaiterCallFilter,
} from '@/domain/entities/WaiterCall';
import {
  GetAllWaiterCallsUseCase,
  GetPendingWaiterCallsUseCase,
  CreateWaiterCallUseCase,
  AcknowledgeWaiterCallUseCase,
  CompleteWaiterCallUseCase,
  CancelWaiterCallUseCase,
} from '@/application/use-cases/waiter-calls';

export interface UseWaiterCallsOptions {
  filter?: WaiterCallFilter;
  autoLoad?: boolean;
  pendingOnly?: boolean;
  location?: string;
}

export interface UseWaiterCallsResult {
  calls: WaiterCallWithDetails[];
  isLoading: boolean;
  error: string | null;
  create: (data: CreateWaiterCallData) => Promise<WaiterCall | null>;
  acknowledge: (id: string, staffId: string) => Promise<WaiterCall | null>;
  complete: (id: string) => Promise<WaiterCall | null>;
  cancel: (id: string) => Promise<WaiterCall | null>;
  refresh: () => Promise<void>;
}

export function useWaiterCalls(options: UseWaiterCallsOptions = {}): UseWaiterCallsResult {
  const { filter, autoLoad = true, pendingOnly = false, location } = options;

  const [calls, setCalls] = useState<WaiterCallWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repository and use-cases
  const repository = new SupabaseWaiterCallRepository();
  const getAllCalls = new GetAllWaiterCallsUseCase(repository);
  const getPendingCalls = new GetPendingWaiterCallsUseCase(repository);
  const createCall = new CreateWaiterCallUseCase(repository);
  const acknowledgeCall = new AcknowledgeWaiterCallUseCase(repository);
  const completeCall = new CompleteWaiterCallUseCase(repository);
  const cancelCall = new CancelWaiterCallUseCase(repository);

  const fetchCalls = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = pendingOnly
        ? await getPendingCalls.execute(location)
        : await getAllCalls.execute(filter);

      if (result.success) {
        setCalls(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar chamadas');
    } finally {
      setIsLoading(false);
    }
  }, [filter, pendingOnly, location]);

  const create = useCallback(async (data: CreateWaiterCallData): Promise<WaiterCall | null> => {
    setError(null);
    const result = await createCall.execute(data);
    if (result.success) {
      await fetchCalls();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCalls]);

  const acknowledge = useCallback(async (id: string, staffId: string): Promise<WaiterCall | null> => {
    setError(null);
    const result = await acknowledgeCall.execute(id, staffId);
    if (result.success) {
      await fetchCalls();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCalls]);

  const complete = useCallback(async (id: string): Promise<WaiterCall | null> => {
    setError(null);
    const result = await completeCall.execute(id);
    if (result.success) {
      await fetchCalls();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCalls]);

  const cancel = useCallback(async (id: string): Promise<WaiterCall | null> => {
    setError(null);
    const result = await cancelCall.execute(id);
    if (result.success) {
      await fetchCalls();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchCalls]);

  useEffect(() => {
    if (autoLoad) {
      fetchCalls();
    }
  }, [autoLoad, fetchCalls]);

  return {
    calls,
    isLoading,
    error,
    create,
    acknowledge,
    complete,
    cancel,
    refresh: fetchCalls,
  };
}
