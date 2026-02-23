"use client";

/**
 * useProducts - Hook para gestão de produtos
 *
 * Este hook abstrai toda a lógica de:
 * - Fetch de produtos e categorias
 * - Filtragem por disponibilidade e rodízio
 * - Pesquisa de produtos
 * - Agrupamento por categoria
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDependencies } from "../contexts/DependencyContext";
import { Product } from "@/domain/entities/Product";
import { Category, CategoryWithCount } from "@/domain/entities/Category";

/**
 * Opções do hook
 */
export interface UseProductsOptions {
  /**
   * Mostrar apenas produtos disponíveis (default: true)
   */
  onlyAvailable?: boolean;

  /**
   * Mostrar apenas produtos de rodízio (opcional)
   */
  onlyRodizio?: boolean;

  /**
   * Categoria inicial a filtrar (opcional)
   */
  initialCategoryId?: string;
}

/**
 * Resultado do hook
 */
export interface UseProductsResult {
  /**
   * Lista de produtos
   */
  products: Product[];

  /**
   * Lista de categorias
   */
  categories: Category[];

  /**
   * Categorias com contagem de produtos
   */
  categoriesWithCount: CategoryWithCount[];

  /**
   * Produtos agrupados por categoria
   */
  productsByCategory: Record<string, Product[]>;

  /**
   * Estado de carregamento
   */
  isLoading: boolean;

  /**
   * Erro (se existir)
   */
  error: string | null;

  /**
   * Categoria selecionada
   */
  selectedCategoryId: string | null;

  /**
   * Query de pesquisa atual
   */
  searchQuery: string;

  /**
   * Produtos filtrados (pela categoria e pesquisa)
   */
  filteredProducts: Product[];

  /**
   * Seleciona uma categoria
   */
  selectCategory: (_categoryId: string | null) => void;

  /**
   * Define query de pesquisa
   */
  setSearchQuery: (_query: string) => void;

  /**
   * Obtém um produto por ID
   */
  getProduct: (_id: string) => Product | undefined;

  /**
   * Obtém uma categoria por ID
   */
  getCategory: (_id: string) => Category | undefined;

  /**
   * Força refresh dos dados
   */
  refresh: () => Promise<void>;
}

/**
 * Hook para gestão de produtos
 */
export function useProducts(
  options: UseProductsOptions = {},
): UseProductsResult {
  const { onlyAvailable = true, onlyRodizio, initialCategoryId } = options;

  const { productRepository, categoryRepository } = useDependencies();

  // Estado
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesWithCount, setCategoriesWithCount] = useState<
    CategoryWithCount[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId || null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Carrega produtos e categorias
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [productsData, categoriesData] = await Promise.all([
        productRepository.findAll({
          onlyAvailable,
          onlyRodizio,
        }),
        categoryRepository.findAllWithCount(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setCategoriesWithCount(categoriesData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar produtos",
      );
    } finally {
      setIsLoading(false);
    }
  }, [productRepository, categoryRepository, onlyAvailable, onlyRodizio]);

  // Fetch inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Produtos agrupados por categoria
   */
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};

    categories.forEach((cat) => {
      grouped[cat.id] = products.filter((p) => p.categoryId === cat.id);
    });

    return grouped;
  }, [products, categories]);

  /**
   * Produtos filtrados pela categoria e pesquisa
   */
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filtrar por categoria
    if (selectedCategoryId) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
    }

    // Filtrar por pesquisa
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [products, selectedCategoryId, searchQuery]);

  /**
   * Seleciona uma categoria
   */
  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  /**
   * Obtém um produto por ID
   */
  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  /**
   * Obtém uma categoria por ID
   */
  const getCategory = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories],
  );

  return {
    products,
    categories,
    categoriesWithCount,
    productsByCategory,
    isLoading,
    error,
    selectedCategoryId,
    searchQuery,
    filteredProducts,
    selectCategory,
    setSearchQuery,
    getProduct,
    getCategory,
    refresh: fetchData,
  };
}
