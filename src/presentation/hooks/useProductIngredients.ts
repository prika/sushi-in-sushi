"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ProductIngredient,
  SetProductIngredientsData,
} from "@/domain/entities/ProductIngredient";

export interface UseProductIngredientsResult {
  productIngredients: ProductIngredient[];
  isLoading: boolean;
  error: string | null;
  setIngredients: (
    _data: SetProductIngredientsData,
  ) => Promise<ProductIngredient[] | null>;
  refresh: () => Promise<void>;
}

export function useProductIngredients(
  productId: string | null,
): UseProductIngredientsResult {
  const [productIngredients, setProductIngredients] = useState<
    ProductIngredient[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIngredients = useCallback(async () => {
    if (!productId) {
      setProductIngredients([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/product-ingredients?productId=${productId}`,
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao carregar ingredientes do produto");
        return;
      }
      const data = await res.json();
      setProductIngredients(
        data.map((d: Record<string, unknown>) => ({
          ...d,
          createdAt: new Date(d.createdAt as string),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar ingredientes do produto",
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const setIngredients = useCallback(
    async (
      data: SetProductIngredientsData,
    ): Promise<ProductIngredient[] | null> => {
      setError(null);
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/product-ingredients", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) {
          setError(
            result.error || "Erro ao definir ingredientes do produto",
          );
          return null;
        }
        const mapped = result.map((d: Record<string, unknown>) => ({
          ...d,
          createdAt: new Date(d.createdAt as string),
        }));
        setProductIngredients(mapped);
        return mapped;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao definir ingredientes do produto",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  return {
    productIngredients,
    isLoading,
    error,
    setIngredients,
    refresh: fetchIngredients,
  };
}
