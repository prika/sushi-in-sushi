"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSound } from "@/hooks/useSound";
import { useActivityLog } from "@/hooks/useActivityLog";
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
  session_customer_id: string | null;
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
  customer_name?: string | null;
  waiter_id?: string | null;
  waiter_name?: string | null;
}

// Helper to get extended supabase client
function getExtendedSupabase(supabase: ReturnType<typeof createClient>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

const LOCATIONS = [
  { value: "all", label: "Todas" },
  { value: "circunvalacao", label: "Circunvalação" },
  { value: "boavista", label: "Boavista" },
];

export default function CozinhaPage() {
  const router = useRouter();
  // Use useMemo to ensure stable reference for supabase client
  // This prevents useEffect re-runs and real-time subscription issues
  const supabase = useMemo(() => createClient(), []);
  const {
    isSoundEnabled,
    toggleSound,
    playNewOrderSound,
    requestNotificationPermission,
    showNotification,
  } = useSound();
  const { logActivity } = useActivityLog();

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [headerFlash, setHeaderFlash] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Track orders we just updated locally to skip re-fetching from real-time
  const recentlyUpdatedOrdersRef = useRef<Set<string>>(new Set());

  // Ref for fetchOrders to avoid useEffect dependency issues
  const fetchOrdersRef = useRef<() => Promise<void>>(() => Promise.resolve());

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
        .select(
          `
          *,
          product:products(id, name),
          session:sessions(
            id,
            table:tables(id, number, location)
          )
        `,
        )
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch customer names for orders with session_customer_id
      const extendedSupabase = getExtendedSupabase(supabase);
      const customerIdsSet = new Set<string>();
      (data || []).forEach((o) => {
        if (o.session_customer_id) customerIdsSet.add(o.session_customer_id);
      });
      const customerIds = Array.from(customerIdsSet);
      const customerMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: customersData } = await extendedSupabase
          .from("session_customers")
          .select("id, display_name")
          .in("id", customerIds);

        if (customersData) {
          (customersData as { id: string; display_name: string }[]).forEach(
            (c) => {
              customerMap.set(c.id, c.display_name);
            },
          );
        }
      }

      // Fetch waiter assignments for tables
      const tableIdsSet = new Set<string>();
      (data || []).forEach((o) => {
        if (o.session?.table?.id) tableIdsSet.add(o.session.table.id);
      });
      const tableIds = Array.from(tableIdsSet);
      const waiterMap = new Map<
        string,
        { waiter_id: string; waiter_name: string }
      >();

      if (tableIds.length > 0) {
        const { data: waiterData } = await extendedSupabase
          .from("waiter_assignments")
          .select("table_id, staff_id, staff_name")
          .in("table_id", tableIds);

        if (waiterData) {
          (
            waiterData as {
              table_id: string;
              staff_id: string;
              staff_name: string;
            }[]
          ).forEach((w) => {
            waiterMap.set(w.table_id, {
              waiter_id: w.staff_id,
              waiter_name: w.staff_name,
            });
          });
        }
      }

      // Combine all data
      const ordersWithDetails = (data || []).map((order) => ({
        ...order,
        customer_name: order.session_customer_id
          ? customerMap.get(order.session_customer_id) || null
          : null,
        waiter_id: order.session?.table?.id
          ? waiterMap.get(order.session.table.id)?.waiter_id || null
          : null,
        waiter_name: order.session?.table?.id
          ? waiterMap.get(order.session.table.id)?.waiter_name || null
          : null,
      }));

      setOrders(ordersWithDetails as KitchenOrder[]);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Keep fetchOrdersRef updated
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh every 60 seconds as fallback (reduced frequency to avoid conflicts)
  useEffect(() => {
    const timer = setInterval(() => {
      // Only refresh if there are no recent local updates
      if (recentlyUpdatedOrdersRef.current.size === 0) {
        console.log("Auto-refresh: fetching orders");
        fetchOrders();
      } else {
        console.log("Auto-refresh: skipped, recent local updates pending");
      }
    }, 60000);
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
            .select(
              `
              *,
              product:products(id, name),
              session:sessions(
                id,
                table:tables(id, number, location)
              )
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setOrders((prev) => [...prev, data as KitchenOrder]);

            // Play sound and show notification
            playNewOrderSound();
            showNotification(
              "Novo Pedido!",
              `Mesa ${(data as KitchenOrder).session?.table?.number}`,
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
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const orderId = payload.new.id as string;
          const newStatus = (payload.new as { status: OrderStatus }).status;

          // Skip if we just updated this order locally
          if (recentlyUpdatedOrdersRef.current.has(orderId)) {
            console.log(
              "[Kitchen RT] Skipping - order was updated locally:",
              orderId,
            );
            return;
          }

          console.log("[Kitchen RT] Processing update:", orderId, "->", newStatus);

          // If status changed to delivered or cancelled, remove from list
          if (newStatus === "delivered" || newStatus === "cancelled") {
            console.log("[Kitchen RT] Removing order (delivered/cancelled):", orderId);
            setOrders((prev) => prev.filter((order) => order.id !== orderId));
            return;
          }

          // If status is still pending/preparing/ready, update the order in place
          // Use the payload data directly instead of fetching to avoid race conditions
          if (["pending", "preparing", "ready"].includes(newStatus)) {
            console.log("[Kitchen RT] Updating order status in place:", orderId, "->", newStatus);
            setOrders((prev) => {
              const exists = prev.some((order) => order.id === orderId);
              if (exists) {
                // Update existing order with new status from payload
                return prev.map((order) =>
                  order.id === orderId
                    ? { ...order, status: newStatus }
                    : order,
                );
              } else {
                // Order doesn't exist in our list - it might be a new order from another location
                // In this case, do a full refresh to get the complete data
                console.log("[Kitchen RT] Order not found locally, triggering refresh");
                fetchOrdersRef.current();
                return prev;
              }
            });
          }
        },
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
      (order) => order.session?.table?.location === selectedLocation,
    );
  }, [orders, selectedLocation]);

  // Sort orders by creation time
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [filteredOrders]);

  // Split by status
  const pendingOrders = sortedOrders.filter((o) => o.status === "pending");
  const preparingOrders = sortedOrders.filter((o) => o.status === "preparing");
  const readyOrders = sortedOrders.filter((o) => o.status === "ready");

  // Notify waiter when order is ready
  const notifyWaiter = useCallback(
    async (order: KitchenOrder) => {
      if (!order.session?.table?.id) return;

      try {
        const extendedSupabase = getExtendedSupabase(supabase);

        // Build a clear message with table, product, and customer
        const tableNumber = order.session?.table?.number || "?";
        const productInfo = `${order.quantity}× ${order.product?.name || "Produto"}`;
        const customerInfo = order.customer_name
          ? ` para ${order.customer_name}`
          : "";

        const message = `Mesa ${tableNumber}: ${productInfo}${customerInfo}`;

        // Create a waiter notification with order_id for tracking
        await extendedSupabase.from("waiter_calls").insert({
          table_id: order.session?.table?.id,
          session_id: order.session_id,
          order_id: order.id, // Link to the specific order
          call_type: "other", // Using "other" to distinguish from customer-initiated calls
          status: "pending",
          location: order.session?.table?.location,
          message: message,
        });

        console.log(
          `Notified waiter ${order.waiter_name || "unknown"} for order ready:`,
          message,
        );
      } catch (err) {
        console.error("Error notifying waiter:", err);
      }
    },
    [supabase],
  );

  // Transition functions
  const updateOrderStatus = useCallback(
    async (order: KitchenOrder, newStatus: OrderStatus) => {
      console.log(`[Kitchen] Updating order ${order.id}: ${order.status} -> ${newStatus}`);

      try {
        // Mark this order as recently updated to skip real-time re-fetch
        recentlyUpdatedOrdersRef.current.add(order.id);
        console.log(`[Kitchen] Added ${order.id} to ref, current size: ${recentlyUpdatedOrdersRef.current.size}`);

        // Update local state first (optimistic update)
        setOrders((prev) => {
          const updated = prev
            .map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
            .filter((o) =>
              newStatus === "delivered" ? o.id !== order.id : true,
            );
          console.log(`[Kitchen] Optimistic update: ${prev.length} orders -> ${updated.length} orders`);
          return updated;
        });

        // Then update database
        const { error } = await supabase
          .from("orders")
          .update({ status: newStatus })
          .eq("id", order.id);

        if (error) {
          console.error(`[Kitchen] DB update error for ${order.id}:`, error);
          // Revert optimistic update on error
          recentlyUpdatedOrdersRef.current.delete(order.id);
          throw error;
        }

        console.log(`[Kitchen] DB update success for ${order.id}`);

        // Notify waiter when order is ready
        if (newStatus === "ready") {
          await notifyWaiter(order);
        }

        // Log activity when marking orders as delivered
        if (newStatus === "delivered") {
          await logActivity("order_delivered", "order", order.id, {
            tableNumber: order.session?.table?.number,
            location: order.session?.table?.location,
            productName: order.product?.name,
            quantity: order.quantity,
            sessionId: order.session_id,
          });
        }

        // Clean up the ref after a delay (longer to handle slow network/multiple events)
        setTimeout(() => {
          recentlyUpdatedOrdersRef.current.delete(order.id);
          console.log(`[Kitchen] Removed ${order.id} from ref after timeout`);
        }, 10000);
      } catch (err) {
        console.error("[Kitchen] Error updating order:", err);
        // Refetch to restore correct state
        fetchOrdersRef.current();
      }
    },
    [supabase, notifyWaiter, logActivity],
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
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
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
          count={pendingOrders.length}
          orders={pendingOrders}
          currentTime={currentTime}
          newOrderIds={newOrderIds}
          getTimeColor={getTimeColor}
          getMinutesSince={getMinutesSince}
          actionLabel="Iniciar"
          onAction={(order) => updateOrderStatus(order, "preparing")}
        />

        {/* Preparing Column */}
        <Column
          title="A Preparar"
          icon="🔥"
          color="orange"
          count={preparingOrders.length}
          orders={preparingOrders}
          currentTime={currentTime}
          newOrderIds={newOrderIds}
          getTimeColor={getTimeColor}
          getMinutesSince={getMinutesSince}
          actionLabel="Pronto"
          onAction={(order) => updateOrderStatus(order, "ready")}
        />

        {/* Ready Column */}
        <Column
          title="Prontos"
          icon="✅"
          color="green"
          count={readyOrders.length}
          orders={readyOrders}
          currentTime={currentTime}
          newOrderIds={newOrderIds}
          getTimeColor={getTimeColor}
          getMinutesSince={getMinutesSince}
          actionLabel="Entregue"
          onAction={(order) => updateOrderStatus(order, "delivered")}
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
  orders,
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
  orders: KitchenOrder[];
  currentTime: Date;
  newOrderIds: Set<string>;
  getTimeColor: (date: Date) => string;
  getMinutesSince: (date: Date) => number;
  actionLabel: string;
  onAction: (order: KitchenOrder) => void;
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
    <div
      className={`flex flex-col rounded-xl border ${colorClasses[color]} overflow-hidden`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className={`font-bold ${headerColors[color]}`}>{title}</h2>
        </div>
        <span className={`text-2xl font-bold ${headerColors[color]}`}>
          {count}
        </span>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Sem pedidos</p>
        ) : (
          orders.map((order) => {
            const createdAt = new Date(order.created_at);
            const minutes = getMinutesSince(createdAt);
            const isLate = minutes > 10;
            const isNew = newOrderIds.has(order.id);
            const timestamp = createdAt.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={order.id}
                className={`
                  relative bg-gray-900 rounded-xl border-l-4 overflow-hidden
                  ${getTimeColor(createdAt)}
                  ${isNew ? "animate-pulse-once" : ""}
                `}
              >
                {/* New Badge */}
                {isNew && (
                  <div className="absolute top-2 right-2 bg-[#D4AF37] text-black text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                    NOVO!
                  </div>
                )}

                {/* Late Badge */}
                {isLate && !isNew && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ATRASADO
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-white">
                      {order.session?.table?.number || "?"}
                    </span>
                    <div className="text-sm text-gray-400">
                      <p>Mesa</p>
                      <p className="capitalize">
                        {order.session?.table?.location || ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{timestamp}</p>
                    <p
                      className={`text-lg font-bold ${isLate ? "text-red-500" : "text-gray-300"}`}
                    >
                      {minutes} min
                    </p>
                  </div>
                </div>

                {/* Item */}
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold text-[#D4AF37]">
                      {order.quantity}×
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        {order.product?.name}
                      </p>
                      {order.customer_name && (
                        <p className="text-sm text-gray-400">
                          <span className="text-gray-500">para</span>{" "}
                          <span className="text-[#D4AF37]">{order.customer_name}</span>
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-sm bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded mt-2">
                          📝 {order.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Waiter info (for ready orders) */}
                {color === "green" && order.waiter_name && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-gray-500">
                      Empregado:{" "}
                      <span className="text-blue-400">{order.waiter_name}</span>
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="px-4 py-3 border-t border-gray-800">
                  <button
                    onClick={() => onAction(order)}
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
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-once {
          animation: pulse-once 0.5s ease-in-out 3;
        }
      `}</style>
    </div>
  );
}
