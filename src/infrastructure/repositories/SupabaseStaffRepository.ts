/**
 * SupabaseStaffRepository - Implementação Supabase do repositório de funcionários
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IStaffRepository } from '@/domain/repositories/IStaffRepository';
import {
  Staff,
  StaffWithRole,
  CreateStaffData,
  UpdateStaffData,
  StaffFilter,
  Role,
} from '@/domain/entities/Staff';
import bcrypt from 'bcryptjs';

interface DatabaseStaff {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role_id: number;
  location: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface DatabaseRole {
  id: number;
  name: string;
  description: string | null;
}

export class SupabaseStaffRepository implements IStaffRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: StaffFilter): Promise<StaffWithRole[]> {
    let query = this.supabase
      .from('staff')
      .select(`
        *,
        roles (id, name, description)
      `)
      .order('name');

    if (filter?.roleId) {
      query = query.eq('role_id', filter.roleId);
    }
    if (filter?.location) {
      query = query.eq('location', filter.location);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }
    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseStaff & { roles: DatabaseRole }) => this.mapToEntity(row));
  }

  async findById(id: string): Promise<StaffWithRole | null> {
    const { data, error } = await this.supabase
      .from('staff')
      .select(`
        *,
        roles (id, name, description)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findByEmail(email: string): Promise<StaffWithRole | null> {
    const { data, error } = await this.supabase
      .from('staff')
      .select(`
        *,
        roles (id, name, description)
      `)
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async create(data: CreateStaffData): Promise<Staff> {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const { data: created, error } = await this.supabase
      .from('staff')
      .insert({
        email: data.email,
        name: data.name,
        password_hash: passwordHash,
        role_id: data.roleId,
        location: data.location || null,
        phone: data.phone || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToStaff(created);
  }

  async update(id: string, data: UpdateStaffData): Promise<Staff> {
    const updateData: Record<string, unknown> = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.password !== undefined) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
    }
    if (data.roleId !== undefined) updateData.role_id = data.roleId;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: updated, error } = await this.supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToStaff(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getAllRoles(): Promise<Role[]> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .order('id');

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseRole) => ({
      id: row.id,
      name: row.name as Role['name'],
      description: row.description || '',
    }));
  }

  async assignTables(staffId: string, tableIds: string[]): Promise<void> {
    // Remove existing assignments
    await this.supabase
      .from('waiter_tables')
      .delete()
      .eq('staff_id', staffId);

    // Add new assignments
    if (tableIds.length > 0) {
      const { error } = await this.supabase
        .from('waiter_tables')
        .insert(tableIds.map(tableId => ({
          staff_id: staffId,
          table_id: tableId,
        })));

      if (error) throw new Error(error.message);
    }
  }

  async getAssignedTables(staffId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('waiter_tables')
      .select('table_id')
      .eq('staff_id', staffId);

    if (error) throw new Error(error.message);

    return (data || []).map((row: { table_id: string }) => row.table_id);
  }

  private mapToEntity(row: DatabaseStaff & { roles: DatabaseRole }): StaffWithRole {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      roleId: row.role_id,
      location: row.location as Staff['location'],
      phone: row.phone,
      isActive: row.is_active,
      lastLogin: row.last_login ? new Date(row.last_login) : null,
      createdAt: new Date(row.created_at),
      role: {
        id: row.roles.id,
        name: row.roles.name as Role['name'],
        description: row.roles.description || '',
      },
    };
  }

  private mapToStaff(row: DatabaseStaff): Staff {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      roleId: row.role_id,
      location: row.location as Staff['location'],
      phone: row.phone,
      isActive: row.is_active,
      lastLogin: row.last_login ? new Date(row.last_login) : null,
      createdAt: new Date(row.created_at),
    };
  }
}
