/**
 * IProductRepository - Interface do repositório de produtos
 * Define o contrato para acesso a dados de produtos
 */

import {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductWithCategory,
} from '../entities/Product';

/**
 * Filtros para busca de produtos
 */
export interface ProductFilter {
  categoryId?: string;
  onlyAvailable?: boolean;
  onlyRodizio?: boolean;
  searchQuery?: string;
}

/**
 * Interface do repositório de produtos
 */
export interface IProductRepository {
  /**
   * Busca um produto por ID
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Busca um produto por ID com categoria
   */
  findByIdWithCategory(id: string): Promise<ProductWithCategory | null>;

  /**
   * Busca todos os produtos com filtros opcionais
   */
  findAll(filter?: ProductFilter): Promise<Product[]>;

  /**
   * Busca todos os produtos com categoria
   */
  findAllWithCategory(filter?: ProductFilter): Promise<ProductWithCategory[]>;

  /**
   * Busca produtos por categoria
   */
  findByCategory(categoryId: string): Promise<Product[]>;

  /**
   * Pesquisa produtos por texto
   */
  search(query: string): Promise<Product[]>;

  /**
   * Cria um novo produto
   */
  create(data: CreateProductData): Promise<Product>;

  /**
   * Atualiza um produto
   */
  update(id: string, data: UpdateProductData): Promise<Product>;

  /**
   * Atualiza a disponibilidade de um produto
   */
  updateAvailability(id: string, isAvailable: boolean): Promise<Product>;

  /**
   * Remove um produto
   */
  delete(id: string): Promise<void>;

  /**
   * Busca um produto pelo identificador do Vendus
   */
  findByVendusProductId(vendusProductId: string): Promise<Product | null>;

  /**
   * Marca uma lista de produtos como sincronizados com o Vendus
   */
  markProductsSynced(products: Product[], syncedAt: Date): Promise<void>;
}
