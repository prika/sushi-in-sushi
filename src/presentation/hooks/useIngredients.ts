"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseIngredientRepository } from "@/infrastructure/repositories/SupabaseIngredientRepository";
import {
  Ingredient,
  CreateIngredientData,
  UpdateIngredientData,
  IngredientWithProductCount,
} from "@/domain/entities/Ingredient";
import {
  GetAllIngredientsUseCase,
  CreateIngredientUseCase,
  UpdateIngredientUseCase,
  DeleteIngredientUseCase,
} from "@/application/use-cases/ingredients";

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

  const useCasesRef = useRef<{
    getAllIngredients: GetAllIngredientsUseCase;
    createIngredient: CreateIngredientUseCase;
    updateIngredient: UpdateIngredientUseCase;
    deleteIngredient: DeleteIngredientUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseIngredientRepository();
    useCasesRef.current = {
      getAllIngredients: new GetAllIngredientsUseCase(repo),
      createIngredient: new CreateIngredientUseCase(repo),
      updateIngredient: new UpdateIngredientUseCase(repo),
      deleteIngredient: new DeleteIngredientUseCase(repo),
    };
  }

  const {
    getAllIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
  } = useCasesRef.current;

  const fetchIngredients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllIngredients.execute();

      if (result.success) {
        setIngredients(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar ingredientes",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAllIngredients]);

  const create = useCallback(
    async (data: CreateIngredientData): Promise<Ingredient | null> => {
      setError(null);
      const result = await createIngredient.execute(data);
      if (result.success) {
        await fetchIngredients();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createIngredient, fetchIngredients],
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateIngredientData,
    ): Promise<Ingredient | null> => {
      setError(null);
      const result = await updateIngredient.execute({ id, data });
      if (result.success) {
        await fetchIngredients();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateIngredient, fetchIngredients],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      const result = await deleteIngredient.execute(id);
      if (result.success) {
        await fetchIngredients();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteIngredient, fetchIngredients],
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
