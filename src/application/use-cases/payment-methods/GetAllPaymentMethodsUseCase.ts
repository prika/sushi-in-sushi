/**
 * GetAllPaymentMethodsUseCase - Obtem todos os metodos de pagamento
 */

import { IPaymentMethodRepository } from '@/domain/repositories/IPaymentMethodRepository';
import { PaymentMethod } from '@/domain/entities/PaymentMethod';
import { Result, Results } from '../Result';

export class GetAllPaymentMethodsUseCase {
  constructor(private repository: IPaymentMethodRepository) {}

  async execute(): Promise<Result<PaymentMethod[]>> {
    try {
      const methods = await this.repository.findAll();
      return Results.success(methods);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar metodos de pagamento'
      );
    }
  }
}
