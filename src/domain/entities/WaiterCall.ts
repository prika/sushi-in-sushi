/**
 * WaiterCall Entity - Representa uma chamada de assistência
 */

import { Location } from '../value-objects/Location';

export type WaiterCallType = 'assistance' | 'bill' | 'order' | 'other';
export type WaiterCallStatus = 'pending' | 'acknowledged' | 'completed' | 'cancelled';

export interface WaiterCall {
  id: string;
  tableId: string;
  sessionId: string | null;
  callType: WaiterCallType;
  message: string | null;
  status: WaiterCallStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
  location: Location;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWaiterCallData {
  tableId: string;
  sessionId?: string | null;
  callType?: WaiterCallType;
  message?: string | null;
  location: Location;
}

export interface UpdateWaiterCallData {
  status?: WaiterCallStatus;
  acknowledgedBy?: string;
  message?: string;
}

export interface WaiterCallFilter {
  location?: Location;
  status?: WaiterCallStatus;
  tableId?: string;
}

export interface WaiterCallWithDetails extends WaiterCall {
  tableNumber: number;
  tableName: string;
  acknowledgedByName: string | null;
  assignedWaiterName: string | null;
  assignedWaiterId: string | null;
}
