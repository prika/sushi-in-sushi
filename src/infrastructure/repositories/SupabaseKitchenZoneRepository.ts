/**
 * SupabaseKitchenZoneRepository - Implementação Supabase do repositório de zonas de cozinha
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IKitchenZoneRepository } from '@/domain/repositories/IKitchenZoneRepository';
import {
  KitchenZone,
  CreateKitchenZoneData,
  UpdateKitchenZoneData,
  KitchenZoneWithCategoryCount,
} from '@/domain/entities/KitchenZone';

interface DatabaseKitchenZone {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseKitchenZoneRepository implements IKitchenZoneRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(): Promise<KitchenZone[]> {
    const { data, error } = await this.supabase
      .from('kitchen_zones')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((row: DatabaseKitchenZone) => this.toDomain(row));
  }

  async findActive(): Promise<KitchenZone[]> {
    const { data, error } = await this.supabase
      .from('kitchen_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((row: DatabaseKitchenZone) => this.toDomain(row));
  }

  async findAllWithCategoryCount(): Promise<KitchenZoneWithCategoryCount[]> {
    const { data: zones, error: zonesError } = await this.supabase
      .from('kitchen_zones')
      .select('*')
      .order('sort_order', { ascending: true });

    if (zonesError) throw new Error(zonesError.message);

    const { data: categories, error: catError } = await this.supabase
      .from('categories')
      .select('zone_id');

    if (catError) throw new Error(catError.message);

    const countMap = new Map<string, number>();
    (categories || []).forEach((c: { zone_id: string | null }) => {
      if (c.zone_id) {
        countMap.set(c.zone_id, (countMap.get(c.zone_id) || 0) + 1);
      }
    });

    return (zones || []).map((row: DatabaseKitchenZone) => ({
      ...this.toDomain(row),
      categoryCount: countMap.get(row.id) || 0,
    }));
  }

  async findById(id: string): Promise<KitchenZone | null> {
    const { data, error } = await this.supabase
      .from('kitchen_zones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.toDomain(data);
  }

  async findBySlug(slug: string): Promise<KitchenZone | null> {
    const { data, error } = await this.supabase
      .from('kitchen_zones')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.toDomain(data);
  }

  async create(data: CreateKitchenZoneData): Promise<KitchenZone> {
    const { data: created, error } = await this.supabase
      .from('kitchen_zones')
      .insert({
        name: data.name,
        slug: data.slug,
        color: data.color ?? '#6B7280',
        sort_order: data.sortOrder ?? 0,
        is_active: data.isActive ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(created);
  }

  async update(id: string, data: UpdateKitchenZoneData): Promise<KitchenZone> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: updated, error } = await this.supabase
      .from('kitchen_zones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('kitchen_zones')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async validateSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase.from('kitchen_zones').select('id').eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return data.length === 0;
  }

  private toDomain(row: DatabaseKitchenZone): KitchenZone {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
