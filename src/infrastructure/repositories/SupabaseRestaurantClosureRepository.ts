/**
 * SupabaseRestaurantClosureRepository - Implementação Supabase do repositório de folgas
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IRestaurantClosureRepository } from '@/domain/repositories/IRestaurantClosureRepository';
import {
  RestaurantClosure,
  CreateClosureData,
  UpdateClosureData,
  ClosureFilter,
  ClosureCheckResult,
} from '@/domain/entities/RestaurantClosure';

interface DatabaseClosure {
  id: number;
  closure_date: string;
  location: string | null;
  reason: string | null;
  is_recurring: boolean;
  recurring_day_of_week: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseRestaurantClosureRepository implements IRestaurantClosureRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: ClosureFilter): Promise<RestaurantClosure[]> {
    let query = this.supabase
      .from('restaurant_closures')
      .select('*')
      .order('closure_date', { ascending: false });

    if (filter?.location) {
      query = query.or(`location.eq.${filter.location},location.is.null`);
    }
    if (filter?.isRecurring !== undefined) {
      query = query.eq('is_recurring', filter.isRecurring);
    }
    if (filter?.dateFrom) {
      query = query.gte('closure_date', filter.dateFrom);
    }
    if (filter?.dateTo) {
      query = query.lte('closure_date', filter.dateTo);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseClosure) => this.mapToEntity(row));
  }

  async findById(id: number): Promise<RestaurantClosure | null> {
    const { data, error } = await this.supabase
      .from('restaurant_closures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findRecurring(): Promise<RestaurantClosure[]> {
    const { data, error } = await this.supabase
      .from('restaurant_closures')
      .select('*')
      .eq('is_recurring', true)
      .order('recurring_day_of_week');

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseClosure) => this.mapToEntity(row));
  }

  async create(data: CreateClosureData, createdBy?: string): Promise<RestaurantClosure> {
    const { data: created, error } = await this.supabase
      .from('restaurant_closures')
      .insert({
        closure_date: data.closureDate,
        location: data.location || null,
        reason: data.reason || null,
        is_recurring: data.isRecurring ?? false,
        recurring_day_of_week: data.recurringDayOfWeek ?? null,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(created);
  }

  async update(id: number, data: UpdateClosureData): Promise<RestaurantClosure> {
    const updateData: Record<string, unknown> = {};

    if (data.closureDate !== undefined) updateData.closure_date = data.closureDate;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.isRecurring !== undefined) updateData.is_recurring = data.isRecurring;
    if (data.recurringDayOfWeek !== undefined) updateData.recurring_day_of_week = data.recurringDayOfWeek;

    const { data: updated, error } = await this.supabase
      .from('restaurant_closures')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('restaurant_closures')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async checkClosure(date: string, location?: string): Promise<ClosureCheckResult> {
    // Check for specific date closure
    let query = this.supabase
      .from('restaurant_closures')
      .select('*')
      .eq('closure_date', date)
      .eq('is_recurring', false);

    if (location) {
      query = query.or(`location.eq.${location},location.is.null`);
    }

    const { data: specificClosures } = await query;

    if (specificClosures && specificClosures.length > 0) {
      const closure = this.mapToEntity(specificClosures[0]);
      return {
        isClosed: true,
        reason: closure.reason || 'Restaurante fechado nesta data',
        closure,
      };
    }

    // Check for recurring closures
    const dayOfWeek = new Date(date).getDay();
    let recurringQuery = this.supabase
      .from('restaurant_closures')
      .select('*')
      .eq('is_recurring', true)
      .eq('recurring_day_of_week', dayOfWeek);

    if (location) {
      recurringQuery = recurringQuery.or(`location.eq.${location},location.is.null`);
    }

    const { data: recurringClosures } = await recurringQuery;

    if (recurringClosures && recurringClosures.length > 0) {
      const closure = this.mapToEntity(recurringClosures[0]);
      return {
        isClosed: true,
        reason: closure.reason || 'Restaurante fechado neste dia da semana',
        closure,
      };
    }

    return { isClosed: false };
  }

  private mapToEntity(row: DatabaseClosure): RestaurantClosure {
    return {
      id: row.id,
      closureDate: row.closure_date,
      location: row.location as RestaurantClosure['location'],
      reason: row.reason,
      isRecurring: row.is_recurring,
      recurringDayOfWeek: row.recurring_day_of_week,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
