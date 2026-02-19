/**
 * SupabaseCustomerRepository - Implementação Supabase do repositório de clientes
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import {
  Customer,
  CustomerWithHistory,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerFilter,
} from '@/domain/entities/Customer';

interface DatabaseCustomer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  preferred_location: string | null;
  marketing_consent: boolean;
  points: number;
  total_spent: number;
  visit_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseCustomerRepository implements ICustomerRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: CustomerFilter): Promise<Customer[]> {
    let query = this.supabase
      .from('customers')
      .select('*')
      .order('name');

    if (filter?.location) {
      query = query.eq('preferred_location', filter.location);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }
    if (filter?.hasMarketing !== undefined) {
      query = query.eq('marketing_consent', filter.hasMarketing);
    }
    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseCustomer) => this.mapToEntity(row));
  }

  async findById(id: string): Promise<CustomerWithHistory | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    // Get reservation count
    const { count: reservations } = await this.supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('email', data.email);

    return {
      ...this.mapToEntity(data),
      reservations: reservations || 0,
      lastVisit: null, // Could be fetched from sessions/reservations if needed
    };
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    const { data: created, error } = await this.supabase
      .from('customers')
      .insert({
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        birth_date: data.birthDate || null,
        preferred_location: data.preferredLocation || null,
        marketing_consent: data.marketingConsent ?? false,
        points: 0,
        total_spent: 0,
        visit_count: 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateCustomerData): Promise<Customer> {
    const updateData: Record<string, unknown> = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.birthDate !== undefined) updateData.birth_date = data.birthDate;
    if (data.preferredLocation !== undefined) updateData.preferred_location = data.preferredLocation;
    if (data.marketingConsent !== undefined) updateData.marketing_consent = data.marketingConsent;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.totalSpent !== undefined) updateData.total_spent = data.totalSpent;
    if (data.visitCount !== undefined) updateData.visit_count = data.visitCount;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: updated, error } = await this.supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async addPoints(id: string, points: number): Promise<Customer> {
    const { data: current } = await this.supabase
      .from('customers')
      .select('points')
      .eq('id', id)
      .single();

    const newPoints = (current?.points || 0) + points;

    const { data, error } = await this.supabase
      .from('customers')
      .update({ points: newPoints })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async recordVisit(id: string, spent: number): Promise<Customer> {
    const { data: current } = await this.supabase
      .from('customers')
      .select('visit_count, total_spent')
      .eq('id', id)
      .single();

    const { data, error } = await this.supabase
      .from('customers')
      .update({
        visit_count: (current?.visit_count || 0) + 1,
        total_spent: (current?.total_spent || 0) + spent,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  private mapToEntity(row: DatabaseCustomer): Customer {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      birthDate: row.birth_date,
      preferredLocation: row.preferred_location as Customer['preferredLocation'],
      marketingConsent: row.marketing_consent,
      points: row.points,
      totalSpent: row.total_spent,
      visitCount: row.visit_count,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
