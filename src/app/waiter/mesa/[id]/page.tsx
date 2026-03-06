"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useRequireWaiter } from "@/presentation/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useActivityLog, useProductsOptimized, useKitchenPrint } from "@/presentation/hooks";
import { useSessionOrderingMode } from "@/presentation/hooks/useSessionOrderingMode";
import { useCart } from "@/presentation/hooks/useCart";
import { useOrderReview } from "@/presentation/hooks/useOrderReview";
import { CartService } from "@/domain/services/CartService";
import { ORDERING_MODE_LABELS, ORDERING_MODE_ICONS, type OrderingMode } from "@/domain/value-objects/OrderingMode";
import { ConfirmDialog } from "@/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/presentation/components/ui/Toast";
import type { Table, Session, OrderWithProduct, WaiterCall } from "@/types/database";

type WaiterTab = "dashboard" | "menu" | "definicoes" | "chamadas";

interface TableWithDetails extends Table {
  activeSession?: Session | null;
  orders?: OrderWithProduct[];
}

export default function WaiterMesaPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, isLoading: authLoading } = useRequireWaiter();
  const router = useRouter();
  const { logActivity } = useActivityLog();
  const { showToast } = useToast();
  const { printSession, isPrinting } = useKitchenPrint();
  const [table, setTable] = useState<TableWithDetails | null>(null);
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WaiterTab>("dashboard");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);

  // State for modals
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [showOrderingModeModal, setShowOrderingModeModal] = useState(false);
  const [revertOrderId, setRevertOrderId] = useState<string | null>(null);
  const [sessionForm, setSessionForm] = useState({
    isRodizio: false,
    numPeople: 2,
  });

  // Close session confirm
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  // Billing modal state
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingStep, setBillingStep] = useState<1 | 2 | 3>(1);
  const [billingWantsNif, setBillingWantsNif] = useState(false);
  const [billingNif, setBillingNif] = useState("");
  const [billingPaymentMethodId, setBillingPaymentMethodId] = useState<number | null>(null);
  const [billingPaymentMethods, setBillingPaymentMethods] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [isBillingSubmitting, setIsBillingSubmitting] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Use memoized supabase client to prevent real-time subscription issues
  const supabase = useMemo(() => createClient(), []);

  // Hook for ordering mode
  const { orderingMode, updateMode } = useSessionOrderingMode(
    table?.activeSession?.id || null,
    table?.activeSession?.ordering_mode as OrderingMode
  );

  // Products & categories via React Query (domain entities, cached)
  const { products, categories, isLoading: loadingProducts } = useProductsOptimized({ availableOnly: true, serviceModes: ["dine_in", "takeaway"] });

  // Derived ordering type (rodizio vs à la carte) - consistent with mesa page
  const isSessionRodizio = table?.activeSession?.is_rodizio === true;

  // Cart hook
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateNotes,
    getCartQuantity,
    clearCart,
    cartTotal,
    cartItemsCount,
    editingNotes,
    setEditingNotes,
  } = useCart({
    orderType: table?.activeSession?.is_rodizio ? "rodizio" : "carta",
    isLunch: new Date().getHours() >= 11 && new Date().getHours() < 16,
    numPessoas: table?.activeSession?.num_people || 1,
  });

  // Order review hook (duplicate detection)
  const {
    showReviewModal,
    openReview,
    closeReview,
    duplicateMap,
    duplicateItems,
    hasUnconfirmedDuplicates,
    confirmedDuplicates,
    confirmDuplicate,
  } = useOrderReview({
    cart,
    sessionOrders: orders.map(o => ({
      product_id: o.product_id,
      quantity: o.quantity,
      status: o.status,
    })),
  });

  // Ref for fetchData to avoid useEffect dependency issues
  const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Fetch table details first
    const { data: tableData } = await supabase
      .from("tables")
      .select("*")
      .eq("id", id)
      .single();

    if (!tableData) {
      router.push("/waiter");
      return;
    }

    // Verify access to this table
    if (user.role === "waiter") {
      // Check if waiter has this table assigned
      const { data: assignment } = await supabase
        .from("waiter_tables")
        .select("id")
        .eq("staff_id", user.id)
        .eq("table_id", id)
        .single();

      if (!assignment) {
        router.push("/waiter");
        return;
      }

      // Check if table is from waiter's location
      if (user.location && tableData.location !== user.location) {
        // Waiter location mismatch — redirect
        router.push("/waiter");
        return;
      }
    }

    // Fetch active session (active or pending_payment)
    // Use limit(1) instead of maybeSingle() to avoid error when multiple sessions exist
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("*")
      .eq("table_id", id)
      .in("status", ["active", "pending_payment"])
      .order("started_at", { ascending: false })
      .limit(1);

    const sessionData = sessionRows?.[0] || null;

    setTable({
      ...tableData,
      activeSession: sessionData,
    });

    // Fetch orders if there's an active session
    if (sessionData) {
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          *,
          product:products(*)
        `)
        .eq("session_id", sessionData.id)
        .order("created_at", { ascending: false });

      setOrders((ordersData || []) as unknown as OrderWithProduct[]);
    } else {
      setOrders([]);
    }

    // Fetch pending waiter calls for this table
    const { data: callsData } = await supabase
      .from("waiter_calls")
      .select("*")
      .eq("table_id", id)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false });

    setWaiterCalls(callsData || []);
    setIsLoading(false);
  }, [user, id, router, supabase]);

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
      .channel(`waiter-orders-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchDataRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchDataRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls", filter: `table_id=eq.${id}` },
        () => fetchDataRef.current()
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
  }, [supabase, id]);

  const handleSubmitCart = useCallback(async () => {
    if (isSubmittingOrder) return;
    if (!table?.activeSession) {
      showToast("error", "Nenhuma sessão ativa. Inicie uma sessão primeiro.");
      return;
    }
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const validation = CartService.validateCart(cart);
      if (!validation.isValid) {
        showToast("error", validation.error!);
        return;
      }

      // Build order inserts manually (matching DB columns exactly)
      const orderInserts = cart.map((item) => ({
        session_id: table.activeSession!.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.product.price,
        notes: item.notes || null,
        status: "pending" as const,
      }));

      const { error: ordersError } = await supabase
        .from("orders")
        .insert(orderInserts);

      if (ordersError) throw ordersError;

      const itemCount = cartItemsCount;
      clearCart();
      setActiveTab("dashboard");

      // Refresh orders immediately (don't wait for real-time)
      await fetchData();

      showToast("success", `${itemCount} item(s) adicionado(s) com sucesso`);

      await logActivity("orders_added", "order", table.activeSession!.id, {
        tableNumber: table.number,
        location: table.location,
        itemCount,
        total: cartTotal,
      });
    } catch (err) {
      console.error("[WaiterMesa] Erro ao submeter pedidos:", err);
      showToast("error", "Erro ao submeter pedidos");
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [isSubmittingOrder, table, cart, cartTotal, cartItemsCount, clearCart, supabase, logActivity, showToast, fetchData]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status: status as "pending" | "preparing" | "ready" | "delivered" | "cancelled" }).eq("id", orderId);

    // Log activity when marking order as delivered
    if (status === "delivered") {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        await logActivity("order_delivered", "order", orderId, {
          tableNumber: table?.number,
          location: table?.location,
          productName: order.product?.name,
          quantity: order.quantity,
          sessionId: table?.activeSession?.id,
        });
      }
    }
  }, [supabase, orders, table, logActivity]);

  const openBillingModal = useCallback(async () => {
    if (!table?.activeSession) return;

    // Pre-fill NIF from session if customer already entered it
    const sessionNif = (table.activeSession as Record<string, unknown>).customer_nif as string | null;
    if (sessionNif) {
      setBillingWantsNif(true);
      setBillingNif(sessionNif);
    } else {
      setBillingWantsNif(false);
      setBillingNif("");
    }
    setBillingPaymentMethodId(null);
    setBillingStep(1);
    setBillingError(null);

    // Fetch payment methods
    const { data: methods } = await supabase
      .from("payment_methods")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order");

    if (methods) {
      setBillingPaymentMethods(methods);
    }

    setShowBillingModal(true);
  }, [table, supabase]);

  const handleBillingSubmit = useCallback(async () => {
    if (!table?.activeSession || !user || !billingPaymentMethodId) return;

    setIsBillingSubmitting(true);
    setBillingError(null);

    const sessionId = table.activeSession.id;
    const total = table.activeSession.total_amount || 0;
    const nif = billingWantsNif ? billingNif.trim() : undefined;

    // Validate NIF if provided
    if (nif && !/^\d{9}$/.test(nif)) {
      setBillingError("NIF inválido. Deve ter 9 dígitos.");
      setIsBillingSubmitting(false);
      return;
    }

    try {
      // Try to create invoice via Vendus
      let invoiceCreated = false;
      let documentNumber: string | undefined;

      try {
        const invoiceRes = await fetch("/api/vendus/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            locationSlug: table.location || "",
            paymentMethodId: billingPaymentMethodId,
            paidAmount: total,
            customerNif: nif,
          }),
        });

        const invoiceData = await invoiceRes.json();

        if (invoiceRes.ok && invoiceData.success) {
          invoiceCreated = true;
          documentNumber = invoiceData.documentNumber;
        } else {
          // eslint-disable-next-line no-console
          console.warn("[Billing] Vendus invoice failed:", invoiceData.error);
        }
      } catch (vendusErr) {
        // eslint-disable-next-line no-console
        console.warn("[Billing] Vendus not available:", vendusErr);
      }

      // Close the session via server-side API (bypasses RLS)
      const hasOpenKitchenOrders = orders.some((o) =>
        ["pending", "preparing", "ready"].includes(o.status)
      );
      const closeRes = await fetch(`/api/sessions/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelOrders: hasOpenKitchenOrders, totalSpent: total }),
      });

      if (!closeRes.ok) {
        const closeData = await closeRes.json();
        throw new Error(closeData.error || "Erro ao encerrar sessão");
      }

      // Log activity
      await logActivity("session_closed", "session", sessionId, {
        tableNumber: table.number,
        location: table.location,
        total,
        invoiceCreated,
        documentNumber,
        paymentMethodId: billingPaymentMethodId,
        customerNif: nif,
      });

      setShowBillingModal(false);

      if (invoiceCreated) {
        showToast("success", `Sessão encerrada. Fatura ${documentNumber} criada.`);
      } else {
        showToast("warning", "Sessão encerrada. Fatura Vendus não criada (não configurado).");
      }

      // Navigate back to waiter panel
      router.push("/waiter");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Billing] Error:", err);
      setBillingError("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsBillingSubmitting(false);
    }
  }, [table, user, billingPaymentMethodId, billingWantsNif, billingNif, logActivity, showToast, router, orders]);

  // Close session directly without billing (via server-side API to bypass RLS)
  const handleCloseSessionDirect = useCallback(async () => {
    if (!table?.activeSession || !user) return;

    const sessionId = table.activeSession.id;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeReason: closeReason.trim() || undefined,
          cancelOrders: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao encerrar sessão");
      }

      await logActivity("session_closed", "session", sessionId, {
        tableNumber: table.number,
        location: table.location,
        total: 0,
        noOrders: orders.length === 0,
        cancelledOrders: data.cancelledOrders || 0,
        ...(closeReason.trim() ? { closeReason: closeReason.trim() } : {}),
      });

      showToast("success", "Mesa encerrada.");
      router.push("/waiter");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[CloseSession] Error:", err);
      showToast("error", "Erro ao encerrar a mesa.");
    }
  }, [table, user, logActivity, showToast, router, orders, closeReason]);

  const handleAcknowledgeCall = useCallback(async (callId: string) => {
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
  }, [user, supabase]);

  const handleCompleteCall = useCallback(async (callId: string) => {
    const { error } = await supabase
      .from("waiter_calls")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", callId);
    if (!error) {
      setWaiterCalls(prev => prev.filter(c => c.id !== callId));
    }
  }, [supabase]);

  const handleStartSession = useCallback(async () => {
    if (!table || !user) return;

    try {
      // Usar API route com admin client para contornar RLS
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: table.id,
          isRodizio: sessionForm.isRodizio,
          numPeople: sessionForm.numPeople,
          orderingMode: "client",
        }),
      });

      const data = await response.json();

      if (response.ok && (data.session || data.recovered)) {
        const session = data.session;
        const sessionId = session?.id || "";

        // Set active session directly from API response (don't wait for fetchData)
        if (session) {
          setTable(prev => prev ? { ...prev, activeSession: session } : prev);
        }

        await logActivity("session_started", "session", sessionId, {
          tableNumber: table.number,
          location: table.location,
          isRodizio: sessionForm.isRodizio,
          numPeople: sessionForm.numPeople,
          orderingMode: "client",
          recovered: data.recovered || false,
        });
        setShowStartSessionModal(false);
        if (data.recovered) {
          showToast("info", "Sessão existente recuperada");
        }

        // Also fetch orders for recovered sessions
        if (data.recovered && session) {
          const { data: ordersData } = await supabase
            .from("orders")
            .select(`*, product:products(*)`)
            .eq("session_id", session.id)
            .order("created_at", { ascending: false });
          setOrders((ordersData || []) as unknown as OrderWithProduct[]);
        }

        // Background refresh for any other data
        fetchData();
        setActiveTab("menu"); // Mostrar menu automaticamente
      } else {
        console.error("[WaiterMesa] Erro ao iniciar sessão:", data.error);
        showToast("error", data.error || "Erro ao iniciar sessão");
      }
    } catch (err) {
      console.error("[WaiterMesa] Exceção ao iniciar sessão:", err);
      showToast("error", "Erro inesperado ao iniciar sessão");
    }
  }, [table, user, sessionForm, logActivity, fetchData, showToast, supabase]);

  const handleToggleOrderingMode = useCallback(async () => {
    if (!table?.activeSession || !orderingMode) return;

    const newMode = orderingMode === 'client' ? 'waiter_only' : 'client';
    const result = await updateMode(newMode);

    if (result.success) {
      await logActivity("ordering_mode_changed", "session", table.activeSession.id, {
        tableNumber: table.number,
        location: table.location,
        oldMode: orderingMode,
        newMode,
      });
    }

    setShowOrderingModeModal(false);
  }, [table, orderingMode, updateMode, logActivity]);

  const handleUpdateSessionSettings = useCallback(async (updates: { is_rodizio?: boolean; num_people?: number }) => {
    if (!table?.activeSession) return;

    const { error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", table.activeSession.id);

    if (error) {
      showToast("error", "Erro ao atualizar sessão");
      return;
    }

    setTable(prev => prev && prev.activeSession ? {
      ...prev,
      activeSession: { ...prev.activeSession, ...updates }
    } : prev);

    showToast("success", "Sessão atualizada");
    await logActivity("session_updated", "session", table.activeSession.id, {
      tableNumber: table.number,
      ...updates,
    });
  }, [table, supabase, showToast, logActivity]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <p className="text-gray-400">Mesa não encontrada</p>
      </div>
    );
  }

  // Use session.total_amount (includes rodízio base + extras) rather than summing orders
  // For rodízio: total = rodizioPrice * numPeople + drinks/extras
  // For à la carte: total is accumulated from submitted cart totals
  const totalAmount = table.activeSession?.total_amount || 0;

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const pendingCallsCount = waiterCalls.filter(c => c.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-20">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/waiter" className="p-2 text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-bold text-white">Mesa #{table.number}</h1>
              {table.activeSession && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{table.activeSession.num_people}p</span>
                  <span>·</span>
                  <span>{table.activeSession.is_rodizio ? "Rodízio" : "À La Carte"}</span>
                  <span>·</span>
                  <span className="text-[#D4AF37] font-semibold">{totalAmount.toFixed(2)}€</span>
                </div>
              )}
            </div>
          </div>
          {table.activeSession && orderingMode && (
            <button
              onClick={() => setShowOrderingModeModal(true)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                orderingMode === "waiter_only"
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              }`}
            >
              {ORDERING_MODE_ICONS[orderingMode]} {ORDERING_MODE_LABELS[orderingMode]}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* No Active Session */}
        {!table.activeSession && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🪑</div>
            <h2 className="text-xl font-semibold text-white mb-4">Mesa Disponível</h2>
            <p className="text-gray-400 mb-4">A aguardar que o cliente inicie a sessão via QR code.</p>
            <button
              onClick={() => setShowStartSessionModal(true)}
              className="mt-6 px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#C4A030] transition-colors"
            >
              Iniciar Sessão para Cliente
            </button>
            <p className="text-gray-500 text-sm mt-4">
              Ou aguarde que o cliente escaneie o QR code na mesa
            </p>
          </div>
        )}

        {/* Active Session - Tab Content */}
        {table.activeSession && (
          <>
            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-4">
                {/* Pending Payment Banner */}
                {table.activeSession?.status === "pending_payment" && (() => {
                  const customerNif = String((table.activeSession as Record<string, unknown>).customer_nif || "");
                  return (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💰</span>
                        <div className="flex-1">
                          <p className="text-yellow-400 font-semibold">Conta pedida pelo cliente</p>
                          {customerNif && (
                            <p className="text-yellow-400/70 text-sm">NIF: {customerNif}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={openBillingModal}
                        className="w-full py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#C4A030] transition-colors"
                      >
                        Processar Pagamento
                      </button>
                    </div>
                  );
                })()}

                {/* Summary Card */}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">{orders.length}</div>
                      <div className="text-xs text-gray-500">Pedidos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-400">{pendingOrders.length + preparingOrders.length}</div>
                      <div className="text-xs text-gray-500">Em curso</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{readyOrders.length}</div>
                      <div className="text-xs text-gray-500">Prontos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#D4AF37]">{totalAmount.toFixed(2)}€</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                </div>

                {/* Pending calls alert (compact) */}
                {pendingCallsCount > 0 && (
                  <button
                    onClick={() => setActiveTab("chamadas")}
                    className="w-full bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-center gap-3 animate-pulse"
                  >
                    <span className="text-xl">🔔</span>
                    <span className="text-red-400 font-medium text-sm flex-1 text-left">
                      {pendingCallsCount} chamada(s) pendente(s)
                    </span>
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* Ready orders alert */}
                {readyOrders.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Prontos para Servir ({readyOrders.length})
                      </h3>
                      {table?.activeSession && (
                        <button
                          onClick={() => printSession(table.activeSession!.id, table.location || "")}
                          disabled={isPrinting}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-gray-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          title="Imprimir para cozinha"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Imprimir
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {readyOrders.map((order) => (
                        <OrderCard key={order.id} order={order} onStatusChange={handleUpdateOrderStatus} onRequestRevert={setRevertOrderId} isRodizio={isSessionRodizio} />
                      ))}
                    </div>
                  </div>
                )}

                {pendingOrders.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-400 rounded-full" />
                      Pendentes ({pendingOrders.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingOrders.map((order) => (
                        <OrderCard key={order.id} order={order} onStatusChange={handleUpdateOrderStatus} onRequestRevert={setRevertOrderId} isRodizio={isSessionRodizio} />
                      ))}
                    </div>
                  </section>
                )}

                {preparingOrders.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full" />
                      Em Preparação ({preparingOrders.length})
                    </h3>
                    <div className="space-y-2">
                      {preparingOrders.map((order) => (
                        <OrderCard key={order.id} order={order} onStatusChange={handleUpdateOrderStatus} onRequestRevert={setRevertOrderId} isRodizio={isSessionRodizio} />
                      ))}
                    </div>
                  </section>
                )}

                {deliveredOrders.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-500 rounded-full" />
                      Entregues ({deliveredOrders.length})
                    </h3>
                    <div className="space-y-2">
                      {deliveredOrders.map((order) => (
                        <OrderCard key={order.id} order={order} onStatusChange={handleUpdateOrderStatus} onRequestRevert={setRevertOrderId} isRodizio={isSessionRodizio} />
                      ))}
                    </div>
                  </section>
                )}

                {orders.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum pedido ainda</p>
                    <p className="text-gray-600 text-sm mt-1">Vá ao Menu para adicionar pedidos</p>
                  </div>
                )}
              </div>
            )}

            {/* Menu Tab */}
            {activeTab === "menu" && (
              <div className="flex flex-col -mx-4 -mt-4" style={{ height: "calc(100vh - 130px)" }}>
                {/* Category tabs */}
                <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-[#1a1a1a] border-b border-gray-800 shrink-0">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors text-sm ${
                      !selectedCategory
                        ? "bg-[#D4AF37] text-black font-semibold"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors text-sm ${
                        selectedCategory === cat.id
                          ? "bg-[#D4AF37] text-black font-semibold"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Product grid */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {products
                        .filter((p) => !selectedCategory || p.categoryId === selectedCategory)
                        .map((product) => {
                          const cartQty = getCartQuantity(product.id);
                          return (
                            <div
                              key={product.id}
                              className={`bg-[#1a1a1a] rounded-xl p-3 flex flex-col transition-colors ${
                                cartQty > 0
                                  ? "border-2 border-[#D4AF37]"
                                  : "border-2 border-transparent hover:border-gray-700"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-white text-sm leading-tight flex-1 mr-2">
                                  {product.name}
                                </span>
                                {isSessionRodizio && product.isRodizio ? (
                                  <span className="text-green-500 text-xs font-semibold whitespace-nowrap">
                                    Incluído
                                  </span>
                                ) : isSessionRodizio && !product.isRodizio ? (
                                  <span className="text-[#D4AF37] font-semibold text-sm whitespace-nowrap">
                                    +{product.price.toFixed(2)}€
                                  </span>
                                ) : (
                                  <span className="text-[#D4AF37] font-semibold text-sm whitespace-nowrap">
                                    {product.price.toFixed(2)}€
                                  </span>
                                )}
                              </div>
                              {product.description && (
                                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                  {product.description}
                                </p>
                              )}
                              <div className="mt-auto flex items-center justify-between">
                                {cartQty > 0 && (
                                  <div className="flex-1 mr-2">
                                    {editingNotes === product.id ? (
                                      <input
                                        type="text"
                                        placeholder="Notas..."
                                        defaultValue={cart.find(i => i.productId === product.id)?.notes || ""}
                                        className="w-full bg-gray-700 text-xs text-white px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-[#D4AF37]"
                                        onBlur={(e) => { updateNotes(product.id, e.target.value); setEditingNotes(null); }}
                                        onKeyDown={(e) => { if (e.key === "Enter") { updateNotes(product.id, e.currentTarget.value); setEditingNotes(null); } }}
                                        autoFocus
                                      />
                                    ) : (
                                      <button
                                        onClick={() => setEditingNotes(product.id)}
                                        className="text-xs text-gray-500 hover:text-gray-300 truncate max-w-full"
                                      >
                                        {cart.find(i => i.productId === product.id)?.notes || "+ Nota"}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {cartQty > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateQuantity(product.id, cartQty - 1)}
                                      className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-lg hover:bg-gray-600"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center text-white text-sm font-semibold">{cartQty}</span>
                                    <button
                                      onClick={() => addToCart(product, user?.name || "waiter")}
                                      className="w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-lg hover:bg-[#C4A030]"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addToCart(product, user?.name || "waiter")}
                                    className="w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-lg hover:bg-[#C4A030] ml-auto"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Floating cart bar */}
                {cartItemsCount > 0 && (
                  <div className="border-t border-gray-800 bg-[#1a1a1a] px-4 py-3 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium text-sm">{cartItemsCount} item(s)</span>
                        <button onClick={clearCart} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                          Limpar
                        </button>
                      </div>
                      {isSessionRodizio ? (
                        <span className="text-[#D4AF37] font-bold">
                          {cartTotal > 0 ? `+${cartTotal.toFixed(2)}€ extras` : "Incluído"}
                        </span>
                      ) : (
                        <span className="text-[#D4AF37] font-bold">{cartTotal.toFixed(2)}€</span>
                      )}
                    </div>
                    <button
                      onClick={openReview}
                      className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#C4A030] transition-colors"
                    >
                      Rever Pedido
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Definicoes Tab */}
            {activeTab === "definicoes" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Definições da Sessão</h2>

                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <label className="text-sm text-gray-400 mb-3 block">Tipo de Consumo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleUpdateSessionSettings({ is_rodizio: false })}
                      className={`py-4 px-4 rounded-xl font-medium transition-colors text-center ${
                        !table.activeSession.is_rodizio
                          ? "bg-[#D4AF37] text-black"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="text-2xl mb-1">🍽️</div>
                      À La Carte
                    </button>
                    <button
                      onClick={() => handleUpdateSessionSettings({ is_rodizio: true })}
                      className={`py-4 px-4 rounded-xl font-medium transition-colors text-center ${
                        table.activeSession.is_rodizio
                          ? "bg-[#D4AF37] text-black"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="text-2xl mb-1">🍣</div>
                      Rodízio
                    </button>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <label className="text-sm text-gray-400 mb-3 block">Número de Pessoas</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleUpdateSessionSettings({ num_people: num })}
                        className={`py-3 rounded-xl font-medium transition-colors ${
                          table.activeSession!.num_people === num
                            ? "bg-[#D4AF37] text-black"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <label className="text-sm text-gray-400 mb-3 block">Modo de Pedido</label>
                  <button
                    onClick={() => setShowOrderingModeModal(true)}
                    className={`w-full py-4 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-3 ${
                      orderingMode === "waiter_only"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-green-500/20 text-green-400 border border-green-500/30"
                    }`}
                  >
                    <span className="text-xl">{orderingMode ? ORDERING_MODE_ICONS[orderingMode] : ""}</span>
                    <span>{orderingMode ? ORDERING_MODE_LABELS[orderingMode] : "A carregar..."}</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {orderingMode === "waiter_only"
                      ? "Clientes não podem fazer pedidos"
                      : "Clientes podem fazer pedidos pelo telemóvel"}
                  </p>
                </div>

                {/* Print to Kitchen */}
                {table?.activeSession && (pendingOrders.length > 0 || preparingOrders.length > 0) && (
                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
                    <label className="text-sm text-gray-400 mb-3 block">Impressão</label>
                    <button
                      onClick={() => printSession(table.activeSession!.id, table.location || "")}
                      disabled={isPrinting}
                      className="w-full py-3 bg-gray-700/50 text-gray-300 font-semibold rounded-xl hover:bg-gray-700 transition-colors border border-gray-600 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir para Cozinha
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {pendingOrders.length + preparingOrders.length} pedido(s) pendentes/em preparação
                    </p>
                  </div>
                )}

                {/* Encerrar/Pedir Conta - bill only available when orders have been delivered */}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-red-500/20">
                  <label className="text-sm text-gray-400 mb-3 block">Encerrar Sessão</label>
                  {deliveredOrders.length > 0 ? (
                    <>
                      <button
                        onClick={openBillingModal}
                        className="w-full py-4 bg-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/30"
                      >
                        Pedir Conta
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Encerra a sessão e solicita o pagamento
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setCloseReason(""); setShowCloseConfirm(true); }}
                        className="w-full py-4 bg-gray-700/50 text-gray-300 font-semibold rounded-xl hover:bg-gray-700 transition-colors border border-gray-600"
                      >
                        Encerrar Mesa
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {(preparingOrders.length > 0 || readyOrders.length > 0)
                          ? "Pedidos em preparação — requer justificação"
                          : pendingOrders.length > 0
                            ? "Pedidos pendentes serão cancelados"
                            : "Nenhum pedido feito — encerra a sessão sem faturação"
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Chamadas Tab */}
            {activeTab === "chamadas" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Chamadas</h2>
                {waiterCalls.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">🔕</div>
                    <p className="text-gray-500">Sem chamadas pendentes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waiterCalls.map((call) => (
                      <div
                        key={call.id}
                        className={`rounded-xl p-4 border ${
                          call.status === "pending"
                            ? "bg-red-500/20 border-red-500/50"
                            : "bg-yellow-500/20 border-yellow-500/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {call.call_type === "bill" && "💳"}
                              {call.call_type === "assistance" && "🔔"}
                              {call.call_type === "order" && "📝"}
                              {call.call_type === "other" && (call.message?.includes("PRONTO") ? "✅" : "❓")}
                            </span>
                            <div>
                              <h3 className={`font-semibold ${
                                call.message?.includes("PRONTO") ? "text-green-400" : call.status === "pending" ? "text-red-400" : "text-yellow-400"
                              }`}>
                                {call.call_type === "bill" && "Cliente pede a conta"}
                                {call.call_type === "assistance" && "Cliente precisa de ajuda"}
                                {call.call_type === "order" && "Cliente quer fazer pedido"}
                                {call.call_type === "other" && (call.message?.includes("PRONTO") ? "Pedido Pronto!" : "Chamada do cliente")}
                              </h3>
                              {call.message && (
                                <p className={`text-sm mt-1 ${call.message.includes("PRONTO") ? "text-green-300 font-medium" : "text-gray-300"}`}>{call.message}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(call.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {call.status === "pending" && (
                              <button
                                onClick={() => handleAcknowledgeCall(call.id)}
                                className="px-3 py-1 text-sm bg-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/40 transition-colors"
                              >
                                Aceitar
                              </button>
                            )}
                            <button
                              onClick={() => handleCompleteCall(call.id)}
                              className="px-3 py-1 text-sm bg-green-500/30 text-green-400 rounded-lg hover:bg-green-500/40 transition-colors"
                            >
                              Concluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Cart Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={closeReview} />
          <div className="relative bg-[#1A1A1A] rounded-t-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Rever Pedido</h2>
              <button onClick={closeReview} className="p-2 text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Duplicate alerts */}
            {duplicateItems.length > 0 && (
              <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20">
                <p className="text-xs text-amber-400 font-medium mb-2">
                  Estes produtos já foram pedidos nesta sessão:
                </p>
                <div className="space-y-2">
                  {duplicateItems.map(item => {
                    const dupInfo = duplicateMap.get(item.productId);
                    const isConfirmed = confirmedDuplicates.has(item.productId);
                    return (
                      <div key={item.productId} className="flex items-center justify-between">
                        <span className="text-xs text-amber-300">
                          {item.product.name} (já pedido: {dupInfo?.totalQty}x)
                        </span>
                        <button
                          onClick={() => confirmDuplicate(item.productId)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            isConfirmed
                              ? "bg-green-500/20 text-green-400"
                              : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                          }`}
                        >
                          {isConfirmed ? "Confirmado" : "Confirmar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cart items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-white truncate">{item.product.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">x{item.quantity}</span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1 truncate">📝 {item.notes}</p>
                    )}
                  </div>
                  {isSessionRodizio && item.product.isRodizio ? (
                    <span className="text-green-500 text-xs shrink-0">
                      Incluído
                    </span>
                  ) : (
                    <span className="text-[#D4AF37] font-medium text-sm shrink-0">
                      {isSessionRodizio ? "+" : ""}{(item.product.price * item.quantity).toFixed(2)}€
                    </span>
                  )}
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Totals + submit */}
            <div className="border-t border-gray-800 px-5 py-4">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span className="text-white">{isSessionRodizio ? "Extras" : "Total"}</span>
                {isSessionRodizio && cartTotal === 0 ? (
                  <span className="text-green-500">Tudo incluído</span>
                ) : (
                  <span className="text-[#D4AF37]">{isSessionRodizio ? "+" : ""}{cartTotal.toFixed(2)}€</span>
                )}
              </div>
              {hasUnconfirmedDuplicates && (
                <p className="text-xs text-amber-400 text-center mb-3">
                  Confirme os duplicados antes de submeter
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={closeReview}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => { closeReview(); handleSubmitCart(); }}
                  disabled={isSubmittingOrder || hasUnconfirmedDuplicates}
                  className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-bold hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingOrder ? (
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full mx-auto" />
                  ) : (
                    `Confirmar (${cartItemsCount})`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Session Modal */}
      {showStartSessionModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 border border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sessão</h2>

            <div className="space-y-4 mb-6">
              {/* Rodízio Toggle */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Tipo de Sessão</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSessionForm({ ...sessionForm, isRodizio: false })}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                      !sessionForm.isRodizio
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    À La Carte
                  </button>
                  <button
                    onClick={() => setSessionForm({ ...sessionForm, isRodizio: true })}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                      sessionForm.isRodizio
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Rodízio
                  </button>
                </div>
              </div>

              {/* Number of People */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Número de Pessoas</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSessionForm({ ...sessionForm, numPeople: num })}
                      className={`py-3 rounded-xl font-medium transition-colors ${
                        sessionForm.numPeople === num
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowStartSessionModal(false)}
                className="flex-1 py-3 bg-gray-800 text-gray-400 font-semibold rounded-xl hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartSession}
                className="flex-1 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#C4A030] transition-colors"
              >
                Iniciar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert Order Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revertOrderId}
        title="Reverter Entrega?"
        message="Tem a certeza que pretende marcar este pedido como não entregue? O pedido voltará ao estado 'Pronto para servir'."
        variant="warning"
        confirmText="Sim, Reverter"
        cancelText="Cancelar"
        onConfirm={() => {
          if (revertOrderId) {
            handleUpdateOrderStatus(revertOrderId, "ready");
            setRevertOrderId(null);
          }
        }}
        onCancel={() => setRevertOrderId(null)}
      />

      {/* Ordering Mode Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showOrderingModeModal}
        title={orderingMode === 'client' ? 'Ativar Modo Bloqueio?' : 'Desativar Modo Bloqueio?'}
        message={
          orderingMode === 'client'
            ? 'Os clientes não poderão fazer pedidos. Apenas você poderá adicionar itens ao pedido.'
            : 'Os clientes voltarão a poder fazer pedidos normalmente através do menu.'
        }
        variant="warning"
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={handleToggleOrderingMode}
        onCancel={() => setShowOrderingModeModal(false)}
      />

      {/* Close Session Confirmation Modal */}
      {showCloseConfirm && (() => {
        const hasPreparingOrReady = preparingOrders.length > 0 || readyOrders.length > 0;
        const needsJustification = hasPreparingOrReady;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowCloseConfirm(false)} />
            <div className="relative bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-semibold text-white mb-2">Encerrar Mesa?</h3>
              <p className="text-gray-400 text-sm mb-4">
                {hasPreparingOrReady
                  ? "Existem pedidos em preparação na cozinha. Para encerrar é necessário indicar o motivo."
                  : pendingOrders.length > 0
                    ? "Existem pedidos pendentes que serão cancelados. A mesa será libertada sem faturação."
                    : "Nenhum pedido foi feito nesta sessão. A mesa será libertada sem faturação."
                }
              </p>

              {needsJustification && (
                <div className="mb-4">
                  <label className="text-sm text-gray-300 mb-2 block">Motivo do encerramento</label>
                  <textarea
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    placeholder="Ex: Cliente desistiu, erro no pedido..."
                    className="w-full px-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 text-sm border border-gray-700 focus:border-[#D4AF37] focus:outline-none resize-none"
                    rows={2}
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-medium hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowCloseConfirm(false);
                    handleCloseSessionDirect();
                  }}
                  disabled={needsJustification && closeReason.trim().length === 0}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Encerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !isBillingSubmitting && setShowBillingModal(false)} />

          <div className="relative bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    step <= billingStep ? "bg-[#D4AF37]" : "bg-gray-700"
                  }`}
                />
              ))}
            </div>

            {/* Step 1: NIF */}
            {billingStep === 1 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Contribuinte</h3>
                <p className="text-gray-400 text-sm mb-6">O cliente quer fatura com NIF?</p>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => { setBillingWantsNif(false); setBillingNif(""); }}
                    className={`flex-1 py-4 rounded-xl font-medium transition-colors text-center ${
                      !billingWantsNif
                        ? "bg-[#D4AF37] text-black"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    Não
                  </button>
                  <button
                    onClick={() => setBillingWantsNif(true)}
                    className={`flex-1 py-4 rounded-xl font-medium transition-colors text-center ${
                      billingWantsNif
                        ? "bg-[#D4AF37] text-black"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    Sim
                  </button>
                </div>

                {billingWantsNif && (
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={9}
                    placeholder="NIF (9 dígitos)"
                    value={billingNif}
                    onChange={(e) => setBillingNif(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 text-lg tracking-wider text-center border border-gray-700 focus:border-[#D4AF37] focus:outline-none mb-4"
                    autoFocus
                  />
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowBillingModal(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setBillingStep(2)}
                    disabled={billingWantsNif && billingNif.length > 0 && billingNif.length !== 9}
                    className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50"
                  >
                    Seguinte
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {billingStep === 2 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Método de Pagamento</h3>
                <p className="text-gray-400 text-sm mb-6">Como o cliente vai pagar?</p>

                <div className="space-y-3 mb-6">
                  {billingPaymentMethods.map((method) => {
                    const icons: Record<string, string> = {
                      cash: "\uD83D\uDCB5",
                      card: "\uD83D\uDCB3",
                      mbway: "\uD83D\uDCF1",
                      transfer: "\uD83C\uDFE6",
                    };
                    return (
                      <button
                        key={method.id}
                        onClick={() => setBillingPaymentMethodId(method.id)}
                        className={`w-full py-4 px-4 rounded-xl font-medium transition-colors flex items-center gap-3 ${
                          billingPaymentMethodId === method.id
                            ? "bg-[#D4AF37] text-black"
                            : "bg-gray-800 text-gray-300 hover:text-white"
                        }`}
                      >
                        <span className="text-2xl">{icons[method.slug] || "\uD83D\uDCB0"}</span>
                        <span className="text-lg">{method.name}</span>
                      </button>
                    );
                  })}
                  {billingPaymentMethods.length === 0 && (
                    <p className="text-gray-500 text-center py-4">A carregar métodos de pagamento...</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setBillingStep(1)}
                    className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-medium hover:text-white transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setBillingStep(3)}
                    disabled={!billingPaymentMethodId}
                    className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50"
                  >
                    Seguinte
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {billingStep === 3 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Confirmar Pagamento</h3>

                <div className="space-y-3 mb-6">
                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total</span>
                      <span className="text-2xl font-bold text-[#D4AF37]">
                        €{(table?.activeSession?.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">NIF</span>
                      <span className="text-white">
                        {billingWantsNif && billingNif ? billingNif : "Consumidor final"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pagamento</span>
                      <span className="text-white">
                        {billingPaymentMethods.find((m) => m.id === billingPaymentMethodId)?.name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {billingError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                    <p className="text-red-400 text-sm text-center">{billingError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setBillingStep(2)}
                    disabled={isBillingSubmitting}
                    className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-medium hover:text-white transition-colors disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleBillingSubmit}
                    disabled={isBillingSubmitting}
                    className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isBillingSubmitting ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      "Confirmar e Faturar"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      {table.activeSession && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#1a1a1a] border-t border-gray-800 safe-area-pb">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                activeTab === "dashboard" ? "text-[#D4AF37]" : "text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-[10px] font-medium">Pedidos</span>
            </button>

            <button
              onClick={() => setActiveTab("menu")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
                activeTab === "menu" ? "text-[#D4AF37]" : "text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {cartItemsCount > 0 && (
                <span className="absolute -top-0.5 right-1/4 bg-[#D4AF37] text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartItemsCount}
                </span>
              )}
              <span className="text-[10px] font-medium">Menu</span>
            </button>

            <button
              onClick={() => setActiveTab("definicoes")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                activeTab === "definicoes" ? "text-[#D4AF37]" : "text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-medium">Definições</span>
            </button>

            <button
              onClick={() => setActiveTab("chamadas")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
                activeTab === "chamadas" ? "text-[#D4AF37]" : "text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingCallsCount > 0 && (
                <span className="absolute -top-0.5 right-1/4 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {pendingCallsCount}
                </span>
              )}
              <span className="text-[10px] font-medium">Chamadas</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

// Order Card Component with swipe-to-deliver
function OrderCard({
  order,
  onStatusChange,
  onRequestRevert,
  isRodizio,
}: {
  order: OrderWithProduct;
  onStatusChange: (_orderId: string, _status: string) => void;
  onRequestRevert?: (_orderId: string) => void;
  isRodizio?: boolean;
}) {
  const touchRef = useRef<{ startX: number; startY: number; swiping: boolean }>({ startX: 0, startY: 0, swiping: false });
  const [translateX, setTranslateX] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "bg-orange-500/20 text-orange-400",
    preparing: "bg-blue-500/20 text-blue-400",
    ready: "bg-green-500/20 text-green-400",
    delivered: "bg-gray-500/20 text-gray-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    preparing: "A Preparar",
    ready: "Pronto para servir",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  // Swipeable: ready → delivered (swipe right), delivered → revert (swipe left)
  const isSwipeableRight = order.status === "ready";
  const isSwipeableLeft = order.status === "delivered";
  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isSwipeableRight && !isSwipeableLeft) return;
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, swiping: false };
  }, [isSwipeableRight, isSwipeableLeft]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwipeableRight && !isSwipeableLeft) return;
    const deltaX = e.touches[0].clientX - touchRef.current.startX;
    const deltaY = e.touches[0].clientY - touchRef.current.startY;

    // If vertical scroll is dominant, don't swipe
    if (!touchRef.current.swiping && Math.abs(deltaY) > Math.abs(deltaX)) return;
    touchRef.current.swiping = true;

    // Clamp: ready can only swipe right, delivered can only swipe left
    if (isSwipeableRight && deltaX > 0) {
      setTranslateX(Math.min(deltaX, 150));
    } else if (isSwipeableLeft && deltaX < 0) {
      setTranslateX(Math.max(deltaX, -150));
    }
  }, [isSwipeableRight, isSwipeableLeft]);

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current.swiping) {
      setTranslateX(0);
      return;
    }

    if (isSwipeableRight && translateX >= SWIPE_THRESHOLD) {
      // Swipe right on ready → mark delivered
      setTransitioning(true);
      setTranslateX(300);
      setTimeout(() => {
        onStatusChange(order.id, "delivered");
        setTranslateX(0);
        setTransitioning(false);
      }, 200);
    } else if (isSwipeableLeft && translateX <= -SWIPE_THRESHOLD) {
      // Swipe left on delivered → request revert
      setTransitioning(true);
      setTranslateX(0);
      setTimeout(() => {
        setTransitioning(false);
        onRequestRevert?.(order.id);
      }, 150);
    } else {
      // Snap back
      setTransitioning(true);
      setTranslateX(0);
      setTimeout(() => setTransitioning(false), 200);
    }
    touchRef.current.swiping = false;
  }, [isSwipeableRight, isSwipeableLeft, translateX, order.id, onStatusChange, onRequestRevert]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background revealed on swipe */}
      {isSwipeableRight && (
        <div className="absolute inset-0 bg-green-500/30 rounded-xl flex items-center pl-4">
          <span className="text-green-400 font-medium text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Entregue
          </span>
        </div>
      )}
      {isSwipeableLeft && (
        <div className="absolute inset-0 bg-orange-500/30 rounded-xl flex items-center justify-end pr-4">
          <span className="text-orange-400 font-medium text-sm flex items-center gap-2">
            Reverter
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </span>
        </div>
      )}

      {/* Card content */}
      <div
        className={`bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 relative ${
          transitioning ? "transition-transform duration-200" : ""
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium text-white">
              {order.quantity}x {order.product.name}
            </h4>
            {order.notes && (
              <p className="text-sm text-gray-400 mt-1">Nota: {order.notes}</p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
          {isRodizio && order.product.is_rodizio ? (
            <span className="text-green-500 text-xs font-semibold">Incluído</span>
          ) : (
            <span className="text-[#D4AF37] font-semibold">
              {isRodizio ? "+" : ""}{(order.unit_price * order.quantity).toFixed(2)}€
            </span>
          )}

          {isSwipeableRight && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Deslize para entregar
            </span>
          )}
          {isSwipeableLeft && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              Deslize para reverter
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
