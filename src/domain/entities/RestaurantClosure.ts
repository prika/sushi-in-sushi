/**
 * RestaurantClosure Entity - Representa dias de fecho do restaurante
 */

import { Location } from '../value-objects/Location';

export interface RestaurantClosure {
  id: number;
  closureDate: string;
  location: Location | null;
  reason: string | null;
  isRecurring: boolean;
  recurringDayOfWeek: number | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClosureData {
  closureDate: string;
  location?: Location | null;
  reason?: string | null;
  isRecurring?: boolean;
  recurringDayOfWeek?: number | null;
}

export interface UpdateClosureData {
  closureDate?: string;
  location?: Location | null;
  reason?: string | null;
  isRecurring?: boolean;
  recurringDayOfWeek?: number | null;
}

export interface ClosureFilter {
  location?: Location;
  isRecurring?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ClosureCheckResult {
  isClosed: boolean;
  reason?: string;
  closure?: RestaurantClosure;
}
