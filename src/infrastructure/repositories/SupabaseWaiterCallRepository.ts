/**
 * SupabaseWaiterCallRepository - Implementação Supabase do repositório de chamadas
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IWaiterCallRepository } from '@/domain/repositories/IWaiterCallRepository';
import {
  WaiterCall,
  WaiterCallWithDetails,
  CreateWaiterCallData,
  UpdateWaiterCallData,
  WaiterCallFilter,
} from '@/domain/entities/WaiterCall';

interface DatabaseWaiterCall {
  id: string;
  table_id: string;
  session_id: string | null;
  call_type: string;
  message: string | null;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  location: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseWaiterCallWithDetails extends DatabaseWaiterCall {
  table_number: number;
  table_name: string;
  acknowledged_by_name: string | null;
  assigned_waiter_name: string | null;
  assigned_waiter_id: string | null;
}

export class SupabaseWaiterCallRepository implements IWaiterCallRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: WaiterCallFilter): Promise<WaiterCallWithDetails[]> {
    let query = this.supabase
      .from('waiter_calls_with_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.location) {
      query = query.eq('location', filter.location);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.tableId) {
      query = query.eq('table_id', filter.tableId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseWaiterCallWithDetails) => this.mapToDetails(row));
  }

  async findById(id: string): Promise<WaiterCall | null> {
    const { data, error } = await this.supabase
      .from('waiter_calls')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findPending(location?: string): Promise<WaiterCallWithDetails[]> {
    let query = this.supabase
      .from('waiter_calls_with_details')
      .select('*')
      .in('status', ['pending', 'acknowledged'])
      .order('created_at', { ascending: true });

    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseWaiterCallWithDetails) => this.mapToDetails(row));
  }

  async create(data: CreateWaiterCallData): Promise<WaiterCall> {
    const { data: created, error } = await this.supabase
      .from('waiter_calls')
      .insert({
        table_id: data.tableId,
        session_id: data.sessionId || null,
        call_type: data.callType || 'assistance',
        message: data.message || null,
        location: data.location,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateWaiterCallData): Promise<WaiterCall> {
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.acknowledgedBy !== undefined) updateData.acknowledged_by = data.acknowledgedBy;
    if (data.message !== undefined) updateData.message = data.message;

    const { data: updated, error } = await this.supabase
      .from('waiter_calls')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async acknowledge(id: string, staffId: string): Promise<WaiterCall> {
    const { data, error } = await this.supabase
      .from('waiter_calls')
      .update({
        status: 'acknowledged',
        acknowledged_by: staffId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async complete(id: string): Promise<WaiterCall> {
    const { data, error } = await this.supabase
      .from('waiter_calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async cancel(id: string): Promise<WaiterCall> {
    const { data, error } = await this.supabase
      .from('waiter_calls')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  private mapToEntity(row: DatabaseWaiterCall): WaiterCall {
    return {
      id: row.id,
      tableId: row.table_id,
      sessionId: row.session_id,
      callType: row.call_type as WaiterCall['callType'],
      message: row.message,
      status: row.status as WaiterCall['status'],
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      location: row.location as WaiterCall['location'],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToDetails(row: DatabaseWaiterCallWithDetails): WaiterCallWithDetails {
    return {
      ...this.mapToEntity(row),
      tableNumber: row.table_number,
      tableName: row.table_name,
      acknowledgedByName: row.acknowledged_by_name,
      assignedWaiterName: row.assigned_waiter_name,
      assignedWaiterId: row.assigned_waiter_id,
    };
  }
}
