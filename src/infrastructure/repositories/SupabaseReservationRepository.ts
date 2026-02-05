/**
 * SupabaseReservationRepository - Implementação Supabase do repositório de reservas
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import {
  Reservation,
  ReservationWithDetails,
  CreateReservationData,
  UpdateReservationData,
  ReservationFilter,
} from '@/domain/entities/Reservation';

interface DatabaseReservation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  location: string;
  table_id: number | null;
  is_rodizio: boolean;
  special_requests: string | null;
  occasion: string | null;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  session_id: string | null;
  seated_at: string | null;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseReservationRepository implements IReservationRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findAll(filter?: ReservationFilter): Promise<ReservationWithDetails[]> {
    let query = this.supabase
      .from('reservations')
      .select('*')
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: false });

    if (filter?.location) {
      query = query.eq('location', filter.location);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.date) {
      query = query.eq('reservation_date', filter.date);
    }
    if (filter?.dateFrom) {
      query = query.gte('reservation_date', filter.dateFrom);
    }
    if (filter?.dateTo) {
      query = query.lte('reservation_date', filter.dateTo);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseReservation) => this.mapToDetails(row));
  }

  async findById(id: string): Promise<Reservation | null> {
    const { data, error } = await this.supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async findByDate(date: string, location?: string): Promise<ReservationWithDetails[]> {
    let query = this.supabase
      .from('reservations')
      .select('*')
      .eq('reservation_date', date)
      .order('reservation_time');

    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data || []).map((row: DatabaseReservation) => this.mapToDetails(row));
  }

  async create(data: CreateReservationData): Promise<Reservation> {
    const { data: created, error } = await this.supabase
      .from('reservations')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        reservation_date: data.reservationDate,
        reservation_time: data.reservationTime,
        party_size: data.partySize,
        location: data.location,
        is_rodizio: data.isRodizio ?? true,
        special_requests: data.specialRequests || null,
        occasion: data.occasion || null,
        marketing_consent: data.marketingConsent ?? false,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateReservationData): Promise<Reservation> {
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.tableId !== undefined) updateData.table_id = data.tableId;
    if (data.confirmedBy !== undefined) updateData.confirmed_by = data.confirmedBy;
    if (data.cancellationReason !== undefined) updateData.cancellation_reason = data.cancellationReason;
    if (data.sessionId !== undefined) updateData.session_id = data.sessionId;

    const { data: updated, error } = await this.supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async confirm(id: string, confirmedBy: string): Promise<Reservation> {
    const { data, error } = await this.supabase
      .from('reservations')
      .update({
        status: 'confirmed',
        confirmed_by: confirmedBy,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async cancel(id: string, reason?: string): Promise<Reservation> {
    const { data, error } = await this.supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async markAsSeated(id: string, sessionId: string): Promise<Reservation> {
    const { data, error } = await this.supabase
      .from('reservations')
      .update({
        status: 'completed',
        session_id: sessionId,
        seated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async markAsNoShow(id: string): Promise<Reservation> {
    const { data, error } = await this.supabase
      .from('reservations')
      .update({ status: 'no_show' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  async markAsCompleted(id: string): Promise<Reservation> {
    const { data, error } = await this.supabase
      .from('reservations')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(data);
  }

  private mapToEntity(row: DatabaseReservation): Reservation {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      reservationDate: row.reservation_date,
      reservationTime: row.reservation_time,
      partySize: row.party_size,
      location: row.location as Reservation['location'],
      tableId: row.table_id,
      isRodizio: row.is_rodizio,
      specialRequests: row.special_requests,
      occasion: row.occasion as Reservation['occasion'],
      status: row.status as Reservation['status'],
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : null,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
      cancellationReason: row.cancellation_reason,
      sessionId: row.session_id,
      seatedAt: row.seated_at ? new Date(row.seated_at) : null,
      marketingConsent: row.marketing_consent,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToDetails(row: DatabaseReservation): ReservationWithDetails {
    const reservation = this.mapToEntity(row);
    return {
      ...reservation,
      tableNumber: null,
      tableName: null,
      confirmedByName: null,
      customerName: `${row.first_name} ${row.last_name}`,
      statusLabel: this.getStatusLabel(row.status),
    };
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Concluída',
      no_show: 'Não compareceu',
    };
    return labels[status] || status;
  }
}
