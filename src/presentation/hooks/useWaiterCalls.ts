"use client";

/**
 * useWaiterCalls - Hook para gestão de chamadas de empregado
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseWaiterCallRepository } from "@/infrastructure/repositories/SupabaseWaiterCallRepository";
import {
  WaiterCall,
  WaiterCallWithDetails,
  CreateWaiterCallData,
  WaiterCallFilter,
} from "@/domain/entities/WaiterCall";
import {
  GetAllWaiterCallsUseCase,
  GetPendingWaiterCallsUseCase,
  CreateWaiterCallUseCase,
  AcknowledgeWaiterCallUseCase,
  CompleteWaiterCallUseCase,
  CancelWaiterCallUseCase,
} from "@/application/use-cases/waiter-calls";

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
  create: (_data: CreateWaiterCallData) => Promise<WaiterCall | null>;
  acknowledge: (_id: string, _staffId: string) => Promise<WaiterCall | null>;
  complete: (_id: string) => Promise<WaiterCall | null>;
  cancel: (_id: string) => Promise<WaiterCall | null>;
  refresh: () => Promise<void>;
}

export function useWaiterCalls(
  options: UseWaiterCallsOptions = {},
): UseWaiterCallsResult {
  const { filter, autoLoad = true, pendingOnly = false, location } = options;

  const [calls, setCalls] = useState<WaiterCallWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repository and use-cases (stable instances via useRef - zero re-renders)
  const useCasesRef = useRef<{
    getAllCalls: GetAllWaiterCallsUseCase;
    getPendingCalls: GetPendingWaiterCallsUseCase;
    createCall: CreateWaiterCallUseCase;
    acknowledgeCall: AcknowledgeWaiterCallUseCase;
    completeCall: CompleteWaiterCallUseCase;
    cancelCall: CancelWaiterCallUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseWaiterCallRepository();
    useCasesRef.current = {
      getAllCalls: new GetAllWaiterCallsUseCase(repo),
      getPendingCalls: new GetPendingWaiterCallsUseCase(repo),
      createCall: new CreateWaiterCallUseCase(repo),
      acknowledgeCall: new AcknowledgeWaiterCallUseCase(repo),
      completeCall: new CompleteWaiterCallUseCase(repo),
      cancelCall: new CancelWaiterCallUseCase(repo),
    };
  }

  const {
    getAllCalls,
    getPendingCalls,
    createCall,
    acknowledgeCall,
    completeCall,
    cancelCall,
  } = useCasesRef.current;

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
      setError(
        err instanceof Error ? err.message : "Erro ao carregar chamadas",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter, pendingOnly, location, getAllCalls, getPendingCalls]);

  const create = useCallback(
    async (data: CreateWaiterCallData): Promise<WaiterCall | null> => {
      setError(null);
      const result = await createCall.execute(data);
      if (result.success) {
        await fetchCalls();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createCall, fetchCalls],
  );

  const acknowledge = useCallback(
    async (id: string, staffId: string): Promise<WaiterCall | null> => {
      setError(null);
      const result = await acknowledgeCall.execute(id, staffId);
      if (result.success) {
        await fetchCalls();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [acknowledgeCall, fetchCalls],
  );

  const complete = useCallback(
    async (id: string): Promise<WaiterCall | null> => {
      setError(null);
      const result = await completeCall.execute(id);
      if (result.success) {
        await fetchCalls();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [completeCall, fetchCalls],
  );

  const cancel = useCallback(
    async (id: string): Promise<WaiterCall | null> => {
      setError(null);
      const result = await cancelCall.execute(id);
      if (result.success) {
        await fetchCalls();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [cancelCall, fetchCalls],
  );

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
