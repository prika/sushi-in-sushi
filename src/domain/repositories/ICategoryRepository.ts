/**
 * ICategoryRepository - Interface do repositório de categorias
 * Define o contrato para acesso a dados de categorias
 */

import { Category, CreateCategoryData, UpdateCategoryData, CategoryWithCount } from '../entities/Category';

/**
 * Interface do repositório de categorias
 */
export interface ICategoryRepository {
  /**
   * Busca uma categoria por ID
   */
  findById(id: string): Promise<Category | null>;

  /**
   * Busca uma categoria por slug
   */
  findBySlug(slug: string): Promise<Category | null>;

  /**
   * Busca todas as categorias
   */
  findAll(): Promise<Category[]>;

  /**
   * Busca todas as categorias com contagem de produtos
   */
  findAllWithCount(): Promise<CategoryWithCount[]>;

  /**
   * Cria uma nova categoria
   */
  create(data: CreateCategoryData): Promise<Category>;

  /**
   * Atualiza uma categoria
   */
  update(id: string, data: UpdateCategoryData): Promise<Category>;

  /**
   * Remove uma categoria
   */
  delete(id: string): Promise<void>;
}
