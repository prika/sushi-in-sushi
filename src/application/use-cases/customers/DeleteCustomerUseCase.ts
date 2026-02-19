/**
 * DeleteCustomerUseCase - Remove cliente
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Result, Results } from '../Result';

export class DeleteCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const existing = await this.customerRepository.findById(id);
      if (!existing) {
        return Results.error('Cliente não encontrado', 'NOT_FOUND');
      }

      await this.customerRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao remover cliente'
      );
    }
  }
}
