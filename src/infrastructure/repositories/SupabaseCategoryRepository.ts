/**
 * SupabaseCategoryRepository - Implementação Supabase do repositório de categorias
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryWithCount,
} from '@/domain/entities/Category';

/**
 * Tipo do registo da base de dados
 */
interface DatabaseCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  zone_id: string | null;
  created_at: string;
}

/**
 * Implementação Supabase do repositório de categorias
 */
export class SupabaseCategoryRepository implements ICategoryRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findAll(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((d) => this.toDomain(d));
  }

  async findAllWithCount(): Promise<CategoryWithCount[]> {
    // Buscar categorias
    const { data: categories, error: catError } = await this.supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (catError) throw new Error(catError.message);

    // Buscar contagem de produtos por categoria
    const { data: products, error: prodError } = await this.supabase
      .from('products')
      .select('category_id');

    if (prodError) throw new Error(prodError.message);

    // Contar produtos por categoria
    const countMap = new Map<string, number>();
    (products || []).forEach((p: { category_id: string }) => {
      const count = countMap.get(p.category_id) || 0;
      countMap.set(p.category_id, count + 1);
    });

    return (categories || []).map((cat) => ({
      ...this.toDomain(cat),
      productCount: countMap.get(cat.id) || 0,
    }));
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const { data: category, error } = await this.supabase
      .from('categories')
      .insert({
        name: data.name,
        slug: data.slug,
        icon: data.icon || null,
        sort_order: data.sortOrder ?? 0,
        zone_id: data.zoneId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(category);
  }

  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
    if (data.zoneId !== undefined) updateData.zone_id = data.zoneId;

    const { data: category, error } = await this.supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(category);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('categories').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }

  /**
   * Converte registo da BD para entidade de domínio
   */
  private toDomain(data: DatabaseCategory): Category {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      icon: data.icon,
      sortOrder: data.sort_order,
      zoneId: data.zone_id,
      createdAt: new Date(data.created_at),
    };
  }
}
