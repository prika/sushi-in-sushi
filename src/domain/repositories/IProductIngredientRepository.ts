/**
 * IProductIngredientRepository - Interface do repositório de ingredientes por produto
 * Define o contrato para gerir a associação entre produtos e ingredientes do catálogo
 */

import {
  ProductIngredient,
  SetProductIngredientsData,
} from '../entities/ProductIngredient';

export interface IProductIngredientRepository {
  /** Retorna todos os ingredientes de um produto (com nome/unidade do catálogo) */
  findByProductId(productId: string): Promise<ProductIngredient[]>;

  /** Substitui todos os ingredientes de um produto (delete + insert) */
  setProductIngredients(data: SetProductIngredientsData): Promise<ProductIngredient[]>;

  /** Remove todos os ingredientes de um produto */
  clearProductIngredients(productId: string): Promise<void>;
}
