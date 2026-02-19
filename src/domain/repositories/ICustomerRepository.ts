/**
 * ICustomerRepository - Interface para repositório de clientes
 */

import {
  Customer,
  CustomerWithHistory,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerFilter,
} from '../entities/Customer';

export interface ICustomerRepository {
  findAll(filter?: CustomerFilter): Promise<Customer[]>;
  findById(id: string): Promise<CustomerWithHistory | null>;
  findByEmail(email: string): Promise<Customer | null>;
  create(data: CreateCustomerData): Promise<Customer>;
  update(id: string, data: UpdateCustomerData): Promise<Customer>;
  delete(id: string): Promise<void>;
  addPoints(id: string, points: number): Promise<Customer>;
  recordVisit(id: string, spent: number): Promise<Customer>;
}
