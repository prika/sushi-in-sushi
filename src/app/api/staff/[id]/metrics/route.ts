import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = await createClient();

    // Fetch staff details with role
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select(`*, role:roles(*)`)
      .eq("id", id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 }
      );
    }

    // Fetch assigned tables (for waiters)
    const { data: assignments } = await supabase
      .from("waiter_tables")
      .select(`table:tables(*)`)
      .eq("staff_id", id);

    const assignedTables =
      assignments?.map((a) => a.table).filter(Boolean) || [];

    // Fetch activity log for delivered orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activityQuery = supabase
      .from("activity_log")
      .select("*")
      .eq("staff_id", id)
      .eq("action", "order_delivered")
      .order("created_at", { ascending: false });

    if (startDate) {
      activityQuery = activityQuery.gte("created_at", startDate);
    }
    if (endDate) {
      activityQuery = activityQuery.lte("created_at", `${endDate}T23:59:59`);
    }

    const { data: activities } = await activityQuery;

    // Calculate today's activities
    const todayActivities =
      activities?.filter((a) => new Date(a.created_at) >= today) || [];

    // Fetch order details for revenue calculation
    const orderIds = (activities?.map((a) => a.entity_id).filter((id): id is string => id !== null) || []);
    const { data: orders } = await supabase
      .from("orders")
      .select("id, unit_price, quantity, created_at, updated_at")
      .in("id", orderIds.length > 0 ? orderIds : ["no-match"]);

    const ordersMap = new Map(orders?.map((o) => [o.id, o]) || []);

    // Calculate metrics
    const calculateMetrics = (activityList: typeof activities) => {
      if (!activityList?.length) {
        return {
          ordersDelivered: 0,
          revenueGenerated: 0,
          averageDeliveryTimeMinutes: null as number | null,
        };
      }

      let totalRevenue = 0;
      let totalDeliveryTime = 0;
      let deliveryTimeCount = 0;

      for (const activity of activityList) {
        if (!activity.entity_id) continue;
        const order = ordersMap.get(activity.entity_id);
        if (order) {
          totalRevenue += order.unit_price * order.quantity;

          // Calculate delivery time if we have both timestamps
          if (order.created_at && order.updated_at) {
            const created = new Date(order.created_at);
            const delivered = new Date(order.updated_at);
            const diffMinutes =
              (delivered.getTime() - created.getTime()) / 60000;
            if (diffMinutes > 0 && diffMinutes < 120) {
              // Sanity check
              totalDeliveryTime += diffMinutes;
              deliveryTimeCount++;
            }
          }
        }
      }

      return {
        ordersDelivered: activityList.length,
        revenueGenerated: totalRevenue,
        averageDeliveryTimeMinutes:
          deliveryTimeCount > 0
            ? Math.round(totalDeliveryTime / deliveryTimeCount)
            : null,
      };
    };

    const todayMetrics = calculateMetrics(todayActivities);

    // Group by date for historical metrics
    const groupedByDate = new Map<string, typeof activities>();
    activities?.forEach((activity) => {
      const date = new Date(activity.created_at).toISOString().split("T")[0];
      if (!groupedByDate.has(date)) {
        groupedByDate.set(date, []);
      }
      groupedByDate.get(date)?.push(activity);
    });

    const historicalMetrics = Array.from(groupedByDate.entries())
      .map(([date, acts]) => ({
        date,
        ...calculateMetrics(acts),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Fetch recent activity (all types)
    const { data: recentActivity } = await supabase
      .from("activity_log")
      .select("*")
      .eq("staff_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      staff,
      assignedTables,
      todayMetrics: {
        ordersDeliveredToday: todayMetrics.ordersDelivered,
        revenueGeneratedToday: todayMetrics.revenueGenerated,
        averageDeliveryTimeMinutes: todayMetrics.averageDeliveryTimeMinutes,
        totalOrdersDelivered: activities?.length || 0,
        totalRevenueGenerated: historicalMetrics.reduce(
          (sum, m) => sum + m.revenueGenerated,
          0
        ),
      },
      historicalMetrics,
      recentActivity: recentActivity || [],
    });
  } catch (error) {
    console.error("Staff metrics error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar métricas" },
      { status: 500 }
    );
  }
}
