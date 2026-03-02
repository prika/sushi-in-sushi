/**
 * Staff Entity - Representa um funcionário do sistema
 */

import { Location } from '../value-objects/Location';

export type RoleName = 'admin' | 'kitchen' | 'waiter' | 'customer';

export interface Role {
  id: number;
  name: RoleName;
  description: string;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  authUserId: string | null;
  roleId: number;
  location: Location | null;
  phone: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

export interface StaffWithRole extends Staff {
  role: Role;
}

export interface CreateStaffData {
  email: string;
  name: string;
  password: string;
  roleId: number;
  location?: Location | null;
  phone?: string | null;
}

export interface UpdateStaffData {
  email?: string;
  name?: string;
  password?: string;
  roleId?: number;
  location?: Location | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface StaffFilter {
  roleId?: number;
  location?: Location;
  isActive?: boolean;
  search?: string;
}
