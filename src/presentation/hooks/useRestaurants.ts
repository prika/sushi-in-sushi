"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
  RestaurantFilter,
} from "@/domain/entities/Restaurant";

function mapDates(r: Record<string, unknown>): Restaurant {
  return {
    ...r,
    createdAt: new Date(r.createdAt as string),
    updatedAt: new Date(r.updatedAt as string),
  } as Restaurant;
}

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

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter?.isActive !== undefined) {
        params.set("isActive", String(filter.isActive));
      }
      if (filter?.slug) {
        params.set("slug", filter.slug);
      }

      const qs = params.toString();
      const res = await fetch(`/api/restaurants${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao carregar restaurantes");
      }

      const data = await res.json();
      setRestaurants(data.map(mapDates));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar restaurantes",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter?.isActive, filter?.slug]);

  const create = useCallback(
    async (data: CreateRestaurantData): Promise<Restaurant | null> => {
      setError(null);
      try {
        const res = await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao criar restaurante");
        }

        const created = await res.json();
        await fetchRestaurants();
        return mapDates(created);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao criar restaurante",
        );
        return null;
      }
    },
    [fetchRestaurants],
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateRestaurantData,
    ): Promise<Restaurant | null> => {
      setError(null);
      try {
        const res = await fetch(`/api/restaurants/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao atualizar restaurante");
        }

        const updated = await res.json();
        await fetchRestaurants();
        return mapDates(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao atualizar restaurante",
        );
        return null;
      }
    },
    [fetchRestaurants],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/restaurants/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Erro ao apagar restaurante");
        }

        await fetchRestaurants();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao apagar restaurante",
        );
        return false;
      }
    },
    [fetchRestaurants],
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
