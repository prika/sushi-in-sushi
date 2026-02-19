/**
 * AddCustomerPointsUseCase - Adiciona pontos ao cliente
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Customer } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export class AddCustomerPointsUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string, points: number): Promise<Result<Customer>> {
    try {
      if (points <= 0) {
        return Results.error('Pontos devem ser positivos', 'INVALID_POINTS');
      }

      const existing = await this.customerRepository.findById(id);
      if (!existing) {
        return Results.error('Cliente não encontrado', 'NOT_FOUND');
      }

      const customer = await this.customerRepository.addPoints(id, points);
      return Results.success(customer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao adicionar pontos'
      );
    }
  }
}
