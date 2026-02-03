"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { useSharedCart } from "@/hooks/useSharedCart";
import { OrderSendingOverlay } from "@/components/OrderSendingOverlay";
import type { Product, Category, Session, Order, OrderStatus } from "@/types/database";

type Step = "welcome" | "menu" | "tracking";
type OrderType = "rodizio" | "carta" | null;

interface CategoryWithProducts extends Category {
  products: Product[];
}

interface OrderWithProduct extends Order {
  product: Product;
}

interface GroupedOrders {
  timestamp: string;
  orders: OrderWithProduct[];
}

const STATUS_CONFIG: Record<OrderStatus, { icon: string; label: string; color: string }> = {
  pending: { icon: "⏳", label: "Na fila", color: "text-yellow-500" },
  preparing: { icon: "🔥", label: "A preparar", color: "text-orange-500" },
  ready: { icon: "✅", label: "Pronto", color: "text-green-500" },
  delivered: { icon: "✓", label: "Entregue", color: "text-gray-400" },
  cancelled: { icon: "✕", label: "Cancelado", color: "text-red-500" },
};

export default function MesaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const mesaNumero = params.numero as string;
  const localizacao = searchParams.get("loc") || "circunvalacao";

  // Core state
  const [step, setStep] = useState<Step>("welcome");
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [numPessoas, setNumPessoas] = useState(2);
  const [isLunch, setIsLunch] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 11 && hour < 16;
  });

  // Session state
  const [session, setSession] = useState<Session | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);

  // Device and participant tracking
  const { deviceId, deviceName, isReady: isDeviceReady } = useDeviceId();

  const {
    participants,
    activeParticipantCount,
    isSomeoneElseSending,
    sendingParticipant,
    setIsSending,
  } = useSessionParticipants({
    sessionId: session?.id || null,
    deviceId,
    deviceName,
  });

  // Shared cart
  const {
    items: cartItems,
    groupedItems,
    myItems,
    myItemCount,
    myTotal,
    totalItemCount,
    grandTotal,
    isEmpty: isCartEmpty,
    addItem: addToSharedCart,
    removeItem: removeFromSharedCart,
    updateQuantity: updateSharedQuantity,
    deleteItem: deleteSharedItem,
    clearAllItems,
    getQuantity: getSharedQuantity,
    getTotalQuantity,
  } = useSharedCart({
    sessionId: session?.id || null,
    deviceId,
  });

  // Products state
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Cart UI state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);

  // Orders/Tracking state
  const [sessionOrders, setSessionOrders] = useState<OrderWithProduct[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  // Refs
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  const rodizioPrice = isLunch ? 17 : 20;

  // Fetch products grouped by category
  useEffect(() => {
    async function fetchProducts() {
      setIsLoadingProducts(true);
      setError(null);

      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });

        if (categoriesError) throw categoriesError;

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("is_available", true)
          .order("sort_order", { ascending: true });

        if (productsError) throw productsError;

        const categoriesWithProducts: CategoryWithProducts[] = (categoriesData || []).map(category => ({
          ...category,
          products: (productsData || []).filter(product => product.category_id === category.id)
        })).filter(category => category.products.length > 0);

        setCategories(categoriesWithProducts);

        if (categoriesWithProducts.length > 0) {
          setActiveCategory(categoriesWithProducts[0].id);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Erro ao carregar o menu. Por favor, tente novamente.");
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchProducts();
  }, [supabase]);

  // Fetch session orders
  const fetchSessionOrders = useCallback(async () => {
    if (!session) return;

    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, product:products(*)")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSessionOrders(data as OrderWithProduct[]);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [session, supabase]);

  // Fetch orders when entering tracking step
  useEffect(() => {
    if (step === "tracking" && session) {
      fetchSessionOrders();
    }
  }, [step, session, fetchSessionOrders]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!session || step !== "tracking") return;

    const channel = supabase
      .channel(`orders-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `session_id=eq.${session.id}`,
        },
        async (payload) => {
          console.log("Order update received:", payload);

          if (payload.eventType === "UPDATE") {
            // Update the specific order in state
            setSessionOrders(prev =>
              prev.map(order =>
                order.id === payload.new.id
                  ? { ...order, ...payload.new }
                  : order
              )
            );
          } else if (payload.eventType === "INSERT") {
            // Fetch the new order with product info
            const { data } = await supabase
              .from("orders")
              .select("*, product:products(*)")
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setSessionOrders(prev => [data as OrderWithProduct, ...prev]);
            }
          } else if (payload.eventType === "DELETE") {
            setSessionOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, step, supabase]);

  // Group orders by timestamp (rounded to minute)
  const groupedOrders: GroupedOrders[] = sessionOrders.reduce((groups, order) => {
    const date = new Date(order.created_at);
    const timeKey = date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

    const existingGroup = groups.find(g => g.timestamp === timeKey);
    if (existingGroup) {
      existingGroup.orders.push(order);
    } else {
      groups.push({ timestamp: timeKey, orders: [order] });
    }
    return groups;
  }, [] as GroupedOrders[]);

  // Scroll to category when tab is clicked
  const scrollToCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Start session function
  const startSession = useCallback(async () => {
    if (!orderType) return;

    setIsStartingSession(true);
    setError(null);

    try {
      const { data: tableData, error: tableError } = await supabase
        .from("tables")
        .select("*")
        .eq("number", parseInt(mesaNumero))
        .eq("location", localizacao)
        .eq("is_active", true)
        .single();

      if (tableError) {
        const { data: tableDataFallback, error: tableErrorFallback } = await supabase
          .from("tables")
          .select("*")
          .eq("number", parseInt(mesaNumero))
          .eq("is_active", true)
          .single();

        if (tableErrorFallback) {
          throw new Error("Mesa não encontrada. Por favor, contacte um empregado.");
        }

        setTableId(tableDataFallback.id);

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            table_id: tableDataFallback.id,
            is_rodizio: orderType === "rodizio",
            num_people: numPessoas,
            status: "active",
            total_amount: orderType === "rodizio" ? rodizioPrice * numPessoas : 0,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);
      } else {
        setTableId(tableData.id);

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            table_id: tableData.id,
            is_rodizio: orderType === "rodizio",
            num_people: numPessoas,
            status: "active",
            total_amount: orderType === "rodizio" ? rodizioPrice * numPessoas : 0,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);
      }

      setStep("menu");
    } catch (err) {
      console.error("Error starting session:", err);
      setError(err instanceof Error ? err.message : "Erro ao iniciar sessão. Por favor, tente novamente.");
    } finally {
      setIsStartingSession(false);
    }
  }, [orderType, mesaNumero, localizacao, numPessoas, rodizioPrice, supabase]);

  // Cart functions (using shared cart)
  const addToCart = useCallback((product: Product) => {
    addToSharedCart(product, 1);
  }, [addToSharedCart]);

  const removeFromCart = useCallback((productId: string) => {
    removeFromSharedCart(productId);
  }, [removeFromSharedCart]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    const item = myItems.find(i => i.product_id === productId);
    if (item) {
      updateSharedQuantity(item.id, newQuantity);
    }
  }, [myItems, updateSharedQuantity]);

  // Calculate cart total (considering rodizio)
  const cartTotal = cartItems.reduce((total, item) => {
    if (orderType === "rodizio" && item.product.is_rodizio) {
      return total;
    }
    return total + (item.product.price * item.quantity);
  }, 0);

  const getCartQuantity = useCallback((productId: string) => {
    return getSharedQuantity(productId);
  }, [getSharedQuantity]);

  // Get final total including rodizio
  const getFinalTotal = useCallback(() => {
    if (orderType === "rodizio") {
      return (rodizioPrice * numPessoas) + cartTotal;
    }
    return cartTotal;
  }, [orderType, rodizioPrice, numPessoas, cartTotal]);

  // Handle send order button click
  const handleSendOrderClick = useCallback(() => {
    if (activeParticipantCount > 1) {
      setShowSendConfirmModal(true);
    } else {
      submitOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParticipantCount]);

  // Submit order
  const submitOrder = useCallback(async () => {
    if (!session || cartItems.length === 0) return;

    setIsSubmittingOrder(true);
    setError(null);
    setShowSendConfirmModal(false);

    try {
      // Set sending flag
      await setIsSending(true);

      const ordersToInsert = cartItems.map(item => ({
        session_id: session.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
        notes: item.notes || null,
        status: "pending" as const,
      }));

      const { error: ordersError } = await supabase
        .from("orders")
        .insert(ordersToInsert);

      if (ordersError) throw ordersError;

      const newTotal = (session.total_amount || 0) + cartTotal;
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ total_amount: newTotal })
        .eq("id", session.id);

      if (updateError) throw updateError;

      setSession(prev => prev ? { ...prev, total_amount: newTotal } : null);

      // Clear all cart items (shared cart)
      await clearAllItems();

      setIsCartOpen(false);

      // Show success message
      setSuccessMessage("Pedido enviado para a cozinha!");
      setTimeout(() => setSuccessMessage(null), 3000);

      setStep("tracking");
    } catch (err) {
      console.error("Error submitting order:", err);
      setError("Erro ao enviar pedido. Por favor, tente novamente.");
    } finally {
      await setIsSending(false);
      setIsSubmittingOrder(false);
    }
  }, [session, cartItems, cartTotal, supabase, setIsSending, clearAllItems]);

  // Request bill
  const requestBill = useCallback(async () => {
    if (!session) return;

    setIsRequestingBill(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({ status: "pending_payment" })
        .eq("id", session.id);

      if (updateError) throw updateError;

      setSession(prev => prev ? { ...prev, status: "pending_payment" } : null);
      setBillRequested(true);
      setShowBillModal(false);
      setSuccessMessage("Um funcionário virá até si em breve.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Error requesting bill:", err);
      setError("Erro ao pedir conta. Por favor, tente novamente.");
    } finally {
      setIsRequestingBill(false);
    }
  }, [session, supabase]);

  // Help function
  const requestHelp = useCallback(() => {
    setSuccessMessage("Um funcionário foi notificado e virá até si em breve.");
    setTimeout(() => setSuccessMessage(null), 5000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-red-500/90 text-white px-4 py-3 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-2 font-bold text-xl">×</button>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-green-500/90 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-down">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Welcome Step */}
      {step === "welcome" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
          {/* Compact Header with Logo and Table Number */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 relative">
              <Image
                src="/logo.png"
                alt="Sushi in Sushi"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-light tracking-[0.2em] text-[#D4AF37]">
                SUSHI IN SUSHI
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 uppercase">Mesa</span>
                <span className="text-xl font-bold text-[#D4AF37]">{mesaNumero}</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mb-8">
            <p className="text-sm text-gray-400 text-center mb-4">
              Escolha a modalidade
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setOrderType("rodizio")}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  orderType === "rodizio"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-700 bg-gray-900/50 hover:border-gray-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <p className="font-semibold text-lg">Rodízio</p>
                    <p className="text-sm text-gray-400">
                      {isLunch ? "Almoço" : "Jantar"} • Sushi à vontade
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#D4AF37]">
                      €{rodizioPrice}
                    </p>
                    <p className="text-xs text-gray-500">por pessoa</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setOrderType("carta")}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  orderType === "carta"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-700 bg-gray-900/50 hover:border-gray-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <p className="font-semibold text-lg">À Carta</p>
                    <p className="text-sm text-gray-400">Escolha os seus pratos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Preços variados</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm mb-10">
            <p className="text-sm text-gray-400 text-center mb-4">Número de pessoas</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setNumPessoas(Math.max(1, numPessoas - 1))}
                className="w-14 h-14 rounded-full border-2 border-gray-700 flex items-center justify-center text-2xl hover:border-[#D4AF37] transition-colors disabled:opacity-50"
                disabled={numPessoas <= 1}
              >
                −
              </button>
              <span className="text-4xl font-bold w-16 text-center text-[#D4AF37]">
                {numPessoas}
              </span>
              <button
                onClick={() => setNumPessoas(Math.min(8, numPessoas + 1))}
                className="w-14 h-14 rounded-full border-2 border-gray-700 flex items-center justify-center text-2xl hover:border-[#D4AF37] transition-colors disabled:opacity-50"
                disabled={numPessoas >= 8}
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={startSession}
            disabled={!orderType || isStartingSession}
            className={`w-full max-w-sm py-4 rounded-xl font-semibold text-lg transition-all ${
              orderType && !isStartingSession
                ? "bg-[#D4AF37] text-black hover:bg-[#C4A030]"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isStartingSession ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                A iniciar...
              </span>
            ) : (
              "Começar Pedido"
            )}
          </button>

          {orderType === "rodizio" && (
            <p className="mt-4 text-sm text-gray-400">
              Total estimado: <span className="text-[#D4AF37] font-semibold">€{rodizioPrice * numPessoas}</span>
            </p>
          )}
        </div>
      )}

      {/* Menu Step */}
      {step === "menu" && (
        <div className="flex-1 flex flex-col bg-[#0D0D0D]">
          {/* Fixed Header - Compact */}
          <div className="sticky top-0 z-20 bg-[#0D0D0D]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <button
                onClick={() => setStep("tracking")}
                className="p-1.5 -ml-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37] font-bold">#{mesaNumero}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">
                  {orderType === "rodizio" ? `Rodízio ${numPessoas}p` : "À Carta"}
                </span>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-1.5 -mr-1"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItemCount}
                  </span>
                )}
              </button>
            </div>

            <div
              ref={tabsRef}
              className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-gray-800"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                    activeCategory === category.id
                      ? "bg-[#D4AF37] text-black font-semibold"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {category.icon && <span className="text-sm">{category.icon}</span>}
                  <span className="text-xs">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto pb-28">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-10 w-10 text-[#D4AF37]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-gray-400 text-center py-20">Menu não disponível de momento.</p>
            ) : (
              <div className="px-4 py-4">
                {categories.map(category => (
                  <div
                    key={category.id}
                    ref={el => { categoryRefs.current[category.id] = el; }}
                    className="mb-8"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {category.icon && <span className="text-2xl">{category.icon}</span>}
                      <h2 className="text-xl font-semibold text-[#D4AF37]">{category.name}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {category.products.map(product => {
                        const cartQty = getCartQuantity(product.id);
                        const isIncludedInRodizio = orderType === "rodizio" && product.is_rodizio;
                        const hasQuantity = cartQty > 0;

                        return (
                          <div
                            key={product.id}
                            className={`relative bg-gray-900 rounded-xl overflow-hidden border-2 transition-all ${
                              hasQuantity ? "border-[#D4AF37]" : "border-transparent"
                            }`}
                          >
                            <div className="relative aspect-square bg-gray-800">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                                  🍣
                                </div>
                              )}

                              {isIncludedInRodizio && (
                                <div className="absolute top-2 left-2 bg-[#D4AF37] text-black text-[10px] font-bold px-2 py-1 rounded-full">
                                  INCLUÍDO
                                </div>
                              )}

                              {hasQuantity && (
                                <div className="absolute top-2 right-2 bg-[#D4AF37] text-black text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">
                                  {cartQty}
                                </div>
                              )}
                            </div>

                            <div className="p-3">
                              <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                                {product.name}
                              </h3>

                              <div className="flex items-center justify-between mt-2">
                                <div>
                                  {orderType === "carta" && (
                                    <span className="text-[#D4AF37] font-bold">
                                      €{product.price.toFixed(2)}
                                    </span>
                                  )}
                                  {orderType === "rodizio" && !product.is_rodizio && (
                                    <span className="text-[#D4AF37] font-bold text-sm">
                                      +€{product.price.toFixed(2)}
                                    </span>
                                  )}
                                  {isIncludedInRodizio && (
                                    <span className="text-green-500 text-sm font-medium">Grátis</span>
                                  )}
                                </div>

                                {hasQuantity ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateQuantity(product.id, cartQty - 1)}
                                      className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center font-semibold text-sm">{cartQty}</span>
                                    <button
                                      onClick={() => addToCart(product)}
                                      className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold hover:bg-[#C4A030] transition-colors"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addToCart(product)}
                                    className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black hover:bg-[#C4A030] transition-colors"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Submit Button */}
          {totalItemCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D] to-transparent pt-8">
              {activeParticipantCount > 1 && (
                <div className="text-center mb-2">
                  <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    {activeParticipantCount} pessoas a pedir
                  </span>
                </div>
              )}
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors flex items-center justify-center gap-2"
              >
                <span>Ver Pedido</span>
                <span className="bg-black/20 px-3 py-1 rounded-full">
                  {totalItemCount} items • €{getFinalTotal().toFixed(2)}
                </span>
              </button>
            </div>
          )}

          {/* Cart Drawer */}
          {isCartOpen && (
            <div className="fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/70"
                onClick={() => setIsCartOpen(false)}
              />

              <div className="absolute bottom-0 left-0 right-0 bg-[#0D0D0D] rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-gray-600 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                  <h2 className="text-xl font-semibold">O Seu Pedido</h2>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 -mr-2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {isCartEmpty ? (
                    <p className="text-gray-400 text-center py-8">O carrinho está vazio</p>
                  ) : (
                    <div className="space-y-6">
                      {groupedItems.map((group) => {
                        const isMyGroup = group.deviceId === deviceId;
                        const participantInfo = participants.find(p => p.device_id === group.deviceId);
                        const displayName = isMyGroup ? "Os meus items" : (participantInfo?.device_name || "Outro participante");

                        return (
                          <div key={group.deviceId}>
                            {/* Group Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isMyGroup ? "bg-[#D4AF37]" : "bg-blue-500"}`} />
                                <span className="text-sm font-medium text-gray-300">{displayName}</span>
                              </div>
                              <span className="text-sm text-gray-500">€{group.subtotal.toFixed(2)}</span>
                            </div>

                            {/* Items */}
                            <div className="space-y-3">
                              {group.items.map(item => (
                                <div key={item.id} className={`bg-gray-900 rounded-xl p-4 ${!isMyGroup ? "opacity-75" : ""}`}>
                                  <div className="flex gap-4">
                                    <div className="relative w-16 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                      {item.product.image_url ? (
                                        <Image
                                          src={item.product.image_url}
                                          alt={item.product.name}
                                          fill
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">🍣</div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-medium text-sm line-clamp-2">{item.product.name}</h3>
                                        {isMyGroup && (
                                          <button
                                            onClick={() => deleteSharedItem(item.id)}
                                            className="p-1 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between mt-2">
                                        <div>
                                          {orderType === "rodizio" && item.product.is_rodizio ? (
                                            <span className="text-green-500 text-xs">Incluído</span>
                                          ) : (
                                            <span className="text-[#D4AF37] font-semibold text-sm">
                                              €{(item.product.price * item.quantity).toFixed(2)}
                                            </span>
                                          )}
                                        </div>

                                        {isMyGroup ? (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => updateSharedQuantity(item.id, item.quantity - 1)}
                                              className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 text-sm"
                                            >
                                              −
                                            </button>
                                            <span className="w-5 text-center font-semibold text-sm">{item.quantity}</span>
                                            <button
                                              onClick={() => updateSharedQuantity(item.id, item.quantity + 1)}
                                              className="w-7 h-7 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#C4A030] text-sm"
                                            >
                                              +
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-400">×{item.quantity}</span>
                                        )}
                                      </div>

                                      {item.notes && (
                                        <p className="text-xs text-gray-500 mt-1">📝 {item.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isCartEmpty && (
                  <div className="border-t border-gray-800 px-6 py-4 space-y-4">
                    <div className="space-y-2">
                      {orderType === "rodizio" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rodízio ({numPessoas} pessoas)</span>
                          <span>€{(rodizioPrice * numPessoas).toFixed(2)}</span>
                        </div>
                      )}
                      {cartTotal > 0 && orderType === "rodizio" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Extras</span>
                          <span>€{cartTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-800">
                        <span>Total ({totalItemCount} items)</span>
                        <span className="text-[#D4AF37]">€{getFinalTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    {activeParticipantCount > 1 && (
                      <div className="text-center text-xs text-gray-400 bg-gray-800/50 rounded-lg py-2">
                        {activeParticipantCount} pessoas estão a escolher
                      </div>
                    )}

                    <button
                      onClick={handleSendOrderClick}
                      disabled={isSubmittingOrder || isSomeoneElseSending}
                      className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          A enviar...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Enviar para Cozinha
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tracking Step */}
      {step === "tracking" && (
        <div className="flex-1 flex flex-col bg-[#0D0D0D]">
          {/* Header - Compact */}
          <div className="sticky top-0 z-20 bg-[#0D0D0D] border-b border-gray-800">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37] font-bold">#{mesaNumero}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">
                  {orderType === "rodizio" ? `Rodízio ${numPessoas}p` : "À Carta"}
                </span>
              </div>

              <button
                onClick={() => setStep("menu")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37] text-black font-semibold text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Pedir
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-10 w-10 text-[#D4AF37]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : sessionOrders.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-gray-400 mb-2">Ainda não fez nenhum pedido</p>
                <button
                  onClick={() => setStep("menu")}
                  className="text-[#D4AF37] font-semibold hover:underline"
                >
                  Ver menu →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedOrders.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Time Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-sm text-gray-500 font-medium">{group.timestamp}</div>
                      <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    {/* Orders in group */}
                    <div className="space-y-2">
                      {group.orders.map(order => {
                        const statusConfig = STATUS_CONFIG[order.status];

                        return (
                          <div
                            key={order.id}
                            className={`flex items-center justify-between p-4 rounded-xl bg-gray-900/50 ${
                              order.status === "delivered" ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{statusConfig.icon}</span>
                              <div>
                                <p className="font-medium">
                                  {order.quantity}× {order.product?.name || "Produto"}
                                </p>
                                {order.notes && (
                                  <p className="text-xs text-gray-500">📝 {order.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className={`text-sm font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Session Total and Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D] border-t border-gray-800">
            {/* Session Total */}
            {session && (
              <div className="px-4 py-4 border-b border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total da sessão</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    €{session.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 py-4 flex gap-3">
              <button
                onClick={requestHelp}
                className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ajuda
              </button>

              <button
                onClick={() => setShowBillModal(true)}
                disabled={billRequested}
                className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                  billRequested
                    ? "bg-green-500/20 text-green-500 border-2 border-green-500/30"
                    : "bg-[#D4AF37] text-black hover:bg-[#C4A030]"
                }`}
              >
                {billRequested ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Conta Pedida
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Pedir Conta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Sending Overlay (when someone else is sending) */}
      <OrderSendingOverlay
        isVisible={isSomeoneElseSending}
        sendingParticipant={sendingParticipant}
      />

      {/* Send Confirmation Modal (for multiple participants) */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowSendConfirmModal(false)}
          />

          <div className="relative bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full animate-scale-up">
            <h3 className="text-xl font-semibold mb-2">Enviar Pedido</h3>
            <p className="text-gray-400 mb-4">
              Há {activeParticipantCount} pessoas a escolher nesta mesa. Confirma que pretende enviar o pedido de todos para a cozinha?
            </p>

            <div className="bg-gray-900 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                {groupedItems.map((group) => {
                  const isMyGroup = group.deviceId === deviceId;
                  const participantInfo = participants.find(p => p.device_id === group.deviceId);
                  const displayName = isMyGroup ? "Eu" : (participantInfo?.device_name || "Outro");

                  return (
                    <div key={group.deviceId} className="flex justify-between text-sm">
                      <span className="text-gray-400">{displayName}</span>
                      <span>{group.items.reduce((sum, i) => sum + i.quantity, 0)} items</span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
                  <span>Total</span>
                  <span className="text-[#D4AF37]">€{getFinalTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSendConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitOrder}
                disabled={isSubmittingOrder}
                className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingOrder ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Enviar Tudo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Request Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowBillModal(false)}
          />

          <div className="relative bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full animate-scale-up">
            <h3 className="text-xl font-semibold mb-2">Pedir Conta</h3>
            <p className="text-gray-400 mb-6">
              Confirma que pretende pedir a conta? Um funcionário virá até à sua mesa.
            </p>

            {session && (
              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total a pagar</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    €{session.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowBillModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={requestBill}
                disabled={isRequestingBill}
                className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRequestingBill ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
