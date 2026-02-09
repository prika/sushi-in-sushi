'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/SupabaseRestaurantRepository';
import { Restaurant } from '@/domain/entities/Restaurant';
import { GetActiveRestaurantsUseCase } from '@/application/use-cases/restaurants';

export interface UseLocationsResult {
  locations: Restaurant[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLocations(): UseLocationsResult {
  const [locations, setLocations] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useCaseRef = useRef<GetActiveRestaurantsUseCase>();

  if (!useCaseRef.current) {
    const repo = new SupabaseRestaurantRepository();
    useCaseRef.current = new GetActiveRestaurantsUseCase(repo);
  }

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useLocations] Fetching locations...');
      const result = await useCaseRef.current!.execute();

      console.log('[useLocations] Result:', result);

      if (result.success) {
        console.log('[useLocations] Locations loaded:', result.data.length);
        setLocations(result.data);
      } else {
        console.error('[useLocations] Error:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('[useLocations] Exception:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar localizações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    isLoading,
    error,
    refresh: fetchLocations,
  };
}
