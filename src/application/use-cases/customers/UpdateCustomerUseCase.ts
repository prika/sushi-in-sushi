/**
 * UpdateCustomerUseCase - Atualiza cliente
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Customer, UpdateCustomerData } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export class UpdateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string, data: UpdateCustomerData): Promise<Result<Customer>> {
    try {
      const existing = await this.customerRepository.findById(id);
      if (!existing) {
        return Results.error('Cliente não encontrado', 'NOT_FOUND');
      }

      // Se está a atualizar email, verificar duplicação
      if (data.email && data.email !== existing.email) {
        const emailExists = await this.customerRepository.findByEmail(data.email);
        if (emailExists) {
          return Results.error('Email já está em uso', 'EMAIL_IN_USE');
        }
      }

      const customer = await this.customerRepository.update(id, data);
      return Results.success(customer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar cliente'
      );
    }
  }
}
