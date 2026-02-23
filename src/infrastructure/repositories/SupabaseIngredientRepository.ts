/**
 * SupabaseIngredientRepository - Implementação Supabase do repositório de ingredientes
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IIngredientRepository } from '@/domain/repositories/IIngredientRepository';
import {
  Ingredient,
  CreateIngredientData,
  UpdateIngredientData,
  IngredientWithProductCount,
} from '@/domain/entities/Ingredient';

interface DatabaseIngredient {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class SupabaseIngredientRepository implements IIngredientRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findById(id: string): Promise<Ingredient | null> {
    const { data, error } = await this.supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByName(name: string): Promise<Ingredient | null> {
    const { data, error } = await this.supabase
      .from('ingredients')
      .select('*')
      .ilike('name', name)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findAll(): Promise<Ingredient[]> {
    const { data, error } = await this.supabase
      .from('ingredients')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomain(d));
  }

  async findAllWithProductCount(): Promise<IngredientWithProductCount[]> {
    const { data: ingredients, error: ingError } = await this.supabase
      .from('ingredients')
      .select('*')
      .order('sort_order', { ascending: true });

    if (ingError) throw new Error(ingError.message);

    const { data: productIngredients, error: piError } = await this.supabase
      .from('product_ingredients')
      .select('ingredient_id');

    if (piError) throw new Error(piError.message);

    const countMap = new Map<string, number>();
    (productIngredients || []).forEach((pi: { ingredient_id: string }) => {
      const count = countMap.get(pi.ingredient_id) || 0;
      countMap.set(pi.ingredient_id, count + 1);
    });

    return (ingredients || []).map((ing) => ({
      ...this.toDomain(ing),
      productCount: countMap.get(ing.id) || 0,
    }));
  }

  async create(data: CreateIngredientData): Promise<Ingredient> {
    const { data: ingredient, error } = await this.supabase
      .from('ingredients')
      .insert({
        name: data.name,
        unit: data.unit,
        sort_order: data.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(ingredient);
  }

  async update(id: string, data: UpdateIngredientData): Promise<Ingredient> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const { data: ingredient, error } = await this.supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(ingredient);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  private toDomain(data: DatabaseIngredient): Ingredient {
    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      sortOrder: data.sort_order,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
