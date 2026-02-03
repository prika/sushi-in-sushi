"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category, Session, Order, OrderStatus, SessionCustomer, SessionCustomerInsert } from "@/types/database";

type Step = "welcome" | "menu" | "tracking";
type OrderType = "rodizio" | "carta" | null;

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  notes?: string;
}

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

  // Products state
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

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

  // Waiter state
  const [waiterName, setWaiterName] = useState<string | null>(null);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [waiterCallStatus, setWaiterCallStatus] = useState<"idle" | "pending" | "acknowledged">("idle");
  const [showCallWaiterModal, setShowCallWaiterModal] = useState(false);
  const [callType, setCallType] = useState<"assistance" | "bill" | "order">("assistance");

  // Customer registration state
  const [currentCustomer, setCurrentCustomer] = useState<SessionCustomer | null>(null);
  const [sessionCustomers, setSessionCustomers] = useState<SessionCustomer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    display_name: "",
    full_name: "",
    email: "",
    phone: "",
    birth_date: "",
    marketing_consent: false,
    preferred_contact: "email" as "email" | "phone" | "none",
  });

  // Refs
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  const rodizioPrice = isLunch ? 17 : 20;

  // Fetch waiter info for this table
  useEffect(() => {
    async function fetchWaiterInfo() {
      try {
        // Get table ID first
        const { data: tableData } = await supabase
          .from("tables")
          .select("id")
          .eq("number", parseInt(mesaNumero))
          .eq("location", localizacao)
          .single();

        if (!tableData) return;

        // Fetch waiter assignment using the view
        const { data: waiterData } = await (supabase as unknown as {
          from: (table: string) => ReturnType<typeof supabase.from>;
        })
          .from("waiter_assignments")
          .select("staff_name")
          .eq("table_id", tableData.id)
          .single();

        if (waiterData) {
          setWaiterName(waiterData.staff_name);
        }
      } catch (err) {
        // Waiter info is optional, don't show error
        console.log("Waiter info not available:", err);
      }
    }

    fetchWaiterInfo();
  }, [supabase, mesaNumero, localizacao]);

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

  // Cart functions
  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { productId: product.id, product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, [removeFromCart]);

  const updateNotes = useCallback((productId: string, notes: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, notes }
          : item
      )
    );
  }, []);

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    if (orderType === "rodizio" && item.product.is_rodizio) {
      return total;
    }
    return total + (item.product.price * item.quantity);
  }, 0);

  const cartItemsCount = cart.reduce((count, item) => count + item.quantity, 0);

  const getCartQuantity = useCallback((productId: string) => {
    const item = cart.find(i => i.productId === productId);
    return item?.quantity || 0;
  }, [cart]);

  // Get final total including rodizio
  const getFinalTotal = useCallback(() => {
    if (orderType === "rodizio") {
      return (rodizioPrice * numPessoas) + cartTotal;
    }
    return cartTotal;
  }, [orderType, rodizioPrice, numPessoas, cartTotal]);

  // Fetch session customers
  const fetchSessionCustomers = useCallback(async (sessionId: string) => {
    const extendedSupabase = supabase as unknown as {
      from: (table: string) => ReturnType<typeof supabase.from>;
    };
    const { data } = await extendedSupabase
      .from("session_customers")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      setSessionCustomers(data as SessionCustomer[]);
    }
  }, [supabase]);

  // Load current customer from localStorage
  useEffect(() => {
    if (session?.id) {
      const storedCustomerId = localStorage.getItem(`customer_${session.id}`);
      if (storedCustomerId && sessionCustomers.length > 0) {
        const customer = sessionCustomers.find(c => c.id === storedCustomerId);
        if (customer) {
          setCurrentCustomer(customer);
        }
      }
    }
  }, [session?.id, sessionCustomers]);

  // Fetch session customers when session is set
  useEffect(() => {
    if (session?.id) {
      fetchSessionCustomers(session.id);
    }
  }, [session?.id, fetchSessionCustomers]);

  // Register customer
  const registerCustomer = useCallback(async () => {
    if (!session || !customerForm.display_name.trim()) return;

    try {
      const extendedSupabase = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      const customerData: SessionCustomerInsert = {
        session_id: session.id,
        display_name: customerForm.display_name.trim(),
        full_name: customerForm.full_name.trim() || null,
        email: customerForm.email.trim() || null,
        phone: customerForm.phone.trim() || null,
        birth_date: customerForm.birth_date || null,
        marketing_consent: customerForm.marketing_consent,
        preferred_contact: customerForm.preferred_contact,
        is_session_host: sessionCustomers.length === 0,
      };

      const { data, error: insertError } = await extendedSupabase
        .from("session_customers")
        .insert(customerData)
        .select()
        .single();

      if (insertError) throw insertError;

      const newCustomer = data as SessionCustomer;
      setSessionCustomers(prev => [...prev, newCustomer]);
      setCurrentCustomer(newCustomer);
      localStorage.setItem(`customer_${session.id}`, newCustomer.id);

      setCustomerForm({
        display_name: "",
        full_name: "",
        email: "",
        phone: "",
        birth_date: "",
        marketing_consent: false,
        preferred_contact: "email",
      });
      setShowCustomerModal(false);

      setSuccessMessage(`Olá, ${newCustomer.display_name}! Bom apetite!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error registering customer:", err);
      setError("Erro ao registar. Por favor, tente novamente.");
    }
  }, [session, customerForm, sessionCustomers.length, supabase]);

  // Select existing customer
  const selectCustomer = useCallback((customer: SessionCustomer) => {
    if (session?.id) {
      setCurrentCustomer(customer);
      localStorage.setItem(`customer_${session.id}`, customer.id);
      setShowCustomerModal(false);
    }
  }, [session?.id]);

  // Submit order
  const submitOrder = useCallback(async () => {
    if (!session || cart.length === 0) return;

    setIsSubmittingOrder(true);
    setError(null);

    try {
      const ordersToInsert = cart.map(item => ({
        session_id: session.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.product.price,
        notes: item.notes || null,
        status: "pending" as const,
        session_customer_id: currentCustomer?.id || null,
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
      setCart([]);
      setIsCartOpen(false);

      // Show success message
      const customerName = currentCustomer?.display_name;
      setSuccessMessage(customerName ? `${customerName}, pedido enviado!` : "Pedido enviado para a cozinha!");
      setTimeout(() => setSuccessMessage(null), 3000);

      setStep("tracking");
    } catch (err) {
      console.error("Error submitting order:", err);
      setError("Erro ao enviar pedido. Por favor, tente novamente.");
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [session, cart, cartTotal, supabase]);

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

  // Call waiter function
  const callWaiter = useCallback(async (type: "assistance" | "bill" | "order" = "assistance") => {
    if (!tableId || isCallingWaiter) return;

    setIsCallingWaiter(true);

    try {
      // Create waiter call record
      const { error: insertError } = await (supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      })
        .from("waiter_calls")
        .insert({
          table_id: tableId,
          session_id: session?.id || null,
          call_type: type,
          location: localizacao,
          status: "pending",
        });

      if (insertError) throw insertError;

      setWaiterCallStatus("pending");
      setShowCallWaiterModal(false);

      const messages = {
        assistance: waiterName
          ? `${waiterName} foi notificado(a) e virá até si em breve.`
          : "Um funcionário foi notificado e virá até si em breve.",
        bill: "A conta foi pedida. Um funcionário virá até si em breve.",
        order: "Um funcionário foi notificado para ajudar com o pedido.",
      };

      setSuccessMessage(messages[type]);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reset call status after 2 minutes
      setTimeout(() => {
        setWaiterCallStatus("idle");
      }, 120000);
    } catch (err) {
      console.error("Error calling waiter:", err);
      setError("Erro ao chamar funcionário. Por favor, tente novamente.");
    } finally {
      setIsCallingWaiter(false);
    }
  }, [tableId, session, localizacao, waiterName, isCallingWaiter, supabase]);

  // Subscribe to waiter call status updates
  useEffect(() => {
    if (!tableId) return;

    const channel = supabase
      .channel(`waiter-calls-${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiter_calls",
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          if (payload.new.status === "acknowledged") {
            setWaiterCallStatus("acknowledged");
            setSuccessMessage(waiterName
              ? `${waiterName} está a caminho!`
              : "O funcionário está a caminho!");
            setTimeout(() => setSuccessMessage(null), 5000);
          } else if (payload.new.status === "completed") {
            setWaiterCallStatus("idle");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, waiterName, supabase]);

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
          <div className="flex items-center gap-4 mb-6">
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

          {/* Waiter Info Card */}
          {waiterName && (
            <div className="w-full max-w-sm mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">O seu empregado</p>
                    <p className="text-sm font-semibold text-white">{waiterName}</p>
                  </div>
                </div>
                <button
                  onClick={() => callWaiter("assistance")}
                  disabled={isCallingWaiter || waiterCallStatus !== "idle"}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    waiterCallStatus === "pending"
                      ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                      : waiterCallStatus === "acknowledged"
                        ? "bg-green-500/20 text-green-500 border border-green-500/30"
                        : "bg-[#D4AF37] text-black hover:bg-[#C4A030]"
                  }`}
                >
                  {waiterCallStatus === "pending" ? "A chamar..." :
                   waiterCallStatus === "acknowledged" ? "A caminho!" : "Chamar"}
                </button>
              </div>
            </div>
          )}

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

              <div className="flex items-center gap-2">
                {/* Customer indicator */}
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
                    currentCustomer
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-[#D4AF37]"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="max-w-[60px] truncate">
                    {currentCustomer?.display_name || "Entrar"}
                  </span>
                </button>

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-1.5"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              </div>
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
          {cartItemsCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D] to-transparent pt-8">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors flex items-center justify-center gap-2"
              >
                <span>Ver Pedido</span>
                <span className="bg-black/20 px-3 py-1 rounded-full">
                  €{getFinalTotal().toFixed(2)}
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
                  {cart.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">O carrinho está vazio</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.productId} className="bg-gray-900 rounded-xl p-4">
                          <div className="flex gap-4">
                            <div className="relative w-20 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                              {item.product.image_url ? (
                                <Image
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">🍣</div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium line-clamp-2">{item.product.name}</h3>
                                <button
                                  onClick={() => removeFromCart(item.productId)}
                                  className="p-1 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <div>
                                  {orderType === "rodizio" && item.product.is_rodizio ? (
                                    <span className="text-green-500 text-sm">Incluído</span>
                                  ) : (
                                    <span className="text-[#D4AF37] font-semibold">
                                      €{(item.product.price * item.quantity).toFixed(2)}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    className="w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#C4A030]"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3">
                                {editingNotes === item.productId ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Sem wasabi, extra gengibre..."
                                      defaultValue={item.notes || ""}
                                      className="flex-1 bg-gray-800 text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-[#D4AF37] focus:outline-none"
                                      onBlur={(e) => {
                                        updateNotes(item.productId, e.target.value);
                                        setEditingNotes(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          updateNotes(item.productId, e.currentTarget.value);
                                          setEditingNotes(null);
                                        }
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditingNotes(item.productId)}
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                  >
                                    {item.notes ? (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        {item.notes}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Adicionar nota
                                      </span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
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
                        <span>Total</span>
                        <span className="text-[#D4AF37]">€{getFinalTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={submitOrder}
                      disabled={isSubmittingOrder}
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

            {/* Waiter Info */}
            {waiterName && (
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">O seu empregado</p>
                    <p className="text-sm font-medium text-white">{waiterName}</p>
                  </div>
                </div>
                <button
                  onClick={() => callWaiter("assistance")}
                  disabled={isCallingWaiter || waiterCallStatus !== "idle"}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    waiterCallStatus === "pending"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : waiterCallStatus === "acknowledged"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30"
                  }`}
                >
                  {waiterCallStatus === "pending" ? "A chamar..." :
                   waiterCallStatus === "acknowledged" ? "A caminho!" : "Chamar"}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 py-4 flex gap-3">
              <button
                onClick={() => setShowCallWaiterModal(true)}
                disabled={waiterCallStatus !== "idle"}
                className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                  waiterCallStatus === "pending"
                    ? "bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500/30"
                    : waiterCallStatus === "acknowledged"
                      ? "bg-green-500/20 text-green-500 border-2 border-green-500/30"
                      : "border-2 border-gray-700 text-gray-300 hover:border-gray-600"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {waiterCallStatus === "pending" ? "A chamar..." :
                 waiterCallStatus === "acknowledged" ? "A caminho!" : "Chamar Empregado"}
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

      {/* Call Waiter Modal */}
      {showCallWaiterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCallWaiterModal(false)}
          />

          <div className="relative bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full animate-scale-up">
            <h3 className="text-xl font-semibold mb-2">Chamar Empregado</h3>
            <p className="text-gray-400 mb-6">
              {waiterName
                ? `${waiterName} será notificado(a) imediatamente.`
                : "Um funcionário será notificado imediatamente."}
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setCallType("assistance")}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  callType === "assistance"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🙋</span>
                  <div>
                    <p className="font-semibold">Preciso de Ajuda</p>
                    <p className="text-sm text-gray-400">Assistência geral</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCallType("order")}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  callType === "order"
                    ? "border-[#D4AF37] bg-[#D4AF37]/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="font-semibold">Ajuda com Pedido</p>
                    <p className="text-sm text-gray-400">Dúvidas sobre o menu</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCallWaiterModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => callWaiter(callType)}
                disabled={isCallingWaiter}
                className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCallingWaiter ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Chamar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Registration Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCustomerModal(false)}
          />

          <div className="relative bg-[#1A1A1A] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-scale-up">
            {/* Header */}
            <div className="sticky top-0 bg-[#1A1A1A] px-6 pt-6 pb-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Identificar-se</h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Personalize a sua experiência e acompanhe os seus pedidos
              </p>
            </div>

            <div className="p-6">
              {/* Existing customers in session */}
              {sessionCustomers.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-3">Quem está a pedir?</p>
                  <div className="flex flex-wrap gap-2">
                    {sessionCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          currentCustomer?.id === customer.id
                            ? "bg-[#D4AF37] text-black"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {customer.display_name}
                        {customer.is_session_host && (
                          <span className="ml-1 text-xs opacity-70">(anfitrião)</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-xs text-gray-500">ou adicionar nova pessoa</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <div className="space-y-4">
                {/* Display Name - Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Como quer ser tratado(a)? *
                  </label>
                  <input
                    type="text"
                    value={customerForm.display_name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Ex: João, Maria, Sr. Silva..."
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-[#D4AF37] focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {/* Incentive Message */}
                <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎁</span>
                    <div>
                      <p className="text-sm font-medium text-[#D4AF37]">Ganhe vantagens exclusivas!</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Preencha os dados adicionais e receba ofertas especiais no seu aniversário e promoções exclusivas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Optional Fields - Collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <span>Dados adicionais (opcional)</span>
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  <div className="space-y-4 pt-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Nome completo</label>
                      <input
                        type="text"
                        value={customerForm.full_name}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="João Silva"
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="joao@email.com"
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Telemóvel</label>
                      <input
                        type="tel"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="912 345 678"
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                    </div>

                    {/* Birth Date */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Data de nascimento</label>
                      <input
                        type="date"
                        value={customerForm.birth_date}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, birth_date: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Receba uma surpresa no seu aniversário!</p>
                    </div>

                    {/* Preferred Contact */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Contacto preferencial</label>
                      <div className="flex gap-2">
                        {[
                          { value: "email", label: "Email" },
                          { value: "phone", label: "Telemóvel" },
                          { value: "none", label: "Nenhum" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCustomerForm(prev => ({ ...prev, preferred_contact: option.value as "email" | "phone" | "none" }))}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              customerForm.preferred_contact === option.value
                                ? "bg-[#D4AF37] text-black"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Marketing Consent */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="checkbox"
                          checked={customerForm.marketing_consent}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, marketing_consent: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          customerForm.marketing_consent
                            ? "bg-[#D4AF37] border-[#D4AF37]"
                            : "border-gray-600 group-hover:border-gray-500"
                        }`}>
                          {customerForm.marketing_consent && (
                            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">
                        Quero receber promoções e novidades por email/SMS
                      </span>
                    </label>
                  </div>
                </details>
              </div>

              {/* Submit Button */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <button
                  onClick={registerCustomer}
                  disabled={!customerForm.display_name.trim()}
                  className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sessionCustomers.length === 0 ? "Começar a Pedir" : "Adicionar Pessoa"}
                </button>

                {currentCustomer && (
                  <button
                    onClick={() => setShowCustomerModal(false)}
                    className="w-full mt-3 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors"
                  >
                    Continuar como {currentCustomer.display_name}
                  </button>
                )}
              </div>
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
