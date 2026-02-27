"use client";

// TODO: Rever esta página mais tarde
// - Verificar layout e UX
// - Testar real-time updates
// - Confirmar fluxo de entregas

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRequireWaiter } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLocations } from "@/presentation/hooks";
import type {
  Session,
  Table,
  WaiterCall,
  OrderWithProduct,
  SessionCustomer,
} from "@/types/database";

interface SessionWithCustomers extends Session {
  customers?: SessionCustomer[];
}

interface TableWithSession extends Table {
  activeSession?: SessionWithCustomers | null;
  assignedWaiterName?: string | null;
}

interface OrderWithTableInfo extends OrderWithProduct {
  table_number: number;
  table_id: string;
  customer_name?: string;
}

export default function WaiterDashboard() {
  const { user, logout, isLoading: authLoading } = useRequireWaiter();
  const { locations } = useLocations();
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [orders, setOrders] = useState<OrderWithTableInfo[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<
    (WaiterCall & {
      table_number: number;
      order_id?: string | null;
      session_customer_id?: string | null;
      customer_name?: string | null;
    })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);
  const [openingTableId, setOpeningTableId] = useState<string | null>(null);
  const [dismissingTableId, setDismissingTableId] = useState<string | null>(null);
  const [unassignedTables, setUnassignedTables] = useState<Table[]>([]);
  const [dashboardTab, setDashboardTab] = useState<"ativas" | "disponiveis">("ativas");
  // eslint-disable-next-line no-unused-vars
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [showTableAssignModal, setShowTableAssignModal] = useState(false);
  const [primaryTableId, setPrimaryTableId] = useState<string | null>(null);
  const [additionalTableIds, setAdditionalTableIds] = useState<string[]>([]);
  const [assigningReservation, setAssigningReservation] = useState(false);
  const [allLocationTables, setAllLocationTables] = useState<Table[]>([]);

  // Use memoized supabase client to prevent real-time subscription issues
  const supabase = useMemo(() => createClient(), []);

  // Helper to get location label
  const getLocationLabel = (location: string | null) => {
    if (!location) return "";
    return locations.find((loc) => loc.slug === location)?.name || location;
  };

  // Ref for fetchData to avoid useEffect dependency issues
  const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      let tableList: Table[] = [];
      let sessionIds: string[] = [];

      // For waiters, fetch only their assigned tables from their location
      // For admins, fetch all tables
      if (user.role === "waiter") {
        // Waiters can only see tables from their assigned location
        if (!user.location) {
          console.error("Waiter has no location assigned");
          tableList = [];
        } else {
          const { data: assignments } = await supabase
            .from("waiter_tables")
            .select(
              `
              table:tables!inner(*)
            `,
            )
            .eq("staff_id", user.id)
            .eq("table.location", user.location); // Filter by waiter's location

          if (assignments) {
            tableList = assignments
              .filter((a) => a.table)
              .map((a) => a.table as Table);
          }
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

      // Fetch active sessions for these tables (active or pending_payment)
      const { data: sessions } = await supabase
        .from("sessions")
        .select("*")
        .in("table_id", tableIds)
        .in("status", ["active", "pending_payment"]);

      // Get session IDs for orders fetch
      sessionIds = (sessions || []).map((s) => s.id);

      // Fetch session customers for active sessions
      const sessionCustomersMap: Map<string, SessionCustomer[]> = new Map();
      if (sessionIds.length > 0) {
        const { data: customersData } = await supabase
          .from("session_customers")
          .select("*")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true });

        if (customersData) {
          customersData.forEach((customer) => {
            const existing = sessionCustomersMap.get(customer.session_id) || [];
            sessionCustomersMap.set(customer.session_id, [
              ...existing,
              customer,
            ]);
          });
        }
      }

      // Fetch waiter assignments for waiting tables (no active session but customer_waiting_since)
      const waitingTableIds = tableList
        .filter((t) => !sessions?.find((s) => s.table_id === t.id) && t.customer_waiting_since)
        .map((t) => t.id);

      const waiterAssignments: Map<string, string> = new Map();
      if (waitingTableIds.length > 0) {
        const { data: assignments } = await supabase
          .from("waiter_tables")
          .select("table_id, staff:staff!inner(name)")
          .in("table_id", waitingTableIds);

        if (assignments) {
          for (const a of assignments) {
            const staffName = (a.staff as any)?.name;
            if (staffName) {
              waiterAssignments.set(a.table_id, staffName);
            }
          }
        }
      }

      const tablesWithSessions = tableList.map((table) => {
        const session = sessions?.find((s) => s.table_id === table.id);
        return {
          ...table,
          activeSession: session
            ? {
                ...session,
                customers: sessionCustomersMap.get(session.id) || [],
              }
            : null,
          assignedWaiterName: waiterAssignments.get(table.id) || null,
        };
      });

      setTables(tablesWithSessions);

      // Fetch all orders from active sessions (not delivered/cancelled)
      if (sessionIds.length > 0) {
        const { data: ordersData } = await supabase
          .from("orders")
          .select(
            `
            *,
            product:products(*)
          `,
          )
          .in("session_id", sessionIds)
          .in("status", ["pending", "preparing", "ready"])
          .order("created_at", { ascending: true });

        if (ordersData) {
          const ordersWithTableInfo = ordersData.map((order) => {
            const session = sessions?.find((s) => s.id === order.session_id);
            const table = tableList.find((t) => t.id === session?.table_id);
            // Find customer name if session_customer_id exists
            // Cast to access session_customer_id which exists in the database but might not be in generated types
            const orderWithCustomerId = order as typeof order & {
              session_customer_id: string | null;
            };
            const customers = sessionCustomersMap.get(order.session_id) || [];
            const customer = orderWithCustomerId.session_customer_id
              ? customers.find(
                  (c) => c.id === orderWithCustomerId.session_customer_id,
                )
              : null;
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

      // Fetch unassigned tables (for waiters only - tables without assignment in their location)
      if (user.role === "waiter" && user.location) {
        const { data: allTablesData } = await supabase
          .from("tables")
          .select("*")
          .eq("location", user.location)
          .eq("is_active", true)
          .order("number");

        if (allTablesData) {
          // Fetch ALL table assignments (from any waiter) in this location
          const { data: allAssignments } = await supabase
            .from("waiter_tables")
            .select("table_id, table:tables!inner(location)")
            .eq("table.location", user.location);

          // Create set of ALL assigned table IDs (not just current waiter's)
          const allAssignedTableIds = new Set(
            (allAssignments || []).map((a) => a.table_id),
          );

          // Filter out tables that are already assigned to ANY waiter
          const unassigned = allTablesData.filter(
            (t) => !allAssignedTableIds.has(t.id),
          );
          setUnassignedTables(unassigned);
        }
      }

      // Fetch upcoming reservations needing table assignment
      if (user.location) {
        try {
          const { data: settingsData } = await supabase
            .from("reservation_settings")
            .select("waiter_alert_minutes")
            .eq("id", 1)
            .maybeSingle();
          const alertMinutes = (settingsData as Record<string, number> | null)?.waiter_alert_minutes || 60;

          const today = new Date().toISOString().split("T")[0];
          const { data: reservationsData } = await supabase
            .from("reservations")
            .select("*")
            .eq("reservation_date", today)
            .eq("location", user.location)
            .eq("status", "confirmed")
            .eq("tables_assigned", false)
            .order("reservation_time");

          const now = new Date();
          const filtered = (reservationsData || []).filter((r) => {
            const [h, m] = r.reservation_time.split(":").map(Number);
            const resTime = new Date(now);
            resTime.setHours(h, m, 0, 0);
            const diffMin = (resTime.getTime() - now.getTime()) / 60000;
            return diffMin > -30 && diffMin <= alertMinutes;
          });
          setUpcomingReservations(filtered);

          // Fetch all location tables for table assignment modal
          if (filtered.length > 0) {
            const { data: allTablesData } = await supabase
              .from("tables")
              .select("*")
              .eq("location", user.location)
              .eq("is_active", true)
              .order("number");
            setAllLocationTables(allTablesData || []);
          }
        } catch (err) {
          console.error("Error fetching reservations:", err);
        }
      }

      // Fetch pending waiter calls for these tables
      const { data: callsData } = await supabase
        .from("waiter_calls")
        .select("*")
        .in("table_id", tableIds)
        .in("status", ["pending", "acknowledged"])
        .order("created_at", { ascending: false });

      if (callsData) {
        const callsWithDetails = callsData.map((call) => {
          // Look up customer name from session customers
          let customerName: string | null = null;
          if (call.session_customer_id && call.session_id) {
            const customers = sessionCustomersMap.get(call.session_id) || [];
            const customer = customers.find(
              (c) => c.id === call.session_customer_id,
            );
            customerName = customer?.display_name || null;
          }
          return {
            ...call,
            table_number:
              tableList.find((t) => t.id === call.table_id)?.number || 0,
            customer_name: customerName,
          };
        });
        setWaiterCalls(callsWithDetails);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Keep fetchDataRef updated
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time subscription (separate from fetchData to avoid re-subscriptions)
  useEffect(() => {
    const subscription = supabase
      .channel("waiter-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchDataRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchDataRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls" },
        () => fetchDataRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => fetchDataRef.current(),
      )
      .subscribe();

    // Polling fallback for waiter calls (in case Realtime is not enabled for the table)
    const pollInterval = setInterval(() => {
      fetchDataRef.current();
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [supabase]);

  const handleAcknowledgeCall = useCallback(
    async (callId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("waiter_calls")
        .update({
          status: "acknowledged",
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", callId);
      if (!error) {
        setWaiterCalls(prev => prev.map(c => c.id === callId ? { ...c, status: "acknowledged" } : c));
      }
    },
    [user, supabase],
  );

  const handleCompleteCall = useCallback(
    async (callId: string, orderId?: string | null) => {
      try {
        // Mark the waiter_call as completed
        const { error: callError } = await supabase
          .from("waiter_calls")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", callId);

        if (callError) {
          // eslint-disable-next-line no-console
          console.error("Error completing waiter call:", callError);
          return;
        }

        // Remove from local state immediately
        setWaiterCalls(prev => prev.filter(c => c.id !== callId));

        // If there's an associated order, mark it as delivered
        if (orderId) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({ status: "delivered" })
            .eq("id", orderId);

          if (orderError) {
            // eslint-disable-next-line no-console
            console.error("Error marking order as delivered:", orderError);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error in handleCompleteCall:", error);
      }
    },
    [supabase],
  );

  const handleMarkDelivered = useCallback(
    async (orderId: string) => {
      await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", orderId);
    },
    [supabase],
  );

  const handleCommandTable = useCallback(
    async (tableId: string, event: React.MouseEvent) => {
      event.preventDefault(); // Prevent navigation
      event.stopPropagation();

      if (!user) return;

      setAssigningTableId(tableId);

      try {
        const response = await fetch(`/api/tables/${tableId}/assign-waiter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Include authentication cookies
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.code === "LOCATION_MISMATCH") {
            alert(`⚠️ ${result.error}`);
          } else if (result.code === "ALREADY_ASSIGNED") {
            alert(`⚠️ Mesa já atribuída a ${result.assignedTo}`);
          } else {
            alert(
              `Erro: ${result.error || "Não foi possível comandar a mesa"}`,
            );
          }
          return;
        }

        // Success - refresh data to update UI
        await fetchDataRef.current();

        // Show success message briefly
        alert(`✅ ${result.message || "Mesa comandada com sucesso!"}`);
      } catch (error) {
        console.error("Error assigning table:", error);
        alert("Erro ao comandar mesa");
      } finally {
        setAssigningTableId(null);
      }
    },
    [user],
  );

  const handleOpenWaitingTable = useCallback(
    async (tableId: string, tableNumber: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setOpeningTableId(tableId);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            tableId,
            isRodizio: false,
            numPeople: 1,
            orderingMode: "client",
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          alert(`Erro: ${result.error || "Não foi possível abrir a mesa"}`);
          return;
        }

        await fetchDataRef.current();
        alert(`✅ Mesa #${tableNumber} aberta`);
      } catch (error) {
        console.error("Error opening waiting table:", error);
        alert("Erro ao abrir mesa");
      } finally {
        setOpeningTableId(null);
      }
    },
    [],
  );

  const handleDismissWaiting = useCallback(
    async (tableId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setDismissingTableId(tableId);
      try {
        await fetch(`/api/tables/${tableId}/request-open`, {
          method: "DELETE",
          credentials: "include",
        });

        await fetchDataRef.current();
      } catch (error) {
        console.error("Error dismissing waiting request:", error);
        alert("Erro ao dispensar pedido");
      } finally {
        setDismissingTableId(null);
      }
    },
    [],
  );

  const handleOpenTableAssign = useCallback((reservation: Record<string, unknown>) => {
    setSelectedReservation(reservation);
    setPrimaryTableId(null);
    setAdditionalTableIds([]);
    setShowTableAssignModal(true);
  }, []);

  const handleTableClick = useCallback((tableId: string) => {
    if (!primaryTableId) {
      // First click → set as primary
      setPrimaryTableId(tableId);
    } else if (tableId === primaryTableId) {
      // Click primary again → deselect
      setPrimaryTableId(null);
    } else if (additionalTableIds.includes(tableId)) {
      // Click additional → toggle off
      setAdditionalTableIds((prev) => prev.filter((id) => id !== tableId));
    } else {
      // Click another → add as additional
      setAdditionalTableIds((prev) => [...prev, tableId]);
    }
  }, [primaryTableId, additionalTableIds]);

  const handleAssignTables = useCallback(async () => {
    if (!selectedReservation || !primaryTableId || !user) return;
    setAssigningReservation(true);

    try {
      const allTableIds = [primaryTableId, ...additionalTableIds];

      // 1. Insert into reservation_tables
      const rows = allTableIds.map((tableId) => ({
        reservation_id: selectedReservation.id,
        table_id: tableId,
        is_primary: tableId === primaryTableId,
        assigned_by: user.id,
      }));
      const { error: insertError } = await (supabase as any)
        .from("reservation_tables")
        .insert(rows);
      if (insertError) throw insertError;

      // 2. Update all selected tables status → 'reserved'
      const { error: tableError } = await (supabase as any)
        .from("tables")
        .update({ status: "reserved" })
        .in("id", allTableIds);
      if (tableError) throw tableError;

      // 3. Update reservation: tables_assigned = true, table_id = primary table number
      const primaryTable = allLocationTables.find((t) => t.id === primaryTableId);
      const { error: resError } = await (supabase as any)
        .from("reservations")
        .update({
          tables_assigned: true,
          table_id: primaryTable?.number || null,
        })
        .eq("id", selectedReservation.id);
      if (resError) throw resError;

      // 4. Close modal, refresh
      setShowTableAssignModal(false);
      setSelectedReservation(null);
      setPrimaryTableId(null);
      setAdditionalTableIds([]);
      await fetchDataRef.current();

      alert(`Mesa(s) atribuída(s) com sucesso!`);
    } catch (err) {
      console.error("Error assigning tables:", err);
      alert("Erro ao atribuir mesas. Tente novamente.");
    } finally {
      setAssigningReservation(false);
    }
  }, [selectedReservation, primaryTableId, additionalTableIds, user, supabase, allLocationTables]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeTables = tables.filter((t) => t.activeSession);
  const waitingTables = tables.filter((t) => !t.activeSession && t.customer_waiting_since);
  const availableTables = tables.filter((t) => !t.activeSession && !t.customer_waiting_since);

  // Filter customer calls (excluding kitchen notifications)
  const customerCalls = waiterCalls.filter(
    (c) => c.call_type !== "other" || !c.message?.startsWith("Mesa"),
  );
  const pendingCustomerCalls = customerCalls.filter(
    (c) => c.status === "pending",
  );

  // Group orders by status
  const readyOrders = orders.filter((o) => o.status === "ready");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const _statusConfig = {
    pending: {
      label: "Pendente",
      color: "text-orange-400",
      bg: "bg-orange-500/20",
      border: "border-orange-500/30",
    },
    preparing: {
      label: "A Preparar",
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      border: "border-blue-500/30",
    },
    ready: {
      label: "Pronto para servir",
      color: "text-green-400",
      bg: "bg-green-500/20",
      border: "border-green-500/30",
    },
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🍣</span>
            <div>
              <h1 className="text-lg font-bold text-white">Painel da Garçom</h1>
              <p className="text-sm text-gray-400">
                {user?.name} • {getLocationLabel(user?.location || null)}
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
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-gray-800">
                <span className="text-gray-400 text-sm">Mesas ativas:</span>
                <span className="text-[#D4AF37] font-bold">
                  {activeTables.length}
                </span>
                <span className="text-gray-500">/</span>
                <span className="text-white">{tables.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-gray-800">
                <span className="text-gray-400 text-sm">Pessoas:</span>
                <span className="text-white font-bold">
                  {activeTables.reduce(
                    (sum, t) => sum + (t.activeSession?.num_people || 0),
                    0,
                  )}
                </span>
              </div>
            </div>

            {/* Prontos para Servir — prominent notification */}
            {readyOrders.length > 0 && (
              <section className="mb-6">
                <div className="bg-green-500/10 rounded-xl border-2 border-green-500/50 p-4">
                  <h2 className="text-base font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    Prontos para Servir ({readyOrders.length})
                  </h2>
                  <div className="grid gap-2">
                    {readyOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-green-500/10 rounded-lg p-3 border border-green-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/waiter/mesa/${order.table_id}`}
                              className="text-xl font-bold text-green-400 hover:underline"
                            >
                              #{order.table_number}
                            </Link>
                            <div>
                              <p className="font-semibold text-white">
                                {order.quantity}x {order.product.name}
                              </p>
                              {order.customer_name && (
                                <p className="text-sm text-green-300">
                                  <span className="text-gray-500">para</span>{" "}
                                  {order.customer_name}
                                </p>
                              )}
                              {order.notes && (
                                <p className="text-sm text-gray-400">
                                  Nota: {order.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkDelivered(order.id)}
                            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm"
                          >
                            Entregar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Reservation Alerts */}
            {upcomingReservations.length > 0 && (
              <section className="mb-6">
                <div className="bg-purple-500/10 rounded-xl border-2 border-purple-500/50 p-4">
                  <h2 className="text-base font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                    Reservas Proximas ({upcomingReservations.length})
                  </h2>
                  <div className="grid gap-2">
                    {upcomingReservations.map((res) => {
                      const [h, m] = (res.reservation_time || "00:00").split(":").map(Number);
                      const resTime = new Date();
                      resTime.setHours(h, m, 0, 0);
                      const diffMin = Math.round((resTime.getTime() - Date.now()) / 60000);
                      const timeLabel = diffMin > 0 ? `em ${diffMin}min` : diffMin === 0 ? "agora" : `${Math.abs(diffMin)}min atrasada`;

                      return (
                        <div
                          key={res.id}
                          className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white">
                                  {res.first_name} {res.last_name}
                                </span>
                                <span className="text-sm text-purple-300">
                                  {res.party_size} pessoas
                                </span>
                                <span className="text-sm text-gray-400">
                                  {res.reservation_time}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  diffMin > 0 ? "bg-purple-500/20 text-purple-300" : "bg-red-500/20 text-red-400"
                                }`}>
                                  {timeLabel}
                                </span>
                                {res.is_rodizio ? (
                                  <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                                    Rodizio
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                                    A Carta
                                  </span>
                                )}
                              </div>
                              {res.special_requests && (
                                <p className="text-sm text-gray-400 mt-1 truncate">
                                  Nota: {res.special_requests}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleOpenTableAssign(res)}
                              className="px-4 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors text-sm ml-3 flex-shrink-0"
                            >
                              Atribuir Mesa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Customer Calls Alert */}
            {customerCalls.length > 0 && (
              <div className="mb-6 space-y-2">
                <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${pendingCustomerCalls.length > 0 ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`}
                  />
                  Chamadas de Clientes ({customerCalls.length})
                </h2>
                {customerCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`rounded-lg p-3 border ${
                      call.status === "pending"
                        ? "bg-red-500/20 border-red-500/50"
                        : "bg-yellow-500/20 border-yellow-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg flex-shrink-0">
                          {call.call_type === "bill" && "💳"}
                          {call.call_type === "assistance" && "🔔"}
                          {call.call_type === "order" && "📝"}
                          {call.call_type === "other" && "❓"}
                        </span>
                        {call.call_type === "other" && call.message ? (
                          <span
                            className={`font-semibold ${
                              call.status === "pending"
                                ? "text-red-400"
                                : "text-yellow-400"
                            }`}
                          >
                            {call.message}
                          </span>
                        ) : (
                          <>
                            <Link
                              href={`/waiter/mesa/${call.table_id}`}
                              className={`font-semibold hover:underline ${
                                call.status === "pending"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              Mesa #{call.table_number}
                            </Link>
                            <span className="text-gray-400 text-sm">
                              {call.call_type === "bill" && "pede a conta"}
                              {call.call_type === "assistance" &&
                                "precisa de ajuda"}
                              {call.call_type === "order" &&
                                "quer fazer pedido"}
                            </span>
                            {call.customer_name && (
                              <span className="text-[#D4AF37] text-sm font-medium">
                                ({call.customer_name})
                              </span>
                            )}
                          </>
                        )}
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

            {/* Tabs: Mesas Ativas / Mesas Disponíveis */}
            <div className="flex gap-1 mb-4 bg-[#1a1a1a] rounded-lg p-1 border border-gray-800">
              <button
                onClick={() => setDashboardTab("ativas")}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  dashboardTab === "ativas"
                    ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Mesas Ativas ({activeTables.length + waitingTables.length})
              </button>
              <button
                onClick={() => setDashboardTab("disponiveis")}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  dashboardTab === "disponiveis"
                    ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Disponíveis ({availableTables.length + unassignedTables.length})
              </button>
            </div>

            {/* Tab Content */}
            {dashboardTab === "ativas" ? (
              <section className="mb-8">
                {activeTables.length === 0 && waitingTables.length === 0 ? (
                  <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800">
                    <div className="text-4xl mb-3">🍽️</div>
                    <p className="text-gray-400">Nenhuma mesa ativa de momento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                  {/* Waiting Tables — orange, with Abrir Mesa button */}
                  {waitingTables.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {waitingTables.map((table) => {
                        const waitingSince = table.customer_waiting_since
                          ? new Date(table.customer_waiting_since)
                          : null;
                        const waitingMinutes = waitingSince
                          ? Math.floor((Date.now() - waitingSince.getTime()) / 60000)
                          : 0;

                        return (
                          <div
                            key={table.id}
                            className="rounded-xl p-4 bg-orange-500/10 border-2 border-orange-500/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-2xl font-bold text-orange-400">
                                #{table.number}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full animate-pulse">
                                Cliente a esperar
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mb-2 truncate">
                              {table.name}
                            </p>
                            <p className="text-xs text-gray-500 mb-1">
                              A esperar há {waitingMinutes}min
                            </p>
                            {table.assignedWaiterName && (
                              <p className="text-xs text-orange-300 mb-2">
                                👤 {table.assignedWaiterName}
                              </p>
                            )}
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={(e) => handleOpenWaitingTable(table.id, table.number, e)}
                                disabled={openingTableId === table.id}
                                className="w-full px-3 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {openingTableId === table.id ? "A abrir..." : "Abrir Mesa"}
                              </button>
                              <button
                                onClick={(e) => handleDismissWaiting(table.id, e)}
                                disabled={dismissingTableId === table.id}
                                className="w-full px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
                              >
                                {dismissingTableId === table.id ? "A dispensar..." : "Dispensar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Tables */}
                  {activeTables.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {activeTables.map((table) => {
                      const sessionStarted = table.activeSession?.started_at
                        ? new Date(table.activeSession.started_at)
                        : null;
                      const minutesElapsed = sessionStarted
                        ? Math.floor(
                            (Date.now() - sessionStarted.getTime()) / 60000,
                          )
                        : 0;

                      return (
                        <Link
                          key={table.id}
                          href={`/waiter/mesa/${table.id}`}
                          className="rounded-xl p-4 transition-all hover:scale-[1.02] bg-[#D4AF37]/10 border-2 border-[#D4AF37]/50 hover:border-[#D4AF37]"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-2xl font-bold text-[#D4AF37]">
                              #{table.number}
                            </span>
                            {table.activeSession?.status === "pending_payment" ? (
                              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full animate-pulse">
                                Conta
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs bg-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                                Ativa
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-400 mb-2 truncate">
                            {table.name}
                          </p>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 text-gray-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                <span className="text-sm text-white">
                                  {table.activeSession?.num_people}p
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {minutesElapsed}min
                              </span>
                            </div>

                            {/* Customer Names */}
                            {table.activeSession?.customers &&
                              table.activeSession.customers.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {table.activeSession.customers
                                    .slice(0, 3)
                                    .map((customer) => (
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

                            <div className="flex gap-1">
                              {table.activeSession?.is_rodizio ? (
                                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                                  Rodízio
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                                  À Carta
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  )}
                  </div>
                )}
              </section>
            ) : (
              <section className="mb-8">
                {availableTables.length === 0 && unassignedTables.length === 0 ? (
                  <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800">
                    <div className="text-4xl mb-3">✨</div>
                    <p className="text-gray-400">Todas as mesas estão ocupadas</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* My free tables */}
                    {availableTables.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Minhas Mesas Livres</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {availableTables.map((table) => (
                            <Link
                              key={table.id}
                              href={`/waiter/mesa/${table.id}`}
                              className="rounded-xl p-4 transition-all hover:scale-[1.02] bg-[#1a1a1a] border border-gray-800 hover:border-green-500/50"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-2xl font-bold text-white">
                                  #{table.number}
                                </span>
                                <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                                  Livre
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mb-2 truncate">
                                {table.name}
                              </p>
                              <div className="text-center py-1">
                                <span className="text-sm text-gray-500">
                                  Toque para iniciar
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unassigned tables (waiter only) */}
                    {user?.role === "waiter" && unassignedTables.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Mesas Sem Garçom Atribuído</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {unassignedTables.map((table) => (
                            <div
                              key={table.id}
                              className="rounded-xl p-4 bg-gray-800/50 border border-gray-700 hover:border-blue-500/50 transition-all"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-2xl font-bold text-gray-300">
                                  #{table.number}
                                </span>
                                <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded-full">
                                  Disponível
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mb-3 truncate">
                                {table.name}
                              </p>
                              <button
                                onClick={(e) => handleCommandTable(table.id, e)}
                                disabled={assigningTableId === table.id}
                                className="w-full px-3 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {assigningTableId === table.id ? (
                                  <span className="animate-spin">⏳</span>
                                ) : (
                                  <span>👋</span>
                                )}
                                {assigningTableId === table.id ? "Comandando..." : "Comandar"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Kitchen Orders — bottom of page, less prominent */}
            {(preparingOrders.length > 0 || pendingOrders.length > 0) && (
              <div className="border-t border-gray-800 pt-6 space-y-4">
                {preparingOrders.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      Na Cozinha ({preparingOrders.length})
                    </h2>
                    <div className="grid gap-2">
                      {preparingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-[#1a1a1a] rounded-lg p-3 border border-blue-500/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/waiter/mesa/${order.table_id}`}
                                className="text-base font-bold text-blue-400 hover:underline"
                              >
                                #{order.table_number}
                              </Link>
                              <p className="text-sm text-white">
                                {order.quantity}x {order.product.name}
                                {order.customer_name && (
                                  <span className="text-xs text-gray-400 ml-2">
                                    ({order.customer_name})
                                  </span>
                                )}
                              </p>
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

                {pendingOrders.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      Aguardam Cozinha ({pendingOrders.length})
                    </h2>
                    <div className="grid gap-2">
                      {pendingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-[#1a1a1a] rounded-lg p-3 border border-orange-500/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/waiter/mesa/${order.table_id}`}
                                className="text-base font-bold text-orange-400 hover:underline"
                              >
                                #{order.table_number}
                              </Link>
                              <p className="text-sm text-white">
                                {order.quantity}x {order.product.name}
                                {order.customer_name && (
                                  <span className="text-xs text-gray-400 ml-2">
                                    ({order.customer_name})
                                  </span>
                                )}
                              </p>
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
              </div>
            )}
          </>
        )}
      </main>

      {/* Table Assignment Modal */}
      {showTableAssignModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  Atribuir Mesa — {selectedReservation.first_name} {selectedReservation.last_name}
                </h2>
                <button
                  onClick={() => setShowTableAssignModal(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-purple-300">
                  {selectedReservation.party_size} pessoas
                </span>
                <span className="text-sm text-gray-400">
                  {selectedReservation.reservation_time}
                </span>
                {selectedReservation.is_rodizio ? (
                  <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                    Rodizio
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                    A Carta
                  </span>
                )}
              </div>
              {selectedReservation.special_requests && (
                <p className="text-sm text-gray-400 mt-2">
                  Nota: {selectedReservation.special_requests}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="px-4 pt-4">
              <p className="text-sm text-gray-400">
                1. Clique na mesa <strong className="text-[#D4AF37]">principal</strong> (dourado).
                Depois clique em mesas adicionais para <strong className="text-blue-400">reservar</strong> (azul).
              </p>
            </div>

            {/* Table Grid */}
            <div className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {allLocationTables.map((table) => {
                  const isPrimary = primaryTableId === table.id;
                  const isAdditional = additionalTableIds.includes(table.id);
                  const isOccupied = table.status === "occupied" || table.status === "reserved";
                  const isInactive = table.status === "inactive";
                  const isDisabled = isOccupied || isInactive;

                  let borderColor = "border-gray-700";
                  let bgColor = "bg-[#0D0D0D]";
                  let textColor = "text-white";
                  let badge = null;

                  if (isPrimary) {
                    borderColor = "border-[#D4AF37] border-2";
                    bgColor = "bg-[#D4AF37]/10";
                    textColor = "text-[#D4AF37]";
                    badge = <span className="text-[10px] bg-[#D4AF37]/30 text-[#D4AF37] px-1.5 py-0.5 rounded-full">Principal</span>;
                  } else if (isAdditional) {
                    borderColor = "border-blue-500 border-2";
                    bgColor = "bg-blue-500/10";
                    textColor = "text-blue-400";
                    badge = <span className="text-[10px] bg-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded-full">Reservada</span>;
                  } else if (isDisabled) {
                    bgColor = "bg-gray-800/50";
                    textColor = "text-gray-600";
                    borderColor = "border-gray-800";
                  }

                  return (
                    <button
                      key={table.id}
                      disabled={isDisabled}
                      onClick={() => handleTableClick(table.id)}
                      className={`rounded-xl p-3 border transition-all ${borderColor} ${bgColor} ${
                        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-105"
                      }`}
                    >
                      <div className="text-center">
                        <span className={`text-xl font-bold ${textColor}`}>
                          #{table.number}
                        </span>
                        {badge && <div className="mt-1">{badge}</div>}
                        {isOccupied && (
                          <div className="mt-1">
                            <span className="text-[10px] text-gray-500">
                              {table.status === "reserved" ? "Reservada" : "Ocupada"}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={() => setShowTableAssignModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignTables}
                disabled={!primaryTableId || assigningReservation}
                className="px-6 py-2 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningReservation
                  ? "A atribuir..."
                  : `Confirmar (${1 + additionalTableIds.length} mesa${additionalTableIds.length > 0 ? "s" : ""})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
