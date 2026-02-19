/**
 * GetCustomerByIdUseCase - Obtém cliente por ID com histórico
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { CustomerWithHistory } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export class GetCustomerByIdUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string): Promise<Result<CustomerWithHistory | null>> {
    try {
      const customer = await this.customerRepository.findById(id);
      return Results.success(customer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar cliente'
      );
    }
  }
}
