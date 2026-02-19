/**
 * IKitchenMetricsRepository
 * Interface for querying kitchen staff performance metrics
 */

import { KitchenStaffMetrics } from '../entities/KitchenMetrics';

export interface KitchenMetricsFilter {
  staffId?: string;
  location?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface IKitchenMetricsRepository {
  getStaffMetrics(filter: KitchenMetricsFilter): Promise<KitchenStaffMetrics[]>;
  getStaffMetricsById(staffId: string, filter: KitchenMetricsFilter): Promise<KitchenStaffMetrics | null>;
}
