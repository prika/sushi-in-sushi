"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  image_url: string | null;
  is_available: boolean;
  is_rodizio: boolean;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  icon: string | null;
}

interface UseProductsOptions {
  onlyAvailable?: boolean;
  onlyRodizio?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { onlyAvailable = true, onlyRodizio } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // Fetch categories and products in parallel
    const [categoriesResult, productsResult] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);

    if (categoriesResult.error) {
      setError(categoriesResult.error.message);
    } else {
      setCategories(categoriesResult.data || []);
    }

    if (productsResult.error) {
      setError(productsResult.error.message);
    } else {
      let filteredProducts = productsResult.data || [];

      if (onlyAvailable) {
        filteredProducts = filteredProducts.filter((p) => p.is_available);
      }

      if (onlyRodizio !== undefined) {
        filteredProducts = filteredProducts.filter((p) => p.is_rodizio === onlyRodizio);
      }

      setProducts(filteredProducts);
    }

    setIsLoading(false);
  }, [onlyAvailable, onlyRodizio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};

    categories.forEach((category) => {
      grouped[category.id] = products.filter((p) => p.category_id === category.id);
    });

    return grouped;
  }, [products, categories]);

  // Filter by category
  const getProductsByCategory = useCallback(
    (categoryId: string | null) => {
      if (!categoryId) return products;
      return products.filter((p) => p.category_id === categoryId);
    },
    [products]
  );

  // Search products
  const searchProducts = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery)
      );
    },
    [products]
  );

  // Get single product
  const getProduct = useCallback(
    (productId: string) => {
      return products.find((p) => p.id === productId);
    },
    [products]
  );

  // Get category by id
  const getCategory = useCallback(
    (categoryId: string) => {
      return categories.find((c) => c.id === categoryId);
    },
    [categories]
  );

  // Categories with product counts
  const categoriesWithCounts = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      productCount: productsByCategory[category.id]?.length || 0,
    }));
  }, [categories, productsByCategory]);

  return {
    products,
    categories,
    categoriesWithCounts,
    productsByCategory,
    isLoading,
    error,
    getProductsByCategory,
    searchProducts,
    getProduct,
    getCategory,
    refetch: fetchData,
  };
}
