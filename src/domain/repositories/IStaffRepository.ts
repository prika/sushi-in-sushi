/**
 * IStaffRepository - Interface para repositório de funcionários
 */

import {
  Staff,
  StaffWithRole,
  CreateStaffData,
  UpdateStaffData,
  StaffFilter,
  Role,
} from '../entities/Staff';

export interface IStaffRepository {
  findAll(filter?: StaffFilter): Promise<StaffWithRole[]>;
  findById(id: string): Promise<StaffWithRole | null>;
  findByEmail(email: string): Promise<StaffWithRole | null>;
  create(data: CreateStaffData): Promise<Staff>;
  update(id: string, data: UpdateStaffData): Promise<Staff>;
  delete(id: string): Promise<void>;
  getAllRoles(): Promise<Role[]>;
  assignTables(staffId: string, tableIds: string[]): Promise<void>;
  getAssignedTables(staffId: string): Promise<string[]>;
}
