/**
 * GetAllCustomersUseCase - Obtém todos os clientes
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Customer, CustomerFilter } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export class GetAllCustomersUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(filter?: CustomerFilter): Promise<Result<Customer[]>> {
    try {
      const customers = await this.customerRepository.findAll(filter);
      return Results.success(customers);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar clientes'
      );
    }
  }
}
