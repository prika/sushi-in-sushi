import { CustomerTier } from '../value-objects/CustomerTier';

export interface DeviceProfile {
  deviceId: string;
  lastDisplayName: string | null;
  lastFullName: string | null;
  lastEmail: string | null;
  lastPhone: string | null;
  lastBirthDate: string | null;
  lastPreferredContact: 'email' | 'phone' | 'none';
  highestTier: CustomerTier;
  linkedCustomerId: string | null;
  visitCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeviceProfileData {
  deviceId: string;
  lastDisplayName?: string | null;
  lastFullName?: string | null;
  lastEmail?: string | null;
  lastPhone?: string | null;
  lastBirthDate?: string | null;
  lastPreferredContact?: 'email' | 'phone' | 'none';
  highestTier?: CustomerTier;
}

export interface UpdateDeviceProfileData {
  lastDisplayName?: string | null;
  lastFullName?: string | null;
  lastEmail?: string | null;
  lastPhone?: string | null;
  lastBirthDate?: string | null;
  lastPreferredContact?: 'email' | 'phone' | 'none';
  highestTier?: CustomerTier;
  linkedCustomerId?: string | null;
  visitCount?: number;
}
