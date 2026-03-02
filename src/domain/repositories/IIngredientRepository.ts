/**
 * IIngredientRepository - Interface do repositório de ingredientes
 * Define o contrato para acesso a dados do catálogo de ingredientes
 */

import {
  Ingredient,
  CreateIngredientData,
  UpdateIngredientData,
  IngredientWithProductCount,
} from '../entities/Ingredient';

export interface IIngredientRepository {
  findById(id: string): Promise<Ingredient | null>;
  findByName(name: string): Promise<Ingredient | null>;
  findAll(): Promise<Ingredient[]>;
  findAllWithProductCount(): Promise<IngredientWithProductCount[]>;
  create(data: CreateIngredientData): Promise<Ingredient>;
  update(id: string, data: UpdateIngredientData): Promise<Ingredient>;
  delete(id: string): Promise<void>;
}
