"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseProductIngredientRepository } from "@/infrastructure/repositories/SupabaseProductIngredientRepository";
import {
  ProductIngredient,
  SetProductIngredientsData,
} from "@/domain/entities/ProductIngredient";
import {
  GetProductIngredientsUseCase,
  SetProductIngredientsUseCase,
} from "@/application/use-cases/product-ingredients";

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

  const useCasesRef = useRef<{
    getProductIngredients: GetProductIngredientsUseCase;
    setProductIngredientsUseCase: SetProductIngredientsUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseProductIngredientRepository();
    useCasesRef.current = {
      getProductIngredients: new GetProductIngredientsUseCase(repo),
      setProductIngredientsUseCase: new SetProductIngredientsUseCase(repo),
    };
  }

  const { getProductIngredients, setProductIngredientsUseCase } =
    useCasesRef.current;

  const fetchIngredients = useCallback(async () => {
    if (!productId) {
      setProductIngredients([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getProductIngredients.execute(productId);
      if (result.success) {
        setProductIngredients(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar ingredientes do produto",
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId, getProductIngredients]);

  const setIngredients = useCallback(
    async (
      data: SetProductIngredientsData,
    ): Promise<ProductIngredient[] | null> => {
      setError(null);
      const result = await setProductIngredientsUseCase.execute(data);
      if (result.success) {
        setProductIngredients(result.data);
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [setProductIngredientsUseCase],
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
