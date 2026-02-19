/**
 * RecordCustomerVisitUseCase - Regista visita do cliente
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Customer } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export class RecordCustomerVisitUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string, spent: number): Promise<Result<Customer>> {
    try {
      if (spent < 0) {
        return Results.error('Valor gasto não pode ser negativo', 'INVALID_AMOUNT');
      }

      const existing = await this.customerRepository.findById(id);
      if (!existing) {
        return Results.error('Cliente não encontrado', 'NOT_FOUND');
      }

      const customer = await this.customerRepository.recordVisit(id, spent);
      return Results.success(customer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao registar visita'
      );
    }
  }
}
