/**
 * Category Entity
 * Representa uma categoria de produtos no domínio
 */

/**
 * Entidade Category - Representa uma categoria de produtos
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  createdAt: Date;
}

/**
 * Dados para criar uma nova categoria
 */
export interface CreateCategoryData {
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder?: number;
}

/**
 * Dados para atualizar uma categoria
 */
export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  icon?: string | null;
  sortOrder?: number;
}

/**
 * Category com contagem de produtos
 */
export interface CategoryWithCount extends Category {
  productCount: number;
}
