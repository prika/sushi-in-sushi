/**
 * TransferSessionDataUseCase - Transfers accumulated session data to customer profile
 * Called when a session closes to persist games, ratings, allergens, and companions.
 */

import { ICustomerRepository, SessionStatsData } from '@/domain/repositories/ICustomerRepository';
import { Customer } from '@/domain/entities/Customer';
import { Result, Results } from '../Result';

export interface TransferSessionDataInput {
  customerId: string;
  totalSpent: number;
  sessionStats: SessionStatsData;
  companionCustomerIds: string[];
}

export class TransferSessionDataUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(input: TransferSessionDataInput): Promise<Result<Customer>> {
    try {
      if (input.totalSpent < 0) {
        return Results.error('Valor gasto não pode ser negativo', 'INVALID_AMOUNT');
      }

      const existing = await this.customerRepository.findById(input.customerId);
      if (!existing) {
        return Results.error('Cliente não encontrado', 'NOT_FOUND');
      }

      // Record visit + session stats (accumulated)
      const customer = await this.customerRepository.recordVisitWithSessionStats(
        input.customerId,
        input.totalSpent,
        input.sessionStats,
      );

      // Record companionships (don't block on individual failures)
      for (const companionId of input.companionCustomerIds) {
        try {
          await this.customerRepository.recordCompanionship(
            input.customerId,
            companionId,
          );
        } catch {
          // Log but don't fail the whole transfer
        }
      }

      return Results.success(customer);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao transferir dados da sessão',
      );
    }
  }
}
