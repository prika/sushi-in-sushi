"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSound } from "@/hooks/useSound";
import { useActivityLog, useLocations } from "@/presentation/hooks";
import { useToast } from "@/components/ui";
import { useKitchenOrdersOptimized } from "@/presentation/hooks";
import type { KitchenOrderDTO } from "@/application/dto/OrderDTO";
import type { OrderStatus } from "@/domain/value-objects/OrderStatus";

// Helper to get extended supabase client (only for waiter notifications)
function getExtendedSupabase(supabase: ReturnType<typeof createClient>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

export default function CozinhaPage() {
  const router = useRouter();
  // Supabase only used for waiter notifications
  const supabase = useMemo(() => createClient(), []);
  const {
    isSoundEnabled,
    toggleSound,
    playNewOrderSound,
    requestNotificationPermission,
    showNotification,
  } = useSound();
  const { logActivity } = useActivityLog();
  const { showToast } = useToast();
  const { locations } = useLocations();

  // Build locations array with "all" option
  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "Todas" },
      ...locations.map((loc) => ({ value: loc.slug, label: loc.name }))
    ];
  }, [locations]);

  const [selectedLocation, setSelectedLocation] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [headerFlash, setHeaderFlash] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; location: string | null } | null>(null);

  // Fetch authenticated user identity on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.name,
            role: data.user.role,
            location: data.user.location ?? null,
          });
          // Kitchen staff: auto-lock to their assigned location
          if (data.user.role === "kitchen" && data.user.location) {
            setSelectedLocation(data.user.location);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Use the optimized hook with React Query for kitchen orders (96% faster)
  const {
    byStatus,
    isLoading,
    newOrderIds,
    updateStatus,
  } = useKitchenOrdersOptimized({
    location: selectedLocation === "all" ? undefined : (selectedLocation as "circunvalacao" | "boavista"),
    userId: currentUser?.id,
    autoRefetch: true,
    refetchInterval: 10000, // 10s background refetch (React Query)
    onNewOrder: (order: KitchenOrderDTO) => {
      // Play sound and show notification for new orders
      playNewOrderSound();
      showNotification(
        "Novo Pedido!",
        `Mesa ${order.table?.number || "?"}`
      );
      // Flash header
      setHeaderFlash(true);
      setTimeout(() => setHeaderFlash(false), 1000);
    },
  });

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

  // Notify waiter when order is ready
  const notifyWaiter = useCallback(
    async (order: KitchenOrderDTO) => {
      if (!order.table?.id) return;

      try {
        const extendedSupabase = getExtendedSupabase(supabase);

        // Build a clear message with table, product, and customer
        const tableNumber = order.table?.number || "?";
        const productInfo = `${order.quantity}× ${order.product?.name || "Produto"}`;
        const customerInfo = order.customerName
          ? ` para ${order.customerName}`
          : "";

        const message = `Mesa ${tableNumber}: ${productInfo}${customerInfo}`;

        // Create a waiter notification with order_id for tracking
        await extendedSupabase.from("waiter_calls").insert({
          table_id: order.table?.id,
          session_id: order.sessionId,
          order_id: order.id,
          call_type: "other",
          status: "pending",
          location: order.table?.location,
          message: message,
        });

        console.info(
          "[Kitchen] Notified waiter:",
          order.waiterName || "",
          "for order:",
          order.id
        );
        showToast("success", `Atendente ${order.waiterName || ""} notificado`);
      } catch (err) {
        console.error("Error notifying waiter:", err);
        showToast("error", "Erro ao notificar atendente");
      }
    },
    [supabase, showToast]
  );

  // Handle order status update with side effects
  const handleUpdateStatus = useCallback(
    async (order: KitchenOrderDTO, newStatus: OrderStatus) => {
      console.info(
        "[Kitchen] Updating order status:",
        order.id,
        "->",
        newStatus
      );

      try {
        await updateStatus(order.id, newStatus);

        // Notify waiter when order is ready
        if (newStatus === "ready") {
          await notifyWaiter(order);
        }

        // Log activity when marking orders as delivered
        if (newStatus === "delivered") {
          await logActivity("order_delivered", "order", order.id, {
            tableNumber: order.table?.number,
            location: order.table?.location,
            productName: order.product?.name,
            quantity: order.quantity,
            sessionId: order.sessionId,
          });
        }
      } catch (error) {
        console.error("[Kitchen] Error updating order status:", error);
        showToast("error", "Erro ao atualizar pedido");
      }
    },
    [updateStatus, notifyWaiter, logActivity, showToast]
  );

  // Sort orders by creation time
  const sortedPending = useMemo(
    () =>
      [...byStatus.pending].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [byStatus.pending]
  );

  const sortedPreparing = useMemo(
    () =>
      [...byStatus.preparing].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [byStatus.preparing]
  );

  const sortedReady = useMemo(
    () =>
      [...byStatus.ready].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [byStatus.ready]
  );

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
            <h1 className="text-xl font-bold">
              Cozinha{currentUser ? ` - ${currentUser.name}` : ""}
            </h1>
            <p className="text-sm text-gray-400">Sushi in Sushi</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Location Selector — only admins can switch; kitchen staff are locked to their location */}
          {currentUser?.role === "admin" ? (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              aria-label="Filtrar por localização"
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
            >
              {locationOptions.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          ) : currentUser?.location ? (
            <span className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 capitalize">
              {locations.find((l) => l.slug === currentUser.location)?.name ?? currentUser.location}
            </span>
          ) : null}

          {/* Real-time Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/30 status connected live">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Online</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={isSoundEnabled ? "Desativar som" : "Ativar som"}
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
          <div className="text-2xl font-mono font-bold text-[#D4AF37]" suppressHydrationWarning>
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
            aria-label="Terminar sessão"
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
          count={sortedPending.length}
          orders={sortedPending}
          newOrderIds={newOrderIds}
          actionLabel="Iniciar"
          onAction={(order) => handleUpdateStatus(order, "preparing")}
        />

        {/* Preparing Column */}
        <Column
          title="A Preparar"
          icon="🔥"
          color="orange"
          count={sortedPreparing.length}
          orders={sortedPreparing}
          newOrderIds={newOrderIds}
          actionLabel="Pronto"
          onAction={(order) => handleUpdateStatus(order, "ready")}
        />

        {/* Ready Column */}
        <Column
          title="Prontos para Servir"
          icon="✅"
          color="green"
          count={sortedReady.length}
          orders={sortedReady}
          newOrderIds={newOrderIds}
          actionLabel={null}
          onAction={(order) => handleUpdateStatus(order, "delivered")}
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
  newOrderIds,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: string;
  color: "yellow" | "orange" | "green";
  count: number;
  orders: KitchenOrderDTO[];
  newOrderIds: Set<string>;
  actionLabel: string | null;
  onAction: (order: KitchenOrderDTO) => void;
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

  const borderColorMap = {
    red: "border-red-500",
    yellow: "border-yellow-500",
    green: "border-green-500",
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
            const createdAt = new Date(order.createdAt);
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
                  ${borderColorMap[order.urgencyColor]}
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
                {order.isLate && !isNew && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ATRASADO
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-white">
                      {order.table?.number || "?"}
                    </span>
                    <div className="text-sm">
                      <p className="text-gray-400">Mesa</p>
                      <p className="capitalize text-gray-400">
                        {order.table?.location || ""}
                      </p>
                      {order.waiterName && (
                        <p className="text-blue-400 font-medium mt-0.5">
                          👤 {order.waiterName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{timestamp}</p>
                    <p
                      className={`text-lg font-bold ${order.isLate ? "text-red-500" : "text-gray-300"}`}
                    >
                      {order.timeElapsedMinutes} min
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
                      {order.notes && (
                        <p className="text-sm bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded mt-2">
                          📝 {order.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stage timing */}
                <div className="px-4 pb-2">
                  {order.status === "pending" && (
                    <p className="text-sm font-medium text-yellow-400">
                      Pendente h&aacute; {order.pendingMinutes} min
                    </p>
                  )}
                  {order.status === "preparing" && (
                    <p className="text-sm font-medium text-orange-400">
                      A preparar h&aacute; {order.preparingMinutes ?? 0} min
                    </p>
                  )}
                  {order.status === "ready" && (
                    <p className="text-sm font-medium text-green-400">
                      Pronto h&aacute; {order.readyMinutes ?? 0} min
                    </p>
                  )}
                </div>

                {/* Action Button */}
                {actionLabel && (
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
                )}
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
