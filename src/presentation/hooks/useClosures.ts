'use client';

/**
 * useClosures - Hook para gestão de folgas do restaurante
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseRestaurantClosureRepository } from '@/infrastructure/repositories/SupabaseRestaurantClosureRepository';
import {
  RestaurantClosure,
  CreateClosureData,
  UpdateClosureData,
  ClosureFilter,
  ClosureCheckResult,
} from '@/domain/entities/RestaurantClosure';
import {
  GetAllClosuresUseCase,
  GetRecurringClosuresUseCase,
  CreateClosureUseCase,
  UpdateClosureUseCase,
  DeleteClosureUseCase,
  CheckClosureUseCase,
} from '@/application/use-cases/closures';

export interface UseClosuresOptions {
  filter?: ClosureFilter;
  autoLoad?: boolean;
  recurringOnly?: boolean;
}

export interface UseClosuresResult {
  closures: RestaurantClosure[];
  isLoading: boolean;
  error: string | null;
  create: (data: CreateClosureData, createdBy?: string) => Promise<RestaurantClosure | null>;
  update: (id: number, data: UpdateClosureData) => Promise<RestaurantClosure | null>;
  remove: (id: number) => Promise<boolean>;
  checkClosure: (date: string, location?: string) => Promise<ClosureCheckResult>;
  refresh: () => Promise<void>;
}

export function useClosures(options: UseClosuresOptions = {}): UseClosuresResult {
  const { filter, autoLoad = true, recurringOnly = false } = options;

  const [closures, setClosures] = useState<RestaurantClosure[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repository and use-cases
  const repository = new SupabaseRestaurantClosureRepository();
  const getAllClosures = new GetAllClosuresUseCase(repository);
  const getRecurringClosures = new GetRecurringClosuresUseCase(repository);
  const createClosure = new CreateClosureUseCase(repository);
  const updateClosure = new UpdateClosureUseCase(repository);
  const deleteClosure = new DeleteClosureUseCase(repository);
  const checkClosureUseCase = new CheckClosureUseCase(repository);

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
      setError(err instanceof Error ? err.message : 'Erro ao carregar folgas');
    } finally {
      setIsLoading(false);
    }
  }, [filter, recurringOnly]);

  const create = useCallback(async (data: CreateClosureData, createdBy?: string): Promise<RestaurantClosure | null> => {
    setError(null);
    const result = await createClosure.execute(data, createdBy);
    if (result.success) {
      await fetchClosures();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchClosures]);

  const update = useCallback(async (id: number, data: UpdateClosureData): Promise<RestaurantClosure | null> => {
    setError(null);
    const result = await updateClosure.execute(id, data);
    if (result.success) {
      await fetchClosures();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchClosures]);

  const remove = useCallback(async (id: number): Promise<boolean> => {
    setError(null);
    const result = await deleteClosure.execute(id);
    if (result.success) {
      await fetchClosures();
      return true;
    }
    setError(result.error);
    return false;
  }, [fetchClosures]);

  const checkClosure = useCallback(async (date: string, location?: string): Promise<ClosureCheckResult> => {
    const result = await checkClosureUseCase.execute(date, location);
    if (result.success) {
      return result.data;
    }
    return { isClosed: false };
  }, []);

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
