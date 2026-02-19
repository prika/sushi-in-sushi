/**
 * KitchenMetrics Entity
 * Represents performance metrics for kitchen staff members
 */

export interface KitchenStaffMetrics {
  staffId: string;
  staffName: string;
  ordersPrepared: number;
  avgPrepTimeMinutes: number;
  ratingsReceived: number;
  avgRating: number | null;
}
