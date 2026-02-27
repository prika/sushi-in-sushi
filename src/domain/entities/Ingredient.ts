/**
 * Ingredient Entity
 * Representa um ingrediente no catálogo master
 */

export interface Ingredient {
  id: string;
  name: string;
  /** Multi-language names: {"pt": "salmão", "en": "salmon", ...} */
  nameTranslations: Record<string, string>;
  /** EU 14 allergen codes: ["fish", "soybeans", "gluten", ...] */
  allergens: string[];
  unit: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngredientWithProductCount extends Ingredient {
  productCount: number;
}

export interface CreateIngredientData {
  name: string;
  unit: string;
  sortOrder?: number;
}

export interface UpdateIngredientData {
  name?: string;
  unit?: string;
  sortOrder?: number;
  allergens?: string[];
}
