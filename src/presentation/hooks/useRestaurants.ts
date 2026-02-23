"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
  RestaurantFilter,
} from "@/domain/entities/Restaurant";
import {
  GetAllRestaurantsUseCase,
  CreateRestaurantUseCase,
  UpdateRestaurantUseCase,
  DeleteRestaurantUseCase,
} from "@/application/use-cases/restaurants";

export interface UseRestaurantsOptions {
  filter?: RestaurantFilter;
  autoLoad?: boolean;
}

export interface UseRestaurantsResult {
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
  create: (_data: CreateRestaurantData) => Promise<Restaurant | null>;
  update: (
    _id: string,
    _data: UpdateRestaurantData,
  ) => Promise<Restaurant | null>;
  remove: (_id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useRestaurants(
  options: UseRestaurantsOptions = {},
): UseRestaurantsResult {
  const { filter, autoLoad = true } = options;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const useCasesRef = useRef<{
    getAllRestaurants: GetAllRestaurantsUseCase;
    createRestaurant: CreateRestaurantUseCase;
    updateRestaurant: UpdateRestaurantUseCase;
    deleteRestaurant: DeleteRestaurantUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseRestaurantRepository();
    useCasesRef.current = {
      getAllRestaurants: new GetAllRestaurantsUseCase(repo),
      createRestaurant: new CreateRestaurantUseCase(repo),
      updateRestaurant: new UpdateRestaurantUseCase(repo),
      deleteRestaurant: new DeleteRestaurantUseCase(repo),
    };
  }

  const {
    getAllRestaurants,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
  } = useCasesRef.current;

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllRestaurants.execute({ filter });

      if (result.success) {
        setRestaurants(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar restaurantes",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter, getAllRestaurants]);

  const create = useCallback(
    async (data: CreateRestaurantData): Promise<Restaurant | null> => {
      setError(null);
      const result = await createRestaurant.execute(data);
      if (result.success) {
        await fetchRestaurants();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createRestaurant, fetchRestaurants],
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateRestaurantData,
    ): Promise<Restaurant | null> => {
      setError(null);
      const result = await updateRestaurant.execute({ id, data });
      if (result.success) {
        await fetchRestaurants();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateRestaurant, fetchRestaurants],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      const result = await deleteRestaurant.execute(id);
      if (result.success) {
        await fetchRestaurants();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteRestaurant, fetchRestaurants],
  );

  useEffect(() => {
    if (autoLoad) {
      fetchRestaurants();
    }
  }, [autoLoad, fetchRestaurants]);

  return {
    restaurants,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: fetchRestaurants,
  };
}
