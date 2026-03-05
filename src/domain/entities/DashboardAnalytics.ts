/**
 * DashboardAnalytics Entity
 * Composite data types for the admin dashboard analytics
 */

export interface DashboardKpi {
  revenue: number;
  orderCount: number;
  averageTicket: number;
  occupancyRate: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface OrdersByHourDataPoint {
  hour: number;
  count: number;
}

export interface OrdersByStatusDataPoint {
  status: string;
  count: number;
}

export interface LocationComparisonDataPoint {
  location: string;
  locationName: string;
  revenue: number;
  orderCount: number;
  sessionCount: number;
  averageTicket: number;
}

export interface DashboardAnalytics {
  kpis: DashboardKpi;
  previousKpis: DashboardKpi;
  revenueOverTime: RevenueDataPoint[];
  ordersByHour: OrdersByHourDataPoint[];
  ordersByStatus: OrdersByStatusDataPoint[];
  locationComparison: LocationComparisonDataPoint[];
}
