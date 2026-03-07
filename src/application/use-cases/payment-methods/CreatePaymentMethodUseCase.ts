/**
 * CreatePaymentMethodUseCase - Cria novo metodo de pagamento
 */

import { IPaymentMethodRepository } from '@/domain/repositories/IPaymentMethodRepository';
import { PaymentMethod, CreatePaymentMethodData } from '@/domain/entities/PaymentMethod';
import { Result, Results } from '../Result';

export class CreatePaymentMethodUseCase {
  constructor(private repository: IPaymentMethodRepository) {}

  async execute(data: CreatePaymentMethodData): Promise<Result<PaymentMethod>> {
    try {
      if (!data.name || !data.slug) {
        return Results.error('Nome e slug sao obrigatorios', 'VALIDATION_ERROR');
      }

      const existing = await this.repository.findBySlug(data.slug);
      if (existing) {
        return Results.error('Ja existe um metodo com este slug', 'DUPLICATE_SLUG');
      }

      const method = await this.repository.create(data);
      return Results.success(method);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao criar metodo de pagamento'
      );
    }
  }
}
