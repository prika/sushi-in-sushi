/**
 * IDashboardAnalyticsRepository
 * Interface for querying dashboard analytics aggregations
 */

import {
  DashboardKpi,
  RevenueDataPoint,
  OrdersByHourDataPoint,
  OrdersByStatusDataPoint,
  LocationComparisonDataPoint,
} from '../entities/DashboardAnalytics';

export interface AnalyticsDateFilter {
  from: Date;
  to: Date;
  location?: string;
}

export interface IDashboardAnalyticsRepository {
  getKpis(filter: AnalyticsDateFilter): Promise<DashboardKpi>;
  getRevenueOverTime(filter: AnalyticsDateFilter): Promise<RevenueDataPoint[]>;
  getOrdersByHour(filter: AnalyticsDateFilter): Promise<OrdersByHourDataPoint[]>;
  getOrdersByStatus(filter: AnalyticsDateFilter): Promise<OrdersByStatusDataPoint[]>;
  getLocationComparison(filter: Omit<AnalyticsDateFilter, 'location'>): Promise<LocationComparisonDataPoint[]>;
}
