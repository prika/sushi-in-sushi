"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

interface OrderWithProduct {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  products?: { name: string } | null;
}

interface DashboardStats {
  activeSessions: number;
  totalSessionsToday: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  tablesOccupied: number;
  totalTables: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeSessions: 0,
    totalSessionsToday: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    tablesOccupied: 0,
    totalTables: 0,
  });
  const [recentOrders, setRecentOrders] = useState<OrderWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all data in parallel
      const [
        { data: activeSessions },
        { data: todaySessions },
        { data: orders },
        { data: tables },
      ] = await Promise.all([
        // Active sessions
        supabase
          .from("sessions")
          .select("*")
          .eq("status", "active"),

        // All sessions today
        supabase
          .from("sessions")
          .select("*")
          .gte("created_at", today.toISOString()),

        // Today's orders with product info
        supabase
          .from("orders")
          .select("*, products(name)")
          .gte("created_at", today.toISOString()),

        // Tables count
        supabase
          .from("tables")
          .select("*"),
      ]);

      // Calculate stats
      const activeSessionsList = activeSessions || [];
      const allOrders = orders || [];
      const tablesList = tables || [];

      const pendingOrders = allOrders.filter((o) => o.status === "pending").length;
      const preparingOrders = allOrders.filter((o) => o.status === "preparing").length;
      const readyOrders = allOrders.filter((o) => o.status === "ready").length;

      // Calculate revenue from delivered orders
      const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
      const totalRevenue = deliveredOrders.reduce(
        (sum, order) => sum + (order.quantity * (order.unit_price || 0)),
        0
      );

      const averageOrderValue =
        deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

      // Get occupied tables
      const occupiedTableIds = new Set(activeSessionsList.map((s) => s.table_id));

      setStats({
        activeSessions: activeSessionsList.length,
        totalSessionsToday: todaySessions?.length || 0,
        pendingOrders,
        preparingOrders,
        readyOrders,
        totalRevenue,
        averageOrderValue,
        tablesOccupied: occupiedTableIds.size,
        totalTables: tablesList.length,
      });

      // Get recent orders
      setRecentOrders(allOrders.slice(0, 10));
      setIsLoading(false);
    };

    fetchDashboardData();

    // Set up real-time subscription
    const supabase = createClient();

    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Sessions */}
        <Card variant="light">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sessões Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
              <p className="text-xs text-gray-400">{stats.totalSessionsToday} hoje</p>
            </div>
          </div>
        </Card>

        {/* Orders */}
        <Card variant="light">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pedidos</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {stats.pendingOrders + stats.preparingOrders}
                </span>
                <span className="text-xs text-gray-400">ativos</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-600">{stats.pendingOrders} pendentes</span>
                <span className="text-orange-600">{stats.preparingOrders} a preparar</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Revenue */}
        <Card variant="light">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D4AF37]/20 rounded-xl">
              <svg className="w-6 h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Faturação Hoje</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalRevenue.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-400">
                Média: {stats.averageOrderValue.toFixed(2)}€/pedido
              </p>
            </div>
          </div>
        </Card>

        {/* Tables */}
        <Card variant="light">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mesas</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.tablesOccupied}/{stats.totalTables}
              </p>
              <p className="text-xs text-gray-400">ocupadas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card variant="light" header={<h2 className="text-lg font-semibold">Pedidos Recentes</h2>}>
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
                    {((order.quantity * (order.unit_price || 0))).toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        <Card variant="light" header={<h2 className="text-lg font-semibold">Resumo do Dia</h2>}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-700">Pedidos Entregues</span>
              </div>
              <span className="font-bold text-gray-900">
                {recentOrders.filter((o) => o.status === "delivered").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-700">Pedidos Pendentes</span>
              </div>
              <span className="font-bold text-gray-900">{stats.pendingOrders}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-gray-700">Em Preparação</span>
              </div>
              <span className="font-bold text-gray-900">{stats.preparingOrders}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-700">Prontos para Entrega</span>
              </div>
              <span className="font-bold text-gray-900">{stats.readyOrders}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-700">Cancelados</span>
              </div>
              <span className="font-bold text-gray-900">
                {recentOrders.filter((o) => o.status === "cancelled").length}
              </span>
            </div>
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
