/**
 * StaffTimeOff Entity - Representa uma ausência de funcionário (férias, doença, etc.)
 */

export type StaffTimeOffType = 'vacation' | 'sick' | 'personal' | 'other';
export type StaffTimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface StaffTimeOff {
  id: number;
  staffId: string;
  startDate: string;
  endDate: string;
  type: StaffTimeOffType;
  reason: string | null;
  status: StaffTimeOffStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffTimeOffWithStaff extends StaffTimeOff {
  staff: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateStaffTimeOffData {
  staffId: string;
  startDate: string;
  endDate: string;
  type: StaffTimeOffType;
  reason?: string | null;
}

export interface UpdateStaffTimeOffData {
  startDate?: string;
  endDate?: string;
  type?: StaffTimeOffType;
  reason?: string | null;
  status?: StaffTimeOffStatus;
  approvedBy?: string | null;
}

export interface StaffTimeOffFilter {
  staffId?: string;
  month?: number;
  year?: number;
  type?: StaffTimeOffType;
  status?: StaffTimeOffStatus;
  dateFrom?: string;
  dateTo?: string;
}
