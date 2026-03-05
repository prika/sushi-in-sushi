/**
 * GetDashboardAnalyticsUseCase
 * Orchestrates all dashboard analytics queries in parallel
 */

import { Result, Results } from '../Result';
import { DashboardAnalytics } from '@/domain/entities/DashboardAnalytics';
import {
  IDashboardAnalyticsRepository,
  AnalyticsDateFilter,
} from '@/domain/repositories/IDashboardAnalyticsRepository';

export interface GetDashboardAnalyticsInput {
  from: Date;
  to: Date;
  location?: string;
  previousFrom: Date;
  previousTo: Date;
}

export class GetDashboardAnalyticsUseCase {
  constructor(private repository: IDashboardAnalyticsRepository) {}

  async execute(input: GetDashboardAnalyticsInput): Promise<Result<DashboardAnalytics>> {
    try {
      const currentFilter: AnalyticsDateFilter = {
        from: input.from,
        to: input.to,
        location: input.location,
      };

      const previousFilter: AnalyticsDateFilter = {
        from: input.previousFrom,
        to: input.previousTo,
        location: input.location,
      };

      const [kpis, previousKpis, revenueOverTime, ordersByHour, ordersByStatus, locationComparison] =
        await Promise.all([
          this.repository.getKpis(currentFilter),
          this.repository.getKpis(previousFilter),
          this.repository.getRevenueOverTime(currentFilter),
          this.repository.getOrdersByHour(currentFilter),
          this.repository.getOrdersByStatus(currentFilter),
          this.repository.getLocationComparison({ from: input.from, to: input.to }),
        ]);

      return Results.success({
        kpis,
        previousKpis,
        revenueOverTime,
        ordersByHour,
        ordersByStatus,
        locationComparison,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar analytics';
      return Results.error(message);
    }
  }
}
