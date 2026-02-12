/**
 * GetKitchenMetricsUseCase
 * Returns performance metrics for all kitchen staff
 */

import { KitchenStaffMetrics } from '@/domain/entities/KitchenMetrics';
import { IKitchenMetricsRepository, KitchenMetricsFilter } from '@/domain/repositories/IKitchenMetricsRepository';
import { Result, Results } from '../Result';

export interface GetKitchenMetricsInput {
  location?: string;
  fromDate?: Date;
  toDate?: Date;
}

export class GetKitchenMetricsUseCase {
  constructor(private repository: IKitchenMetricsRepository) {}

  async execute(input: GetKitchenMetricsInput): Promise<Result<KitchenStaffMetrics[]>> {
    try {
      const filter: KitchenMetricsFilter = {
        location: input.location,
        fromDate: input.fromDate,
        toDate: input.toDate,
      };

      const metrics = await this.repository.getStaffMetrics(filter);
      return Results.success(metrics);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar métricas da cozinha'
      );
    }
  }
}
