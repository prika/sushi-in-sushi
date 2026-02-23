"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SupabaseCategoryRepository } from "@/infrastructure/repositories/SupabaseCategoryRepository";
import {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryWithCount,
} from "@/domain/entities/Category";
import {
  GetAllCategoriesUseCase,
  CreateCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
} from "@/application/use-cases/categories";

export interface UseCategoriesOptions {
  autoLoad?: boolean;
}

export interface UseCategoriesResult {
  categories: CategoryWithCount[];
  isLoading: boolean;
  error: string | null;
  create: (_data: CreateCategoryData) => Promise<Category | null>;
  update: (_id: string, _data: UpdateCategoryData) => Promise<Category | null>;
  remove: (_id: string) => Promise<boolean>;
  reorder: (_orderedIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCategories(
  options: UseCategoriesOptions = {},
): UseCategoriesResult {
  const { autoLoad = true } = options;

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const useCasesRef = useRef<{
    getAllCategories: GetAllCategoriesUseCase;
    createCategory: CreateCategoryUseCase;
    updateCategory: UpdateCategoryUseCase;
    deleteCategory: DeleteCategoryUseCase;
  }>();

  if (!useCasesRef.current) {
    const repo = new SupabaseCategoryRepository();
    useCasesRef.current = {
      getAllCategories: new GetAllCategoriesUseCase(repo),
      createCategory: new CreateCategoryUseCase(repo),
      updateCategory: new UpdateCategoryUseCase(repo),
      deleteCategory: new DeleteCategoryUseCase(repo),
    };
  }

  const { getAllCategories, createCategory, updateCategory, deleteCategory } =
    useCasesRef.current;

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllCategories.execute();

      if (result.success) {
        setCategories(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar categorias",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAllCategories]);

  const create = useCallback(
    async (data: CreateCategoryData): Promise<Category | null> => {
      setError(null);
      const result = await createCategory.execute(data);
      if (result.success) {
        await fetchCategories();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [createCategory, fetchCategories],
  );

  const update = useCallback(
    async (id: string, data: UpdateCategoryData): Promise<Category | null> => {
      setError(null);
      const result = await updateCategory.execute({ id, data });
      if (result.success) {
        await fetchCategories();
        return result.data;
      }
      setError(result.error);
      return null;
    },
    [updateCategory, fetchCategories],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      const result = await deleteCategory.execute(id);
      if (result.success) {
        await fetchCategories();
        return true;
      }
      setError(result.error);
      return false;
    },
    [deleteCategory, fetchCategories],
  );

  const reorder = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      // Optimistic update — reorder local state immediately
      setCategories((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        return orderedIds
          .map((id, i) => {
            const cat = map.get(id);
            return cat ? { ...cat, sortOrder: i } : null;
          })
          .filter((c): c is CategoryWithCount => c !== null);
      });

      // Persist to DB — batch updates, single refresh
      setError(null);
      try {
        const currentMap = new Map(categories.map((c) => [c.id, c.sortOrder]));
        for (let i = 0; i < orderedIds.length; i++) {
          if (currentMap.get(orderedIds[i]) !== i) {
            await updateCategory.execute({
              id: orderedIds[i],
              data: { sortOrder: i },
            });
          }
        }
        await fetchCategories();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao reordenar categorias",
        );
        await fetchCategories();
      }
    },
    [categories, updateCategory, fetchCategories],
  );

  useEffect(() => {
    if (autoLoad) {
      fetchCategories();
    }
  }, [autoLoad, fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    create,
    update,
    remove,
    reorder,
    refresh: fetchCategories,
  };
}
