"use client";

// TODO: Rever esta página mais tarde
// - Verificar layout e UX
// - Testar real-time updates
// - Confirmar fluxo de entregas

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRequireWaiter } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { Session, Table, WaiterCall, OrderWithProduct, SessionCustomer } from "@/types/database";

// Helper to bypass Supabase type checking for tables not in the generated types
function getExtendedSupabase(supabase: ReturnType<typeof createClient>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

interface SessionWithCustomers extends Session {
  customers?: SessionCustomer[];
}

interface TableWithSession extends Table {
  activeSession?: SessionWithCustomers | null;
}

interface OrderWithTableInfo extends OrderWithProduct {
  table_number: number;
  table_id: string;
  customer_name?: string;
}

export default function WaiterDashboard() {
  const { user, logout, isLoading: authLoading } = useRequireWaiter();
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [orders, setOrders] = useState<OrderWithTableInfo[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<(WaiterCall & { table_number: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const supabase = createClient();
        const extendedSupabase = getExtendedSupabase(supabase);
        let tableList: Table[] = [];
        let sessionIds: string[] = [];

        // For waiters, fetch only their assigned tables
        // For admins, fetch all tables
        if (user.role === "waiter") {
          const { data: assignments } = await supabase
            .from("waiter_tables")
            .select(`
              table:tables(*)
            `)
            .eq("staff_id", user.id);

          if (assignments) {
            tableList = assignments
              .filter((a) => a.table)
              .map((a) => a.table as Table);
          }
        } else {
          // Admin sees all tables
          const { data } = await supabase
            .from("tables")
            .select("*")
            .eq("is_active", true)
            .order("number");

          tableList = data || [];
        }

        if (tableList.length === 0) {
          setTables([]);
          setOrders([]);
          setWaiterCalls([]);
          setIsLoading(false);
          return;
        }

        const tableIds = tableList.map((t) => t.id);

        // Fetch active sessions for these tables
        const { data: sessions } = await supabase
          .from("sessions")
          .select("*")
          .in("table_id", tableIds)
          .eq("status", "active");

        // Get session IDs for orders fetch
        sessionIds = (sessions || []).map((s) => s.id);

        // Fetch session customers for active sessions
        let sessionCustomersMap: Map<string, SessionCustomer[]> = new Map();
        if (sessionIds.length > 0) {
          const { data: customersData } = await extendedSupabase
            .from("session_customers")
            .select("*")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: true });

          if (customersData) {
            (customersData as SessionCustomer[]).forEach((customer) => {
              const existing = sessionCustomersMap.get(customer.session_id) || [];
              sessionCustomersMap.set(customer.session_id, [...existing, customer]);
            });
          }
        }

        const tablesWithSessions = tableList.map((table) => {
          const session = sessions?.find((s) => s.table_id === table.id);
          return {
            ...table,
            activeSession: session ? {
              ...session,
              customers: sessionCustomersMap.get(session.id) || [],
            } : null,
          };
        });

        setTables(tablesWithSessions);

        // Fetch all orders from active sessions (not delivered/cancelled)
        if (sessionIds.length > 0) {
          const { data: ordersData } = await supabase
            .from("orders")
            .select(`
              *,
              product:products(*)
            `)
            .in("session_id", sessionIds)
            .in("status", ["pending", "preparing", "ready"])
            .order("created_at", { ascending: true });

          if (ordersData) {
            const ordersWithTableInfo = ordersData.map((order) => {
              const session = sessions?.find((s) => s.id === order.session_id);
              const table = tableList.find((t) => t.id === session?.table_id);
              // Find customer name if session_customer_id exists
              const customers = sessionCustomersMap.get(order.session_id) || [];
              const customer = customers.find((c) => c.id === order.session_customer_id);
              return {
                ...order,
                table_number: table?.number || 0,
                table_id: table?.id || "",
                customer_name: customer?.display_name || undefined,
              } as OrderWithTableInfo;
            });
            setOrders(ordersWithTableInfo);
          }
        } else {
          setOrders([]);
        }

        // Fetch pending waiter calls for these tables
        const { data: callsData } = await extendedSupabase
          .from("waiter_calls")
          .select("*")
          .in("table_id", tableIds)
          .in("status", ["pending", "acknowledged"])
          .order("created_at", { ascending: false });

        if (callsData) {
          const callsWithTableNumber = (callsData as WaiterCall[]).map((call) => ({
            ...call,
            table_number: tableList.find((t) => t.id === call.table_id)?.number || 0,
          }));
          setWaiterCalls(callsWithTableNumber);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription for sessions, orders, and waiter calls
    const supabase = createClient();
    const subscription = supabase
      .channel("waiter-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleAcknowledgeCall = async (callId: string) => {
    if (!user) return;
    const supabase = createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    await extendedSupabase
      .from("waiter_calls")
      .update({
        status: "acknowledged",
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", callId);
  };

  const handleCompleteCall = async (callId: string) => {
    const supabase = createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    await extendedSupabase
      .from("waiter_calls")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", callId);
  };

  const handleMarkDelivered = async (orderId: string) => {
    const supabase = createClient();
    await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeTables = tables.filter((t) => t.activeSession);
  const availableTables = tables.filter((t) => !t.activeSession);
  const pendingCalls = waiterCalls.filter((c) => c.status === "pending");

  // Group orders by status
  const readyOrders = orders.filter((o) => o.status === "ready");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const statusConfig = {
    pending: { label: "Pendente", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" },
    preparing: { label: "A Preparar", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
    ready: { label: "Pronto", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" },
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🍣</span>
            <div>
              <h1 className="text-lg font-bold text-white">Painel do Empregado</h1>
              <p className="text-sm text-gray-400">
                {user?.name} • {user?.location === "circunvalacao" ? "Circunvalação" : "Boavista"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tables.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhuma mesa atribuída
            </h2>
            <p className="text-gray-400">
              Contacte o administrador para atribuir mesas.
            </p>
          </div>
        ) : (
          <>
            {/* Quick Stats Bar */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-gray-800">
                <span className="text-gray-400 text-sm">Mesas:</span>
                <span className="text-[#D4AF37] font-bold">{activeTables.length}</span>
                <span className="text-gray-500">/</span>
                <span className="text-white">{tables.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-gray-800">
                <span className="text-gray-400 text-sm">Pessoas:</span>
                <span className="text-white font-bold">
                  {activeTables.reduce((sum, t) => sum + (t.activeSession?.num_people || 0), 0)}
                </span>
              </div>
              {readyOrders.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30 animate-pulse">
                  <span className="text-green-400 text-sm font-semibold">
                    🔔 {readyOrders.length} pedido(s) pronto(s) para entregar!
                  </span>
                </div>
              )}
            </div>

            {/* Waiter Calls Alert */}
            {waiterCalls.length > 0 && (
              <div className="mb-6 space-y-2">
                <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${pendingCalls.length > 0 ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`} />
                  Chamadas ({waiterCalls.length})
                </h2>
                {waiterCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`rounded-lg p-3 border ${
                      call.status === "pending"
                        ? "bg-red-500/20 border-red-500/50"
                        : "bg-yellow-500/20 border-yellow-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {call.call_type === "bill" && "💳"}
                          {call.call_type === "assistance" && "🔔"}
                          {call.call_type === "order" && "📝"}
                          {call.call_type === "other" && "❓"}
                        </span>
                        <Link
                          href={`/waiter/mesa/${call.table_id}`}
                          className={`font-semibold hover:underline ${
                            call.status === "pending" ? "text-red-400" : "text-yellow-400"
                          }`}
                        >
                          Mesa #{call.table_number}
                        </Link>
                        <span className="text-gray-400 text-sm">
                          {call.call_type === "bill" && "pede a conta"}
                          {call.call_type === "assistance" && "precisa de ajuda"}
                          {call.call_type === "order" && "quer fazer pedido"}
                          {call.call_type === "other" && "chamou"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {call.status === "pending" && (
                          <button
                            onClick={() => handleAcknowledgeCall(call.id)}
                            className="px-2 py-1 text-xs bg-yellow-500/30 text-yellow-400 rounded hover:bg-yellow-500/40 transition-colors"
                          >
                            Aceitar
                          </button>
                        )}
                        <button
                          onClick={() => handleCompleteCall(call.id)}
                          className="px-2 py-1 text-xs bg-green-500/30 text-green-400 rounded hover:bg-green-500/40 transition-colors"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Orders Section - Main Focus */}
            <div className="space-y-6 mb-8">
              {/* Ready to Deliver - Most Important */}
              {readyOrders.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    Pronto para Entregar ({readyOrders.length})
                  </h2>
                  <div className="grid gap-3">
                    {readyOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-green-500/10 rounded-xl p-4 border-2 border-green-500/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Link
                              href={`/waiter/mesa/${order.table_id}`}
                              className="text-2xl font-bold text-green-400 hover:underline"
                            >
                              #{order.table_number}
                            </Link>
                            <div>
                              <p className="font-semibold text-white">
                                {order.quantity}x {order.product.name}
                              </p>
                              {order.customer_name && (
                                <p className="text-sm text-green-300">
                                  <span className="text-gray-500">para</span> {order.customer_name}
                                </p>
                              )}
                              {order.notes && (
                                <p className="text-sm text-gray-400">Nota: {order.notes}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                          >
                            ✓ Entregar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Preparing - In Kitchen */}
              {preparingOrders.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full" />
                    Na Cozinha ({preparingOrders.length})
                  </h2>
                  <div className="grid gap-2">
                    {preparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/waiter/mesa/${order.table_id}`}
                              className="text-lg font-bold text-blue-400 hover:underline"
                            >
                              #{order.table_number}
                            </Link>
                            <div>
                              <p className="text-white">
                                {order.quantity}x {order.product.name}
                                {order.customer_name && (
                                  <span className="text-xs text-gray-400 ml-2">({order.customer_name})</span>
                                )}
                              </p>
                              {order.notes && (
                                <p className="text-xs text-gray-500">Nota: {order.notes}</p>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                            A preparar
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Pending - Waiting for Kitchen */}
              {pendingOrders.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-full" />
                    Aguardam Cozinha ({pendingOrders.length})
                  </h2>
                  <div className="grid gap-2">
                    {pendingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/waiter/mesa/${order.table_id}`}
                              className="text-lg font-bold text-orange-400 hover:underline"
                            >
                              #{order.table_number}
                            </Link>
                            <div>
                              <p className="text-white">
                                {order.quantity}x {order.product.name}
                                {order.customer_name && (
                                  <span className="text-xs text-gray-400 ml-2">({order.customer_name})</span>
                                )}
                              </p>
                              {order.notes && (
                                <p className="text-xs text-gray-500">Nota: {order.notes}</p>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded">
                            Pendente
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* No active orders message */}
              {orders.length === 0 && activeTables.length > 0 && (
                <div className="text-center py-8 bg-[#1a1a1a] rounded-xl border border-gray-800">
                  <div className="text-4xl mb-3">✨</div>
                  <p className="text-gray-400">Sem pedidos ativos no momento</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800 my-8" />

            {/* Tables Section - Secondary */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Minhas Mesas</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.map((table) => {
                  const sessionStarted = table.activeSession?.started_at
                    ? new Date(table.activeSession.started_at)
                    : null;
                  const minutesElapsed = sessionStarted
                    ? Math.floor((Date.now() - sessionStarted.getTime()) / 60000)
                    : 0;

                  return (
                    <Link
                      key={table.id}
                      href={`/waiter/mesa/${table.id}`}
                      className={`rounded-xl p-4 transition-all hover:scale-[1.02] ${
                        table.activeSession
                          ? "bg-[#D4AF37]/10 border-2 border-[#D4AF37]/50 hover:border-[#D4AF37]"
                          : "bg-[#1a1a1a] border border-gray-800 hover:border-green-500/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-2xl font-bold ${
                          table.activeSession ? "text-[#D4AF37]" : "text-white"
                        }`}>
                          #{table.number}
                        </span>
                        {table.activeSession ? (
                          <span className="px-2 py-0.5 text-xs bg-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                            Ativa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                            Livre
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 mb-2 truncate">{table.name}</p>

                      {table.activeSession && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-white">{table.activeSession.num_people} pessoas</span>
                          </div>

                          {/* Customer Names */}
                          {table.activeSession.customers && table.activeSession.customers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {table.activeSession.customers.slice(0, 3).map((customer) => (
                                <span
                                  key={customer.id}
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    customer.is_session_host
                                      ? "bg-[#D4AF37]/30 text-[#D4AF37]"
                                      : "bg-gray-700 text-gray-300"
                                  }`}
                                >
                                  {customer.display_name}
                                </span>
                              ))}
                              {table.activeSession.customers.length > 3 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded-full">
                                  +{table.activeSession.customers.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-400">{minutesElapsed} min</span>
                          </div>

                          {table.activeSession.notes && (
                            <div className="pt-2 border-t border-gray-700">
                              <p className="text-xs text-gray-400 truncate" title={table.activeSession.notes}>
                                📝 {table.activeSession.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-1 mt-2">
                            {table.activeSession.is_rodizio && (
                              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                                Rodízio
                              </span>
                            )}
                            {!table.activeSession.is_rodizio && (
                              <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                                À Carta
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {!table.activeSession && (
                        <div className="text-center py-2">
                          <span className="text-sm text-gray-500">Toque para iniciar</span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
