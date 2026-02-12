/**
 * GetStaffMetricsUseCase
 * Returns performance metrics for a single kitchen staff member
 */

import { KitchenStaffMetrics } from '@/domain/entities/KitchenMetrics';
import { IKitchenMetricsRepository, KitchenMetricsFilter } from '@/domain/repositories/IKitchenMetricsRepository';
import { Result, Results } from '../Result';

export interface GetStaffMetricsInput {
  staffId: string;
  fromDate?: Date;
  toDate?: Date;
}

export class GetStaffMetricsUseCase {
  constructor(private repository: IKitchenMetricsRepository) {}

  async execute(input: GetStaffMetricsInput): Promise<Result<KitchenStaffMetrics>> {
    try {
      if (!input.staffId) {
        return Results.error('staffId é obrigatório', 'VALIDATION_ERROR');
      }

      const filter: KitchenMetricsFilter = {
        fromDate: input.fromDate,
        toDate: input.toDate,
      };

      const metrics = await this.repository.getStaffMetricsById(input.staffId, filter);

      if (!metrics) {
        return Results.error('Funcionário não encontrado ou sem dados', 'NOT_FOUND');
      }

      return Results.success(metrics);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar métricas do funcionário'
      );
    }
  }
}
