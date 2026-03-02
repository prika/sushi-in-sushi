/**
 * ProductIngredient Entity
 * Representa a relação entre produto e ingrediente com quantidade
 */

export interface ProductIngredient {
  id: string;
  productId: string;
  ingredientId: string;
  quantity: number;
  /** Desnormalizado do JOIN com ingredients */
  ingredientName: string;
  /** Multi-language ingredient names from JOIN */
  ingredientNameTranslations: Record<string, string>;
  /** Desnormalizado do JOIN com ingredients */
  ingredientUnit: string;
  createdAt: Date;
}

export interface SetProductIngredientsData {
  productId: string;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
  }>;
}
