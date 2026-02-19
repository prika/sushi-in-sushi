/**
 * IWaiterCallRepository - Interface para repositório de chamadas de assistência
 */

import {
  WaiterCall,
  WaiterCallWithDetails,
  CreateWaiterCallData,
  UpdateWaiterCallData,
  WaiterCallFilter,
} from '../entities/WaiterCall';

export interface IWaiterCallRepository {
  findAll(filter?: WaiterCallFilter): Promise<WaiterCallWithDetails[]>;
  findById(id: string): Promise<WaiterCall | null>;
  findPending(location?: string): Promise<WaiterCallWithDetails[]>;
  create(data: CreateWaiterCallData): Promise<WaiterCall>;
  update(id: string, data: UpdateWaiterCallData): Promise<WaiterCall>;
  acknowledge(id: string, staffId: string): Promise<WaiterCall>;
  complete(id: string): Promise<WaiterCall>;
  cancel(id: string): Promise<WaiterCall>;
}
