/**
 * IStaffTimeOffRepository - Interface para repositório de ausências de funcionários
 */

import {
  StaffTimeOff,
  StaffTimeOffWithStaff,
  CreateStaffTimeOffData,
  UpdateStaffTimeOffData,
  StaffTimeOffFilter,
} from '../entities/StaffTimeOff';

export interface IStaffTimeOffRepository {
  findAll(filter?: StaffTimeOffFilter): Promise<StaffTimeOffWithStaff[]>;
  findById(id: number): Promise<StaffTimeOffWithStaff | null>;
  findByStaffId(staffId: string): Promise<StaffTimeOff[]>;
  findOverlapping(staffId: string, startDate: string, endDate: string, excludeId?: number): Promise<StaffTimeOff[]>;
  create(data: CreateStaffTimeOffData): Promise<StaffTimeOff>;
  update(id: number, data: UpdateStaffTimeOffData): Promise<StaffTimeOff>;
  approve(id: number, approvedBy: string): Promise<StaffTimeOff>;
  reject(id: number, approvedBy: string): Promise<StaffTimeOff>;
  delete(id: number): Promise<void>;
}
