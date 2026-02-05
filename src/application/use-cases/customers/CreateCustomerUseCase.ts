/**
 * CreateCustomerUseCase - Cria novo cliente
 */

import { ICustomerRepository } from '@/domain/repositories/ICustomerRepository';
import { Customer, CreateCustomerData } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export class CreateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(data: CreateCustomerData): Promise<Result<Customer>> {
    try {
      // Verificar se email já existe
      const existing = await this.customerRepository.findByEmail(data.email);
      if (existing) {
        return Results.error('Email já está registado', 'EMAIL_IN_USE');
      }

      const customer = await this.customerRepository.create(data);
      return Results.success(customer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar cliente'
      );
    }
  }
}
