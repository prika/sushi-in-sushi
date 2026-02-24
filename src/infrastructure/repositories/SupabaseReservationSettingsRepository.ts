/**
 * SupabaseReservationSettingsRepository - Implementação Supabase do repositório de configurações
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IReservationSettingsRepository } from '@/domain/repositories/IReservationSettingsRepository';
import {
  ReservationSettings,
  UpdateReservationSettingsData,
} from '@/domain/entities/ReservationSettings';

interface DatabaseReservationSettings {
  id: number;
  day_before_reminder_enabled: boolean;
  day_before_reminder_hours: number;
  same_day_reminder_enabled: boolean;
  same_day_reminder_hours: number;
  rodizio_waste_policy_enabled: boolean;
  rodizio_waste_fee_per_piece: number;
  waiter_alert_minutes: number;
  updated_at: string;
  updated_by: string | null;
}

export class SupabaseReservationSettingsRepository implements IReservationSettingsRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async get(): Promise<ReservationSettings> {
    const { data, error } = await this.supabase
      .from('reservation_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      // Return default settings if not found
      if (error.code === 'PGRST116') {
        return this.getDefaultSettings();
      }
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async update(
    data: UpdateReservationSettingsData,
    updatedBy: string
  ): Promise<ReservationSettings> {
    const updateData: Record<string, unknown> = {
      updated_by: updatedBy,
    };

    if (data.dayBeforeReminderEnabled !== undefined) {
      updateData.day_before_reminder_enabled = data.dayBeforeReminderEnabled;
    }
    if (data.dayBeforeReminderHours !== undefined) {
      updateData.day_before_reminder_hours = data.dayBeforeReminderHours;
    }
    if (data.sameDayReminderEnabled !== undefined) {
      updateData.same_day_reminder_enabled = data.sameDayReminderEnabled;
    }
    if (data.sameDayReminderHours !== undefined) {
      updateData.same_day_reminder_hours = data.sameDayReminderHours;
    }
    if (data.rodizioWastePolicyEnabled !== undefined) {
      updateData.rodizio_waste_policy_enabled = data.rodizioWastePolicyEnabled;
    }
    if (data.rodizioWasteFeePerPiece !== undefined) {
      updateData.rodizio_waste_fee_per_piece = data.rodizioWasteFeePerPiece;
    }
    if (data.waiterAlertMinutes !== undefined) {
      updateData.waiter_alert_minutes = data.waiterAlertMinutes;
    }

    const { data: updated, error } = await this.supabase
      .from('reservation_settings')
      .update(updateData)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return this.mapToEntity(updated);
  }

  private mapToEntity(row: DatabaseReservationSettings): ReservationSettings {
    return {
      id: row.id,
      dayBeforeReminderEnabled: row.day_before_reminder_enabled,
      dayBeforeReminderHours: row.day_before_reminder_hours,
      sameDayReminderEnabled: row.same_day_reminder_enabled,
      sameDayReminderHours: row.same_day_reminder_hours,
      rodizioWastePolicyEnabled: row.rodizio_waste_policy_enabled,
      rodizioWasteFeePerPiece: row.rodizio_waste_fee_per_piece,
      waiterAlertMinutes: row.waiter_alert_minutes ?? 60,
      updatedAt: new Date(row.updated_at),
      updatedBy: row.updated_by,
    };
  }

  private getDefaultSettings(): ReservationSettings {
    return {
      id: 1,
      dayBeforeReminderEnabled: true,
      dayBeforeReminderHours: 24,
      sameDayReminderEnabled: true,
      sameDayReminderHours: 2,
      rodizioWastePolicyEnabled: true,
      rodizioWasteFeePerPiece: 2.5,
      waiterAlertMinutes: 60,
      updatedAt: new Date(),
      updatedBy: null,
    };
  }
}
