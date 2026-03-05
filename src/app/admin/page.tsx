"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign,
  ShoppingBag,
  Receipt,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { useLocations } from "@/presentation/hooks/useLocations";
import { useDashboardAnalytics } from "@/presentation/hooks/useDashboardAnalytics";
import { useDateRange } from "@/hooks/useDateRange";
import {
  DateRangePicker,
  KpiCard,
  ChartCard,
  AreaChartWidget,
  BarChartWidget,
  DonutChartWidget,
  CHART_COLORS,
} from "@/components/charts";
import { Card } from "@/components/ui";

const STATUS_CONFIG: Record<string, { name: string; color: string }> = {
  pending: { name: "Na fila", color: CHART_COLORS.pending },
  preparing: { name: "A preparar", color: CHART_COLORS.preparing },
  ready: { name: "Pronto para servir", color: CHART_COLORS.ready },
  delivered: { name: "Entregue", color: CHART_COLORS.delivered },
  cancelled: { name: "Cancelado", color: CHART_COLORS.cancelled },
};

interface OrderWithProduct {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  products?: { name: string } | null;
}

export default function AdminDashboard() {
  const { dateRange, setDateRange } = useDateRange("30d");
  const [location, setLocation] = useState<string>("");
  const { locations } = useLocations();

  const { data, isLoading } = useDashboardAnalytics(
    dateRange,
    location || undefined
  );

  // Real-time recent orders (always live, independent of date range)
  const [recentOrders, setRecentOrders] = useState<OrderWithProduct[]>([]);
  const [liveStats, setLiveStats] = useState({
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fetchLive = async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*, products(name)")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      const allOrders = orders || [];
      setRecentOrders(allOrders);
      setLiveStats({
        pendingOrders: allOrders.filter((o) => o.status === "pending").length,
        preparingOrders: allOrders.filter((o) => o.status === "preparing").length,
        readyOrders: allOrders.filter((o) => o.status === "ready").length,
        deliveredOrders: allOrders.filter((o) => o.status === "delivered").length,
        cancelledOrders: allOrders.filter((o) => o.status === "cancelled").length,
      });
    };

    fetchLive();

    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchLive()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchLive()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Prepare chart data
  const ordersByStatus =
    data?.ordersByStatus.map((d) => ({
      name: STATUS_CONFIG[d.status]?.name || d.status,
      value: d.count,
      color: STATUS_CONFIG[d.status]?.color || CHART_COLORS.axis,
    })) || [];

  const ordersByHour = data?.ordersByHour.filter((d) => d.count > 0) || [];

  const locationBars =
    data?.locationComparison.map((d) => ({
      name: d.locationName,
      Receita: Math.round(d.revenue),
      Pedidos: d.orderCount,
      Sessões: d.sessionCount,
    })) || [];

  const formatDateShort = (val: string) => {
    const d = new Date(val);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Todos os locais</option>
            {locations.map((loc) => (
              <option key={loc.slug} value={loc.slug}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Faturação"
          value={data?.kpis.revenue ?? 0}
          previousValue={data?.previousKpis.revenue}
          format="currency"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Pedidos"
          value={data?.kpis.orderCount ?? 0}
          previousValue={data?.previousKpis.orderCount}
          format="number"
          icon={<ShoppingBag className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Ticket Médio"
          value={data?.kpis.averageTicket ?? 0}
          previousValue={data?.previousKpis.averageTicket}
          format="currency"
          icon={<Receipt className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Taxa de Ocupação"
          value={data?.kpis.occupancyRate ?? 0}
          previousValue={data?.previousKpis.occupancyRate}
          format="percent"
          icon={<LayoutGrid className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      {/* Revenue Over Time */}
      <ChartCard title="Faturação ao Longo do Tempo" subtitle="Receita diária de pedidos entregues">
        {isLoading ? (
          <div className="h-[300px] bg-gray-50 rounded animate-pulse" />
        ) : (
          <AreaChartWidget
            data={(data?.revenueOverTime || []) as unknown as Record<string, unknown>[]}
            xKey="date"
            yKey="revenue"
            formatY="currency"
            xTickFormatter={formatDateShort}
          />
        )}
      </ChartCard>

      {/* Two column: Orders by Hour + Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pedidos por Hora" subtitle="Identificar picos de atividade">
          {isLoading ? (
            <div className="h-[300px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <BarChartWidget
              data={ordersByHour as unknown as Record<string, unknown>[]}
              xKey="hour"
              bars={[{ key: "count", name: "Pedidos", color: CHART_COLORS.gold }]}
              xTickFormatter={(h) => `${h}h`}
            />
          )}
        </ChartCard>

        <ChartCard title="Pedidos por Estado" subtitle="Distribuição de estados">
          {isLoading ? (
            <div className="h-[300px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <DonutChartWidget
              data={ordersByStatus}
              centerValue={String(data?.kpis.orderCount ?? 0)}
              centerLabel="total"
            />
          )}
        </ChartCard>
      </div>

      {/* Location Comparison */}
      {locationBars.length > 1 && (
        <ChartCard title="Comparação por Local" subtitle="Métricas lado a lado por restaurante">
          <BarChartWidget
            data={locationBars}
            xKey="name"
            bars={[
              { key: "Receita", name: "Receita (€)", color: CHART_COLORS.gold },
              { key: "Pedidos", name: "Pedidos", color: CHART_COLORS.preparing },
              { key: "Sessões", name: "Sessões", color: CHART_COLORS.delivered },
            ]}
            showLegend
          />
        </ChartCard>
      )}

      {/* Live Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders (real-time) */}
        <Card
          variant="light"
          header={
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-semibold">Pedidos Recentes</h2>
              <span className="text-xs text-gray-400">tempo real</span>
            </div>
          }
        >
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum pedido hoje</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.quantity}x {order.products?.name || "Produto"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {(order.quantity * (order.unit_price || 0)).toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Day Summary (real-time) */}
        <Card
          variant="light"
          header={
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-semibold">Resumo do Dia</h2>
              <span className="text-xs text-gray-400">tempo real</span>
            </div>
          }
        >
          <div className="space-y-3">
            {[
              { label: "Entregues", value: liveStats.deliveredOrders, color: "bg-green-500" },
              { label: "Pendentes", value: liveStats.pendingOrders, color: "bg-yellow-500" },
              { label: "Em Preparação", value: liveStats.preparingOrders, color: "bg-orange-500" },
              { label: "Prontos para Entrega", value: liveStats.readyOrders, color: "bg-blue-500" },
              { label: "Cancelados", value: liveStats.cancelledOrders, color: "bg-red-500" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-gray-700">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendente" },
    preparing: { bg: "bg-orange-100", text: "text-orange-700", label: "A Preparar" },
    ready: { bg: "bg-blue-100", text: "text-blue-700", label: "Pronto para servir" },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Entregue" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelado" },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
