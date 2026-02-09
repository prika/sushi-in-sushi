import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import {
  Restaurant,
  CreateRestaurantData,
  UpdateRestaurantData,
  RestaurantFilter,
} from '@/domain/entities/Restaurant';

// Database type (snake_case)
interface DatabaseRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  max_capacity: number;
  default_people_per_table: number;
  auto_table_assignment: boolean;
  auto_reservations: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseRestaurantRepository implements IRestaurantRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: RestaurantFilter): Promise<Restaurant[]> {
    console.log('[SupabaseRestaurantRepository] findAll called with filter:', filter);

    let query = this.supabase
      .from('restaurants')
      .select('*')
      .order('name', { ascending: true });

    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    if (filter?.slug) {
      query = query.eq('slug', filter.slug);
    }

    console.log('[SupabaseRestaurantRepository] Executing query...');
    const { data, error } = await query;

    console.log('[SupabaseRestaurantRepository] Query result:', { data, error });

    if (error) {
      console.error('[SupabaseRestaurantRepository] Query error:', error);
      throw new Error(error.message);
    }

    const restaurants = (data || []).map((row: DatabaseRestaurant) => this.mapToEntity(row));
    console.log('[SupabaseRestaurantRepository] Mapped restaurants:', restaurants.length);

    return restaurants;
  }

  async findActive(): Promise<Restaurant[]> {
    console.log('[SupabaseRestaurantRepository] findActive called');
    const result = await this.findAll({ isActive: true });
    console.log('[SupabaseRestaurantRepository] findActive returning:', result.length, 'restaurants');
    return result;
  }

  async findById(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async create(data: CreateRestaurantData): Promise<Restaurant> {
    const { data: created, error } = await this.supabase
      .from('restaurants')
      .insert({
        name: data.name,
        slug: data.slug,
        address: data.address,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        max_capacity: data.maxCapacity,
        default_people_per_table: data.defaultPeoplePerTable,
        auto_table_assignment: data.autoTableAssignment ?? false,
        auto_reservations: data.autoReservations ?? false,
        is_active: data.isActive ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateRestaurantData): Promise<Restaurant> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.maxCapacity !== undefined) updateData.max_capacity = data.maxCapacity;
    if (data.defaultPeoplePerTable !== undefined) updateData.default_people_per_table = data.defaultPeoplePerTable;
    if (data.autoTableAssignment !== undefined) updateData.auto_table_assignment = data.autoTableAssignment;
    if (data.autoReservations !== undefined) updateData.auto_reservations = data.autoReservations;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: updated, error } = await this.supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async validateSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return data.length === 0;
  }

  private mapToEntity(row: DatabaseRestaurant): Restaurant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      maxCapacity: row.max_capacity,
      defaultPeoplePerTable: row.default_people_per_table,
      autoTableAssignment: row.auto_table_assignment,
      autoReservations: row.auto_reservations,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
