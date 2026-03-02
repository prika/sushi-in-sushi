/**
 * SupabaseKitchenMetricsRepository
 * Queries orders + staff + product_ratings to compute kitchen staff performance
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { KitchenStaffMetrics } from '@/domain/entities/KitchenMetrics';
import { IKitchenMetricsRepository, KitchenMetricsFilter } from '@/domain/repositories/IKitchenMetricsRepository';

export class SupabaseKitchenMetricsRepository implements IKitchenMetricsRepository {
  constructor(private _supabase: SupabaseClient) {}

  async getStaffMetrics(filter: KitchenMetricsFilter): Promise<KitchenStaffMetrics[]> {
    // 1. Get all orders with prepared_by set (kitchen staff who prepared something)
    let ordersQuery = this._supabase
      .from('orders')
      .select('id, prepared_by, preparing_started_at, ready_at, status')
      .not('prepared_by', 'is', null);

    if (filter.fromDate) {
      ordersQuery = ordersQuery.gte('created_at', filter.fromDate.toISOString());
    }
    if (filter.toDate) {
      ordersQuery = ordersQuery.lte('created_at', filter.toDate.toISOString());
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw new Error(ordersError.message);
    if (!orders || orders.length === 0) return [];

    // 2. Get unique staff IDs and fetch their names
    const staffIds = Array.from(new Set(orders.map((o) => o.prepared_by as string)));

    let staffQuery = this._supabase
      .from('staff')
      .select('id, name')
      .in('id', staffIds);

    if (filter.location) {
      staffQuery = staffQuery.eq('location', filter.location);
    }

    const { data: staffList, error: staffError } = await staffQuery;
    if (staffError) throw new Error(staffError.message);

    const staffMap = new Map<string, string>();
    for (const s of staffList ?? []) {
      staffMap.set(s.id, s.name);
    }

    // If filtering by location, only keep orders from matching staff
    const validStaffIds = new Set(staffMap.keys());
    const filteredOrders = filter.location
      ? orders.filter((o) => validStaffIds.has(o.prepared_by as string))
      : orders;

    // 3. Aggregate orders by staff (using Record to avoid Map iterator issues)
    const ordersByStaff: Record<string, typeof filteredOrders> = {};
    for (const o of filteredOrders) {
      const sid = o.prepared_by as string;
      if (!ordersByStaff[sid]) ordersByStaff[sid] = [];
      ordersByStaff[sid].push(o);
    }

    // 4. Get ratings for orders that have prepared_by
    const orderIds = filteredOrders.map((o) => o.id);
    const { data: ratings, error: ratingsError } = await this._supabase
      .from('product_ratings')
      .select('order_id, rating')
      .in('order_id', orderIds.length > 0 ? orderIds : ['__none__']);

    if (ratingsError) throw new Error(ratingsError.message);

    // Index ratings by order_id
    const ratingsByOrder: Record<string, number[]> = {};
    for (const r of ratings ?? []) {
      if (!r.order_id) continue;
      if (!ratingsByOrder[r.order_id]) ratingsByOrder[r.order_id] = [];
      ratingsByOrder[r.order_id].push(r.rating);
    }

    // 5. Build metrics per staff
    const metrics: KitchenStaffMetrics[] = [];

    for (const staffId of Object.keys(ordersByStaff)) {
      const staffOrders = ordersByStaff[staffId];
      const staffName = staffMap.get(staffId) ?? 'Unknown';

      // Prep time: only count orders that have both timestamps
      const prepTimes: number[] = [];
      for (const o of staffOrders) {
        if (o.preparing_started_at && o.ready_at) {
          const start = new Date(o.preparing_started_at).getTime();
          const end = new Date(o.ready_at).getTime();
          if (end > start) {
            prepTimes.push((end - start) / 60000);
          }
        }
      }

      const avgPrepTimeMinutes = prepTimes.length > 0
        ? Math.round((prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) * 10) / 10
        : 0;

      // Ratings for this staff's orders
      const allRatings: number[] = [];
      for (const o of staffOrders) {
        const orderRatings = ratingsByOrder[o.id];
        if (orderRatings) allRatings.push(...orderRatings);
      }

      const avgRating = allRatings.length > 0
        ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
        : null;

      metrics.push({
        staffId,
        staffName,
        ordersPrepared: staffOrders.length,
        avgPrepTimeMinutes,
        ratingsReceived: allRatings.length,
        avgRating,
      });
    }

    // Sort by orders prepared descending
    metrics.sort((a, b) => b.ordersPrepared - a.ordersPrepared);

    return metrics;
  }

  async getStaffMetricsById(staffId: string, filter: KitchenMetricsFilter): Promise<KitchenStaffMetrics | null> {
    const all = await this.getStaffMetrics({ ...filter, staffId: undefined });
    return all.find((m) => m.staffId === staffId) ?? null;
  }
}
