/**
 * SupabasePaymentMethodRepository - Implementacao Supabase do repositorio de metodos de pagamento
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IPaymentMethodRepository } from '@/domain/repositories/IPaymentMethodRepository';
import {
  PaymentMethod,
  CreatePaymentMethodData,
  UpdatePaymentMethodData,
} from '@/domain/entities/PaymentMethod';

interface DatabasePaymentMethod {
  id: number;
  name: string;
  slug: string;
  vendus_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export class SupabasePaymentMethodRepository implements IPaymentMethodRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(): Promise<PaymentMethod[]> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((row: DatabasePaymentMethod) => this.mapToEntity(row));
  }

  async findById(id: number): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findBySlug(slug: string): Promise<PaymentMethod | null> {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async create(data: CreatePaymentMethodData): Promise<PaymentMethod> {
    const { data: created, error } = await this.supabase
      .from('payment_methods')
      .insert({
        name: data.name,
        slug: data.slug,
        vendus_id: data.vendusId || null,
        is_active: data.isActive ?? true,
        sort_order: data.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async update(id: number, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.vendusId !== undefined) updateData.vendus_id = data.vendusId;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const { data: updated, error } = await this.supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  private mapToEntity(row: DatabasePaymentMethod): PaymentMethod {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      vendusId: row.vendus_id,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    };
  }
}
