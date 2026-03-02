"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, CreateProductData, UpdateProductData } from "@/domain/entities/Product";
import type { CategoryWithCount } from "@/domain/entities/Category";
import { useMemo } from "react";

/**
 * useAdminProducts - Hook for admin product management via API routes.
 *
 * Uses /api/admin/products (server-side createAdminClient) to bypass RLS.
 * This replaces useProductsOptimized for admin pages where browser
 * Supabase client queries are blocked by RLS policies.
 */

interface UseAdminProductsOptions {
  availableOnly?: boolean;
  rodizioOnly?: boolean;
  categoryId?: string;
}

export function useAdminProducts(options: UseAdminProductsOptions = {}) {
  const queryClient = useQueryClient();

  // Fetch products and categories from admin API
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao obter produtos" }));
        throw new Error(err.error || "Erro ao obter produtos");
      }
      return res.json() as Promise<{
        products: Product[];
        categories: CategoryWithCount[];
      }>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const allProducts = useMemo(() => data?.products ?? [], [data?.products]);
  const categories = data?.categories ?? [];

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    if (options.availableOnly) {
      filtered = filtered.filter((p) => p.isAvailable);
    }
    if (options.rodizioOnly) {
      filtered = filtered.filter((p) => p.isRodizio);
    }
    if (options.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === options.categoryId);
    }
    return filtered;
  }, [allProducts, options.availableOnly, options.rodizioOnly, options.categoryId]);

  // Group by category
  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    filteredProducts.forEach((product) => {
      const list = grouped.get(product.categoryId) || [];
      list.push(product);
      grouped.set(product.categoryId, list);
    });
    return grouped;
  }, [filteredProducts]);

  // Create mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: CreateProductData) => {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao criar produto" }));
        throw new Error(err.error);
      }
      return res.json() as Promise<Product>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Update mutation with optimistic update
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: UpdateProductData }) => {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updateData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao atualizar produto" }));
        throw new Error(err.error);
      }
      return res.json() as Promise<Product>;
    },
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-products"] });
      const previous = queryClient.getQueryData<{ products: Product[]; categories: CategoryWithCount[] }>(["admin-products"]);
      if (previous) {
        queryClient.setQueryData(["admin-products"], {
          ...previous,
          products: previous.products.map((p) =>
            p.id === id ? { ...p, ...updateData, updatedAt: new Date() } : p,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-products"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Delete mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao eliminar produto" }));
        throw new Error(err.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const getProductById = (id: string) => allProducts.find((p) => p.id === id);
  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  const refresh = () => refetch();

  return {
    products: filteredProducts,
    allProducts,
    categories,
    productsByCategory,
    isLoading,
    loadingProducts: isLoading,
    loadingCategories: isLoading,
    error,
    productsError: error,
    categoriesError: null,
    getProductById,
    getCategoryById,
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    refresh,
  };
}
