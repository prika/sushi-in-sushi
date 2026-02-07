"use client";

/**
 * useClosures - Hook para gestão de folgas do restaurante
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseRestaurantClosureRepository } from "@/infrastructure/repositories/SupabaseRestaurantClosureRepository";
import {
  RestaurantClosure,
  CreateClosureData,
  UpdateClosureData,
  ClosureFilter,
  ClosureCheckResult,
} from "@/domain/entities/RestaurantClosure";
import {
  GetAllClosuresUseCase,
  GetRecurringClosuresUseCase,
  CreateClosureUseCase,
  UpdateClosureUseCase,
  DeleteClosureUseCase,
  CheckClosureUseCase,
} from "@/application/use-cases/closures";

export interface UseClosuresOptions {
  filter?: ClosureFilter;
  autoLoad?: boolean;
  recurringOnly?: boolean;
}

export interface UseClosuresResult {
  closures: RestaurantClosure[];
  isLoading: boolean;
  error: string | null;
  create: (
    data: CreateClosureData,
    createdBy?: string,
  ) => Promise<RestaurantClosure | null>;
  update: (
    id: number,
    data: UpdateClosureData,
  ) => Promise<RestaurantClosure | null>;
  remove: (id: number) => Promise<boolean>;
  checkClosure: (
    date: string,
    location?: string,
  ) => Promise<ClosureCheckResult>;
  refresh: () => Promise<void>;
}

export function useClosures(
  options: UseClosuresOptions = {},
): UseClosuresResult {
  const { filter, autoLoad = true, recurringOnly = false } = options;

  const [closures, setClosures] = useState<RestaurantClosure[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repository and use-cases (stable instances via useRef - zero re-renders)
  const useCasesRef = useRef<{
    getAllClosures: GetAllClosuresUseCase;
    getRecurringClosures: GetRecurringClosuresUseCase;
    createClosure: CreateClosureUseCase;
    updateClosure: UpdateClosureUseCase;
    deleteClosure: DeleteClosureUseCase;
    checkClosureUseCase: CheckClosureUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseRestaurantClosureRepository();
    useCasesRef.current = {
      getAllClosures: new GetAllClosuresUseCase(repo),
      getRecurringClosures: new GetRecurringClosuresUseCase(repo),
      createClosure: new CreateClosureUseCase(repo),
      updateClosure: new UpdateClosureUseCase(repo),
      deleteClosure: new DeleteClosureUseCase(repo),
      checkClosureUseCase: new CheckClosureUseCase(repo),
    };
  }

  const { getAllClosures, getRecurringClosures, createClosure, updateClosure, deleteClosure, checkClosureUseCase } = useCasesRef.current;

  const fetchClosures = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = recurringOnly
        ? await getRecurringClosures.execute()
        : await getAllClosures.execute(filter);

      if (result.success) {
        setClosures(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar folgas");
    } finally {
      setIsLoading(false);
    }
  }, [filter, recurringOnly, getAllClosures, getRecurringClosures]);

  const create = useCallback(
    async (
      data: CreateClosureData,
      createdBy?: string,
    ): Promise<RestaurantClosure | null> => {
      setError(null);
      const result = await createClosure.execute(data, createdBy);
      if (result.success) {
        await fetchClosures();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createClosure, fetchClosures],
  );

  const update = useCallback(
    async (
      id: number,
      data: UpdateClosureData,
    ): Promise<RestaurantClosure | null> => {
      setError(null);
      const result = await updateClosure.execute(id, data);
      if (result.success) {
        await fetchClosures();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateClosure, fetchClosures],
  );

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      setError(null);
      const result = await deleteClosure.execute(id);
      if (result.success) {
        await fetchClosures();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteClosure, fetchClosures],
  );

  const checkClosure = useCallback(
    async (date: string, location?: string): Promise<ClosureCheckResult> => {
      const result = await checkClosureUseCase.execute(date, location);
      if (result.success) {
        return result.data;
      }
      return { isClosed: false };
    },
    [checkClosureUseCase],
  );

  useEffect(() => {
    if (autoLoad) {
      fetchClosures();
    }
  }, [autoLoad, fetchClosures]);

  return {
    closures,
    isLoading,
    error,
    create,
    update,
    remove,
    checkClosure,
    refresh: fetchClosures,
  };
}
