/**
 * SupabaseDashboardAnalyticsRepository
 * Queries orders, sessions, and tables to compute dashboard analytics
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  DashboardKpi,
  RevenueDataPoint,
  OrdersByHourDataPoint,
  OrdersByStatusDataPoint,
  LocationComparisonDataPoint,
} from "@/domain/entities/DashboardAnalytics";
import {
  IDashboardAnalyticsRepository,
  AnalyticsDateFilter,
} from "@/domain/repositories/IDashboardAnalyticsRepository";

const SAFETY_LIMIT = 50_000;

interface OrderRow {
  id: string;
  status: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  session_id: string;
}

interface SessionRow {
  id: string;
  table_id: number;
  created_at: string;
  status: string;
}

interface TableRow {
  id: number;
  location: string;
}

export class SupabaseDashboardAnalyticsRepository implements IDashboardAnalyticsRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(private supabase: SupabaseClient) {}

  private async fetchData(filter: AnalyticsDateFilter & { location?: string }) {
    const fromISO = filter.from.toISOString();
    const toEnd = new Date(filter.to);
    toEnd.setHours(23, 59, 59, 999);
    const toISO = toEnd.toISOString();

    const [ordersRes, sessionsRes, tablesRes] = await Promise.all([
      this.supabase
        .from("orders")
        .select("id, status, quantity, unit_price, created_at, session_id")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .limit(SAFETY_LIMIT),
      this.supabase
        .from("sessions")
        .select("id, table_id, created_at, status")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .limit(SAFETY_LIMIT),
      this.supabase.from("tables").select("id, location"),
    ]);

    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (sessionsRes.error) throw new Error(sessionsRes.error.message);
    if (tablesRes.error) throw new Error(tablesRes.error.message);

    const orders = (ordersRes.data || []) as OrderRow[];
    const sessions = (sessionsRes.data || []) as SessionRow[];
    const tables = (tablesRes.data || []) as TableRow[];

    // Build lookup maps
    const tableMap = new Map<number, string>();
    for (const t of tables) {
      tableMap.set(t.id, t.location);
    }

    const sessionMap = new Map<string, SessionRow>();
    for (const s of sessions) {
      sessionMap.set(s.id, s);
    }

    // Filter by location if specified
    const locationFilter = filter.location;
    const filteredSessions = locationFilter
      ? sessions.filter((s) => tableMap.get(s.table_id) === locationFilter)
      : sessions;
    const sessionIds = new Set(filteredSessions.map((s) => s.id));
    const filteredOrders = orders.filter((o) => sessionIds.has(o.session_id));

    const filteredTableCount = locationFilter
      ? tables.filter((t) => t.location === locationFilter).length
      : tables.length;

    return {
      orders: filteredOrders,
      sessions: filteredSessions,
      tables,
      tableMap,
      sessionMap,
      totalTables: filteredTableCount,
    };
  }

  async getKpis(filter: AnalyticsDateFilter): Promise<DashboardKpi> {
    const { orders, sessions, totalTables } = await this.fetchData(filter);

    const deliveredOrders = orders.filter((o) => o.status === "delivered");
    const revenue = deliveredOrders.reduce(
      (sum, o) => sum + o.quantity * o.unit_price,
      0,
    );
    const orderCount = orders.length;
    const averageTicket = deliveredOrders.length > 0 ? revenue / deliveredOrders.length : 0;

    // Occupancy: unique tables with sessions / total tables
    const tablesUsed = new Set(sessions.map((s) => s.table_id)).size;
    const occupancyRate =
      totalTables > 0 ? (tablesUsed / totalTables) * 100 : 0;

    return { revenue, orderCount, averageTicket, occupancyRate };
  }

  async getRevenueOverTime(
    filter: AnalyticsDateFilter,
  ): Promise<RevenueDataPoint[]> {
    const { orders } = await this.fetchData(filter);

    const byDate = new Map<string, { revenue: number; orderCount: number }>();
    for (const o of orders) {
      if (o.status !== "delivered") continue;
      const date = o.created_at.split("T")[0];
      const entry = byDate.get(date) || { revenue: 0, orderCount: 0 };
      entry.revenue += o.quantity * o.unit_price;
      entry.orderCount++;
      byDate.set(date, entry);
    }

    // Fill gaps in date range
    const result: RevenueDataPoint[] = [];
    const current = new Date(filter.from);
    const end = new Date(filter.to);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      const entry = byDate.get(dateStr) || { revenue: 0, orderCount: 0 };
      result.push({ date: dateStr, ...entry });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  async getOrdersByHour(
    filter: AnalyticsDateFilter,
  ): Promise<OrdersByHourDataPoint[]> {
    const { orders } = await this.fetchData(filter);

    const hourCounts = new Array(24).fill(0);
    for (const o of orders) {
      const hour = new Date(o.created_at).getHours();
      hourCounts[hour]++;
    }

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  async getOrdersByStatus(
    filter: AnalyticsDateFilter,
  ): Promise<OrdersByStatusDataPoint[]> {
    const { orders } = await this.fetchData(filter);

    const statusCounts = new Map<string, number>();
    for (const o of orders) {
      statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
    }

    return Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getLocationComparison(
    filter: Omit<AnalyticsDateFilter, "location">,
  ): Promise<LocationComparisonDataPoint[]> {
    const { orders, sessions, tableMap } = await this.fetchData({
      ...filter,
      location: undefined,
    });

    // Build session-to-location map
    const sessionLocationMap = new Map<string, string>();
    for (const s of sessions) {
      const loc = tableMap.get(s.table_id);
      if (loc) sessionLocationMap.set(s.id, loc);
    }

    // Get restaurant names
    const { data: restaurants } = await this.supabase
      .from("restaurants")
      .select("slug, name");
    const nameMap = new Map<string, string>();
    for (const r of restaurants || []) {
      nameMap.set(r.slug, r.name);
    }

    // Aggregate by location
    const locData = new Map<
      string,
      { revenue: number; orderCount: number; sessionIds: Set<string> }
    >();

    for (const o of orders) {
      if (o.status !== "delivered") continue;
      const loc = sessionLocationMap.get(o.session_id);
      if (!loc) continue;
      const entry = locData.get(loc) || {
        revenue: 0,
        orderCount: 0,
        sessionIds: new Set(),
      };
      entry.revenue += o.quantity * o.unit_price;
      entry.orderCount++;
      entry.sessionIds.add(o.session_id);
      locData.set(loc, entry);
    }

    return Array.from(locData.entries()).map(([location, data]) => ({
      location,
      locationName: nameMap.get(location) || location,
      revenue: data.revenue,
      orderCount: data.orderCount,
      sessionCount: data.sessionIds.size,
      averageTicket: data.orderCount > 0 ? data.revenue / data.orderCount : 0,
    }));
  }
}
