"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Ingredient,
  CreateIngredientData,
  UpdateIngredientData,
  IngredientWithProductCount,
} from "@/domain/entities/Ingredient";

export interface UseIngredientsOptions {
  autoLoad?: boolean;
}

export interface UseIngredientsResult {
  ingredients: IngredientWithProductCount[];
  isLoading: boolean;
  error: string | null;
  create: (_data: CreateIngredientData) => Promise<Ingredient | null>;
  update: (
    _id: string,
    _data: UpdateIngredientData,
  ) => Promise<Ingredient | null>;
  remove: (_id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useIngredients(
  options: UseIngredientsOptions = {},
): UseIngredientsResult {
  const { autoLoad = true } = options;

  const [ingredients, setIngredients] = useState<IngredientWithProductCount[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const fetchIngredients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/ingredients");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao carregar ingredientes");
        return;
      }
      const data = await res.json();
      setIngredients(
        data.map((d: Record<string, unknown>) => ({
          ...d,
          allergens: (d.allergens as string[]) ?? [],
          createdAt: new Date(d.createdAt as string),
          updatedAt: new Date(d.updatedAt as string),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar ingredientes",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(
    async (data: CreateIngredientData): Promise<Ingredient | null> => {
      setError(null);
      try {
        const res = await fetch("/api/admin/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) {
          setError(result.error || "Erro ao criar ingrediente");
          return null;
        }
        await fetchIngredients();
        return {
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao criar ingrediente",
        );
        return null;
      }
    },
    [fetchIngredients],
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateIngredientData,
    ): Promise<Ingredient | null> => {
      setError(null);
      try {
        const res = await fetch("/api/admin/ingredients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...data }),
        });
        const result = await res.json();
        if (!res.ok) {
          setError(result.error || "Erro ao atualizar ingrediente");
          return null;
        }
        await fetchIngredients();
        return {
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao atualizar ingrediente",
        );
        return null;
      }
    },
    [fetchIngredients],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch("/api/admin/ingredients", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const result = await res.json();
          setError(result.error || "Erro ao eliminar ingrediente");
          return false;
        }
        await fetchIngredients();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao eliminar ingrediente",
        );
        return false;
      }
    },
    [fetchIngredients],
  );

  useEffect(() => {
    if (autoLoad) {
      fetchIngredients();
    }
  }, [autoLoad, fetchIngredients]);

  return {
    ingredients,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: fetchIngredients,
  };
}
