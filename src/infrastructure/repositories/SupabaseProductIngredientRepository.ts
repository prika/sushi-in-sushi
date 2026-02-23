/**
 * SupabaseProductIngredientRepository - Implementação Supabase do repositório de ingredientes por produto
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IProductIngredientRepository } from '@/domain/repositories/IProductIngredientRepository';
import {
  ProductIngredient,
  SetProductIngredientsData,
} from '@/domain/entities/ProductIngredient';

interface DatabaseProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  created_at: string;
  ingredients: { name: string; unit: string } | null;
}

export class SupabaseProductIngredientRepository implements IProductIngredientRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findByProductId(productId: string): Promise<ProductIngredient[]> {
    const { data, error } = await this.supabase
      .from('product_ingredients')
      .select('*, ingredients(name, unit)')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomain(d as DatabaseProductIngredient));
  }

  async setProductIngredients(input: SetProductIngredientsData): Promise<ProductIngredient[]> {
    // 1. Delete all existing for this product
    const { error: deleteError } = await this.supabase
      .from('product_ingredients')
      .delete()
      .eq('product_id', input.productId);

    if (deleteError) throw new Error(deleteError.message);

    // 2. Insert new rows (if any)
    if (input.ingredients.length > 0) {
      const rows = input.ingredients.map((ing) => ({
        product_id: input.productId,
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
      }));

      const { error: insertError } = await this.supabase
        .from('product_ingredients')
        .insert(rows);

      if (insertError) throw new Error(insertError.message);
    }

    // 3. Return the new set
    return this.findByProductId(input.productId);
  }

  async clearProductIngredients(productId: string): Promise<void> {
    const { error } = await this.supabase
      .from('product_ingredients')
      .delete()
      .eq('product_id', productId);

    if (error) throw new Error(error.message);
  }

  private toDomain(data: DatabaseProductIngredient): ProductIngredient {
    return {
      id: data.id,
      productId: data.product_id,
      ingredientId: data.ingredient_id,
      quantity: Number(data.quantity),
      ingredientName: data.ingredients?.name ?? '',
      ingredientUnit: data.ingredients?.unit ?? '',
      createdAt: new Date(data.created_at),
    };
  }
}
