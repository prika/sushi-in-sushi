/**
 * DeletePaymentMethodUseCase - Remove metodo de pagamento
 */

import { IPaymentMethodRepository } from '@/domain/repositories/IPaymentMethodRepository';
import { Result, Results } from '../Result';

export class DeletePaymentMethodUseCase {
  constructor(private repository: IPaymentMethodRepository) {}

  async execute(id: number): Promise<Result<void>> {
    try {
      const existing = await this.repository.findById(id);
      if (!existing) {
        return Results.error('Metodo de pagamento nao encontrado', 'NOT_FOUND');
      }

      await this.repository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao remover metodo de pagamento'
      );
    }
  }
}
