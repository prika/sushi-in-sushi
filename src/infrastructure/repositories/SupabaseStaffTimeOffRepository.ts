/**
 * SupabaseStaffTimeOffRepository - Implementação Supabase do repositório de ausências
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IStaffTimeOffRepository } from '@/domain/repositories/IStaffTimeOffRepository';
import {
  StaffTimeOff,
  StaffTimeOffWithStaff,
  CreateStaffTimeOffData,
  UpdateStaffTimeOffData,
  StaffTimeOffFilter,
} from '@/domain/entities/StaffTimeOff';

interface DatabaseStaffTimeOff {
  id: number;
  staff_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseStaffTimeOffWithRelations extends DatabaseStaffTimeOff {
  staff: { id: string; name: string };
  approver?: { id: string; name: string } | null;
}

export class SupabaseStaffTimeOffRepository implements IStaffTimeOffRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: StaffTimeOffFilter): Promise<StaffTimeOffWithStaff[]> {
    let query = this.supabase
      .from('staff_time_off')
      .select(`
        *,
        staff:staff_id (id, name),
        approver:approved_by (id, name)
      `)
      .order('start_date', { ascending: false });

    if (filter?.staffId) {
      query = query.eq('staff_id', filter.staffId);
    }
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.dateFrom) {
      query = query.gte('end_date', filter.dateFrom);
    }
    if (filter?.dateTo) {
      query = query.lte('start_date', filter.dateTo);
    }
    if (filter?.month !== undefined && filter?.year !== undefined) {
      const startOfMonth = new Date(filter.year, filter.month, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(filter.year, filter.month + 1, 0).toISOString().split('T')[0];
      query = query.gte('end_date', startOfMonth).lte('start_date', endOfMonth);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseStaffTimeOffWithRelations) => this.mapToEntityWithStaff(row));
  }

  async findById(id: number): Promise<StaffTimeOffWithStaff | null> {
    const { data, error } = await this.supabase
      .from('staff_time_off')
      .select(`
        *,
        staff:staff_id (id, name),
        approver:approved_by (id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntityWithStaff(data);
  }

  async findByStaffId(staffId: string): Promise<StaffTimeOff[]> {
    const { data, error } = await this.supabase
      .from('staff_time_off')
      .select('*')
      .eq('staff_id', staffId)
      .order('start_date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseStaffTimeOff) => this.mapToEntity(row));
  }

  async findOverlapping(
    staffId: string,
    startDate: string,
    endDate: string,
    excludeId?: number
  ): Promise<StaffTimeOff[]> {
    let query = this.supabase
      .from('staff_time_off')
      .select('*')
      .eq('staff_id', staffId)
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseStaffTimeOff) => this.mapToEntity(row));
  }

  async create(data: CreateStaffTimeOffData): Promise<StaffTimeOff> {
    const { data: created, error } = await this.supabase
      .from('staff_time_off')
      .insert({
        staff_id: data.staffId,
        start_date: data.startDate,
        end_date: data.endDate,
        type: data.type,
        reason: data.reason || null,
        status: 'approved', // Auto-approve by default
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(created);
  }

  async update(id: number, data: UpdateStaffTimeOffData): Promise<StaffTimeOff> {
    const updateData: Record<string, unknown> = {};

    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.approvedBy !== undefined) updateData.approved_by = data.approvedBy;

    const { data: updated, error } = await this.supabase
      .from('staff_time_off')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async approve(id: number, approvedBy: string): Promise<StaffTimeOff> {
    const { data: updated, error } = await this.supabase
      .from('staff_time_off')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async reject(id: number, approvedBy: string): Promise<StaffTimeOff> {
    const { data: updated, error } = await this.supabase
      .from('staff_time_off')
      .update({
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('staff_time_off')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  private mapToEntity(row: DatabaseStaffTimeOff): StaffTimeOff {
    return {
      id: row.id,
      staffId: row.staff_id,
      startDate: row.start_date,
      endDate: row.end_date,
      type: row.type as StaffTimeOff['type'],
      reason: row.reason,
      status: row.status as StaffTimeOff['status'],
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToEntityWithStaff(row: DatabaseStaffTimeOffWithRelations): StaffTimeOffWithStaff {
    return {
      ...this.mapToEntity(row),
      staff: {
        id: row.staff.id,
        name: row.staff.name,
      },
      approver: row.approver ? {
        id: row.approver.id,
        name: row.approver.name,
      } : null,
    };
  }
}
