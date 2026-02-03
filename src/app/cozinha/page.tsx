"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSound } from "@/hooks/useSound";
import type { OrderStatus } from "@/types/database";

interface KitchenOrder {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  product: {
    id: string;
    name: string;
  };
  session: {
    id: string;
    table: {
      id: string;
      number: number;
      location: string;
    };
  };
}

interface GroupedOrder {
  sessionId: string;
  tableNumber: number;
  location: string;
  timestamp: string;
  createdAt: Date;
  orders: KitchenOrder[];
  status: OrderStatus;
}

const LOCATIONS = [
  { value: "all", label: "Todas" },
  { value: "circunvalacao", label: "Circunvalação" },
  { value: "boavista", label: "Boavista" },
];

export default function CozinhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const { isSoundEnabled, toggleSound, playNewOrderSound, requestNotificationPermission, showNotification } = useSound();

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [headerFlash, setHeaderFlash] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          product:products(id, name),
          session:sessions(
            id,
            table:tables(id, number, location)
          )
        `)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      setOrders(data as KitchenOrder[]);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const timer = setInterval(fetchOrders, 30000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          console.log("New order:", payload);

          // Fetch the complete order with relations
          const { data } = await supabase
            .from("orders")
            .select(`
              *,
              product:products(id, name),
              session:sessions(
                id,
                table:tables(id, number, location)
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setOrders((prev) => [...prev, data as KitchenOrder]);

            // Play sound and show notification
            playNewOrderSound();
            showNotification(
              "Novo Pedido!",
              `Mesa ${(data as KitchenOrder).session?.table?.number}`
            );

            // Flash header
            setHeaderFlash(true);
            setTimeout(() => setHeaderFlash(false), 1000);

            // Mark as new
            setNewOrderIds((prev) => new Set([...Array.from(prev), data.id]));
            setTimeout(() => {
              setNewOrderIds((prev) => {
                const next = new Set(prev);
                next.delete(data.id);
                return next;
              });
            }, 30000);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("Order updated:", payload);
          setOrders((prev) =>
            prev.map((order) =>
              order.id === payload.new.id
                ? { ...order, ...payload.new }
                : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, playNewOrderSound, showNotification]);

  // Filter by location
  const filteredOrders = useMemo(() => {
    if (selectedLocation === "all") return orders;
    return orders.filter(
      (order) => order.session?.table?.location === selectedLocation
    );
  }, [orders, selectedLocation]);

  // Group orders by session and minute
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: GroupedOrder } = {};

    filteredOrders.forEach((order) => {
      const date = new Date(order.created_at);
      const minuteKey = `${order.session_id}-${date.getHours()}:${date.getMinutes()}`;

      if (!groups[minuteKey]) {
        groups[minuteKey] = {
          sessionId: order.session_id,
          tableNumber: order.session?.table?.number || 0,
          location: order.session?.table?.location || "",
          timestamp: date.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: date,
          orders: [],
          status: order.status,
        };
      }

      groups[minuteKey].orders.push(order);

      // Group status is the "lowest" status (pending < preparing < ready)
      const statusPriority: Record<OrderStatus, number> = {
        pending: 0,
        preparing: 1,
        ready: 2,
        delivered: 3,
        cancelled: 4,
      };

      if (statusPriority[order.status] < statusPriority[groups[minuteKey].status]) {
        groups[minuteKey].status = order.status;
      }
    });

    return Object.values(groups).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }, [filteredOrders]);

  // Split by status
  const pendingGroups = groupedOrders.filter((g) => g.status === "pending");
  const preparingGroups = groupedOrders.filter((g) => g.status === "preparing");
  const readyGroups = groupedOrders.filter((g) => g.status === "ready");

  // Transition functions
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      try {
        const { error } = await supabase
          .from("orders")
          .update({ status: newStatus })
          .eq("id", orderId);

        if (error) throw error;

        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          ).filter((order) =>
            newStatus === "delivered" ? order.id !== orderId : true
          )
        );
      } catch (err) {
        console.error("Error updating order:", err);
      }
    },
    [supabase]
  );

  const moveGroupToStatus = useCallback(
    async (group: GroupedOrder, newStatus: OrderStatus) => {
      await Promise.all(
        group.orders.map((order) => updateOrderStatus(order.id, newStatus))
      );
    },
    [updateOrderStatus]
  );

  // Get time color
  const getTimeColor = (createdAt: Date) => {
    const minutes = (currentTime.getTime() - createdAt.getTime()) / 60000;
    if (minutes > 10) return "border-red-500";
    if (minutes > 5) return "border-yellow-500";
    return "border-green-500";
  };

  const getMinutesSince = (createdAt: Date) => {
    return Math.floor((currentTime.getTime() - createdAt.getTime()) / 60000);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className={`
          flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#111]
          transition-colors duration-300
          ${headerFlash ? "bg-[#D4AF37]/20" : ""}
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍣</span>
          <div>
            <h1 className="text-xl font-bold">Cozinha</h1>
            <p className="text-sm text-gray-400">Sushi in Sushi</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Location Selector */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`
              p-2 rounded-lg transition-colors
              ${isSoundEnabled ? "bg-green-500/20 text-green-500" : "bg-gray-800 text-gray-500"}
            `}
            title={isSoundEnabled ? "Som ligado" : "Som desligado"}
          >
            {isSoundEnabled ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Clock */}
          <div className="text-2xl font-mono font-bold text-[#D4AF37]">
            {currentTime.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Sair"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content - Kanban */}
      <main className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Pending Column */}
        <Column
          title="Pendentes"
          icon="⏳"
          color="yellow"
          count={pendingGroups.reduce((sum, g) => sum + g.orders.length, 0)}
          groups={pendingGroups}
          currentTime={currentTime}
          newOrderIds={newOrderIds}
          getTimeColor={getTimeColor}
          getMinutesSince={getMinutesSince}
          actionLabel="Iniciar"
          onAction={(group) => moveGroupToStatus(group, "preparing")}
        />

        {/* Preparing Column */}
        <Column
          title="A Preparar"
          icon="🔥"
          color="orange"
          count={preparingGroups.reduce((sum, g) => sum + g.orders.length, 0)}
          groups={preparingGroups}
          currentTime={currentTime}
          newOrderIds={newOrderIds}
          getTimeColor={getTimeColor}
          getMinutesSince={getMinutesSince}
          actionLabel="Pronto"
          onAction={(group) => moveGroupToStatus(group, "ready")}
        />

        {/* Ready Column */}
        <Column
          title="Prontos"
          icon="✅"
          color="green"
          count={readyGroups.reduce((sum, g) => sum + g.orders.length, 0)}
          groups={readyGroups}
          currentTime={currentTime}
          newOrderIds={newOrderIds}
          getTimeColor={getTimeColor}
          getMinutesSince={getMinutesSince}
          actionLabel="Entregue"
          onAction={(group) => moveGroupToStatus(group, "delivered")}
        />
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#D4AF37] border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

// Column Component
function Column({
  title,
  icon,
  color,
  count,
  groups,
  currentTime,
  newOrderIds,
  getTimeColor,
  getMinutesSince,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: string;
  color: "yellow" | "orange" | "green";
  count: number;
  groups: GroupedOrder[];
  currentTime: Date;
  newOrderIds: Set<string>;
  getTimeColor: (date: Date) => string;
  getMinutesSince: (date: Date) => number;
  actionLabel: string;
  onAction: (group: GroupedOrder) => void;
}) {
  const colorClasses = {
    yellow: "bg-yellow-500/10 border-yellow-500/30",
    orange: "bg-orange-500/10 border-orange-500/30",
    green: "bg-green-500/10 border-green-500/30",
  };

  const headerColors = {
    yellow: "text-yellow-500",
    orange: "text-orange-500",
    green: "text-green-500",
  };

  return (
    <div className={`flex flex-col rounded-xl border ${colorClasses[color]} overflow-hidden`}>
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className={`font-bold ${headerColors[color]}`}>{title}</h2>
        </div>
        <span className={`text-2xl font-bold ${headerColors[color]}`}>{count}</span>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {groups.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Sem pedidos</p>
        ) : (
          groups.map((group) => {
            const minutes = getMinutesSince(group.createdAt);
            const isLate = minutes > 10;
            const hasNewOrders = group.orders.some((o) => newOrderIds.has(o.id));

            return (
              <div
                key={`${group.sessionId}-${group.timestamp}`}
                className={`
                  relative bg-gray-900 rounded-xl border-l-4 overflow-hidden
                  ${getTimeColor(group.createdAt)}
                  ${hasNewOrders ? "animate-pulse-once" : ""}
                `}
              >
                {/* New Badge */}
                {hasNewOrders && (
                  <div className="absolute top-2 right-2 bg-[#D4AF37] text-black text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                    NOVO!
                  </div>
                )}

                {/* Late Badge */}
                {isLate && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ATRASADO
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-white">
                      {group.tableNumber}
                    </span>
                    <div className="text-sm text-gray-400">
                      <p>Mesa</p>
                      <p className="capitalize">{group.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{group.timestamp}</p>
                    <p className={`text-lg font-bold ${isLate ? "text-red-500" : "text-gray-300"}`}>
                      {minutes} min
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-2">
                  {group.orders.map((order) => (
                    <div key={order.id} className="flex items-start gap-2">
                      <span className="font-bold text-[#D4AF37]">{order.quantity}×</span>
                      <div className="flex-1">
                        <p className="font-medium">{order.product?.name}</p>
                        {order.notes && (
                          <p className="text-sm bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded mt-1">
                            📝 {order.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="px-4 py-3 border-t border-gray-800">
                  <button
                    onClick={() => onAction(group)}
                    className={`
                      w-full py-2 rounded-lg font-semibold transition-colors
                      ${color === "yellow" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                      ${color === "orange" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                      ${color === "green" ? "bg-gray-600 hover:bg-gray-700 text-white" : ""}
                    `}
                  >
                    {actionLabel}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        @keyframes pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-once {
          animation: pulse-once 0.5s ease-in-out 3;
        }
      `}</style>
    </div>
  );
}
