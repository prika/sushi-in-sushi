/**
 * UpdatePaymentMethodUseCase - Atualiza metodo de pagamento
 */

import { IPaymentMethodRepository } from '@/domain/repositories/IPaymentMethodRepository';
import { PaymentMethod, UpdatePaymentMethodData } from '@/domain/entities/PaymentMethod';
import { Result, Results } from '../Result';

export interface UpdatePaymentMethodInput {
  id: number;
  data: UpdatePaymentMethodData;
}

export class UpdatePaymentMethodUseCase {
  constructor(private repository: IPaymentMethodRepository) {}

  async execute(input: UpdatePaymentMethodInput): Promise<Result<PaymentMethod>> {
    try {
      const existing = await this.repository.findById(input.id);
      if (!existing) {
        return Results.error('Metodo de pagamento nao encontrado', 'NOT_FOUND');
      }

      if (input.data.slug && input.data.slug !== existing.slug) {
        const slugExists = await this.repository.findBySlug(input.data.slug);
        if (slugExists) {
          return Results.error('Ja existe um metodo com este slug', 'DUPLICATE_SLUG');
        }
      }

      const method = await this.repository.update(input.id, input.data);
      return Results.success(method);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar metodo de pagamento'
      );
    }
  }
}
