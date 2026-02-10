import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IDeviceProfileRepository } from '@/domain/repositories/IDeviceProfileRepository';
import {
  DeviceProfile,
  CreateDeviceProfileData,
  UpdateDeviceProfileData,
} from '@/domain/entities/DeviceProfile';

interface DatabaseDeviceProfile {
  device_id: string;
  last_display_name: string | null;
  last_full_name: string | null;
  last_email: string | null;
  last_phone: string | null;
  last_birth_date: string | null;
  last_preferred_contact: string;
  highest_tier: number;
  linked_customer_id: string | null;
  visit_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export class SupabaseDeviceProfileRepository implements IDeviceProfileRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
  }

  async findByDeviceId(deviceId: string): Promise<DeviceProfile | null> {
    const { data, error } = await this.supabase
      .from('device_profiles')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToEntity(data);
  }

  async create(data: CreateDeviceProfileData): Promise<DeviceProfile> {
    const { data: created, error } = await this.supabase
      .from('device_profiles')
      .insert({
        device_id: data.deviceId,
        last_display_name: data.lastDisplayName || null,
        last_full_name: data.lastFullName || null,
        last_email: data.lastEmail || null,
        last_phone: data.lastPhone || null,
        last_birth_date: data.lastBirthDate || null,
        last_preferred_contact: data.lastPreferredContact || 'email',
        highest_tier: data.highestTier || 1,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(created);
  }

  async update(deviceId: string, data: UpdateDeviceProfileData): Promise<DeviceProfile> {
    const updateData: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
    };

    if (data.lastDisplayName !== undefined) updateData.last_display_name = data.lastDisplayName;
    if (data.lastFullName !== undefined) updateData.last_full_name = data.lastFullName;
    if (data.lastEmail !== undefined) updateData.last_email = data.lastEmail;
    if (data.lastPhone !== undefined) updateData.last_phone = data.lastPhone;
    if (data.lastBirthDate !== undefined) updateData.last_birth_date = data.lastBirthDate;
    if (data.lastPreferredContact !== undefined) updateData.last_preferred_contact = data.lastPreferredContact;
    if (data.highestTier !== undefined) updateData.highest_tier = data.highestTier;
    if (data.linkedCustomerId !== undefined) updateData.linked_customer_id = data.linkedCustomerId;
    if (data.visitCount !== undefined) updateData.visit_count = data.visitCount;

    const { data: updated, error } = await this.supabase
      .from('device_profiles')
      .update(updateData)
      .eq('device_id', deviceId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(updated);
  }

  async upsert(data: CreateDeviceProfileData & Partial<UpdateDeviceProfileData>): Promise<DeviceProfile> {
    const upsertData: Record<string, unknown> = {
      device_id: data.deviceId,
      last_display_name: data.lastDisplayName || null,
      last_full_name: data.lastFullName || null,
      last_email: data.lastEmail || null,
      last_phone: data.lastPhone || null,
      last_birth_date: data.lastBirthDate || null,
      last_preferred_contact: data.lastPreferredContact || 'email',
      highest_tier: data.highestTier || 1,
      last_seen_at: new Date().toISOString(),
    };

    if (data.linkedCustomerId !== undefined) upsertData.linked_customer_id = data.linkedCustomerId;

    const { data: upserted, error } = await this.supabase
      .from('device_profiles')
      .upsert(upsertData, { onConflict: 'device_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToEntity(upserted);
  }

  async incrementVisitCount(deviceId: string): Promise<DeviceProfile> {
    const current = await this.findByDeviceId(deviceId);
    if (!current) throw new Error('Device profile not found');

    return this.update(deviceId, {
      visitCount: current.visitCount + 1,
    });
  }

  private mapToEntity(row: DatabaseDeviceProfile): DeviceProfile {
    return {
      deviceId: row.device_id,
      lastDisplayName: row.last_display_name,
      lastFullName: row.last_full_name,
      lastEmail: row.last_email,
      lastPhone: row.last_phone,
      lastBirthDate: row.last_birth_date,
      lastPreferredContact: row.last_preferred_contact as 'email' | 'phone' | 'none',
      highestTier: row.highest_tier as DeviceProfile['highestTier'],
      linkedCustomerId: row.linked_customer_id,
      visitCount: row.visit_count,
      firstSeenAt: new Date(row.first_seen_at),
      lastSeenAt: new Date(row.last_seen_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
