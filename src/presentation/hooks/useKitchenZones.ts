'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseKitchenZoneRepository } from '@/infrastructure/repositories/SupabaseKitchenZoneRepository';
import {
  KitchenZone,
  CreateKitchenZoneData,
  UpdateKitchenZoneData,
  KitchenZoneWithCategoryCount,
} from '@/domain/entities/KitchenZone';
import {
  GetAllKitchenZonesUseCase,
  GetActiveKitchenZonesUseCase,
  CreateKitchenZoneUseCase,
  UpdateKitchenZoneUseCase,
  DeleteKitchenZoneUseCase,
} from '@/application/use-cases/kitchen-zones';

export interface UseKitchenZonesOptions {
  autoLoad?: boolean;
}

export interface UseKitchenZonesResult {
  zones: KitchenZoneWithCategoryCount[];
  activeZones: KitchenZone[];
  isLoading: boolean;
  error: string | null;
  create: (data: CreateKitchenZoneData) => Promise<KitchenZone | null>;
  update: (id: string, data: UpdateKitchenZoneData) => Promise<KitchenZone | null>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useKitchenZones(
  options: UseKitchenZonesOptions = {}
): UseKitchenZonesResult {
  const { autoLoad = true } = options;

  const [zones, setZones] = useState<KitchenZoneWithCategoryCount[]>([]);
  const [activeZones, setActiveZones] = useState<KitchenZone[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const useCasesRef = useRef<{
    getAllZones: GetAllKitchenZonesUseCase;
    getActiveZones: GetActiveKitchenZonesUseCase;
    createZone: CreateKitchenZoneUseCase;
    updateZone: UpdateKitchenZoneUseCase;
    deleteZone: DeleteKitchenZoneUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseKitchenZoneRepository();
    useCasesRef.current = {
      getAllZones: new GetAllKitchenZonesUseCase(repo),
      getActiveZones: new GetActiveKitchenZonesUseCase(repo),
      createZone: new CreateKitchenZoneUseCase(repo),
      updateZone: new UpdateKitchenZoneUseCase(repo),
      deleteZone: new DeleteKitchenZoneUseCase(repo),
    };
  }

  const { getAllZones, getActiveZones, createZone, updateZone, deleteZone } =
    useCasesRef.current;

  const fetchZones = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allResult, activeResult] = await Promise.all([
        getAllZones.execute(),
        getActiveZones.execute(),
      ]);

      if (allResult.success) {
        setZones(allResult.data);
      } else {
        setError(allResult.error);
      }

      if (activeResult.success) {
        setActiveZones(activeResult.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar zonas'
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAllZones, getActiveZones]);

  const create = useCallback(
    async (data: CreateKitchenZoneData): Promise<KitchenZone | null> => {
      setError(null);
      const result = await createZone.execute(data);
      if (result.success) {
        await fetchZones();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createZone, fetchZones]
  );

  const update = useCallback(
    async (id: string, data: UpdateKitchenZoneData): Promise<KitchenZone | null> => {
      setError(null);
      const result = await updateZone.execute({ id, data });
      if (result.success) {
        await fetchZones();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateZone, fetchZones]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      const result = await deleteZone.execute(id);
      if (result.success) {
        await fetchZones();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteZone, fetchZones]
  );

  useEffect(() => {
    if (autoLoad) {
      fetchZones();
    }
  }, [autoLoad, fetchZones]);

  return {
    zones,
    activeZones,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: fetchZones,
  };
}
