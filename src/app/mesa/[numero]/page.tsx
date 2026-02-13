"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type MutableRefObject,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useProductsOptimized } from "@/presentation/hooks";
import { useCart } from "@/presentation/hooks/useCart";
import { useOrderReview } from "@/presentation/hooks/useOrderReview";
import { useOrderCooldown } from "@/presentation/hooks/useOrderCooldown";
import { useProductPreparationTimes } from "@/hooks/useProductPreparationTimes";
import {
  useOrderNotificationChannel,
  type OrderNotificationSupabaseLike,
  type RealtimeChannelLike,
} from "@/presentation/hooks/useOrderNotificationChannel";
import { CartService } from "@/domain/services/CartService";
import type { Product, Category } from "@/domain/entities";
import type {
  Order,
  Session,
  OrderStatus,
  SessionCustomer,
  SessionCustomerInsert,
} from "@/types/database";
import { useMesaLocale } from "@/contexts/MesaLocaleContext";
import { MesaLanguageSwitcher } from "@/components/mesa/MesaLanguageSwitcher";
import { type TableLeaderInfo } from "@/components/mesa/SwipeRatingGame";
import { GameHub } from "@/components/mesa/GameHub";
import type { GamesMode } from "@/domain/value-objects/GameConfig";

type Step = "welcome" | "active";
type Tab = "menu" | "cart" | "pedidos" | "chamar" | "conta" | "jogos";
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

const STATUS_ICONS: Record<OrderStatus, { icon: string; color: string }> = {
  pending: { icon: "⏳", color: "text-yellow-500" },
  preparing: { icon: "🔥", color: "text-orange-500" },
  ready: { icon: "✅", color: "text-green-500" },
  delivered: { icon: "✓", color: "text-gray-400" },
  cancelled: { icon: "✕", color: "text-red-500" },
};

export default function MesaPage() {
  const { t } = useMesaLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const mesaNumero = params.numero as string;
  const localizacao = searchParams.get("loc") || "circunvalacao";

  // Core state
  const [step, setStep] = useState<Step>("welcome");
  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [numPessoas, setNumPessoas] = useState(2);
  const [isLunch, setIsLunch] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 11 && hour < 16;
  });

  // Session state
  const [session, setSession] = useState<Session | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);

  // Products state - Use optimized hook (89% faster: 270ms → 30ms)
  const {
    products,
    categories: rawCategories,
    isLoading: isLoadingProducts,
  } = useProductsOptimized({
    availableOnly: true, // Only show available products
  });

  // Average preparation times for products
  const { times: preparationTimes } = useProductPreparationTimes(
    products.map((p) => p.id),
  );

  // Game config (for gamesMode: 'selection' | 'random')
  const [gamesMode, setGamesMode] = useState<GamesMode>("selection");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Transform categories with products grouped
  const categories = useMemo<CategoryWithProducts[]>(() => {
    return rawCategories
      .map((category) => ({
        ...category,
        products: products.filter(
          (product) => product.categoryId === category.id,
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [rawCategories, products]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Orders/Tracking state
  const [sessionOrders, setSessionOrders] = useState<OrderWithProduct[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Order items served this session (delivered or ready) – each is a ratable item in the swipe game
  const orderItemsForRating = useMemo(() => {
    return sessionOrders
      .filter((o) => o.status === "delivered" || o.status === "ready")
      .map((o) => ({
        orderId: o.id,
        product:
          products.find((p) => String(p.id) === String(o.product_id)) ?? null,
      }))
      .filter(
        (item): item is { orderId: string; product: Product } =>
          item.product !== null,
      );
  }, [sessionOrders, products]);

  // UI state
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  // Cooldown state
  const [cooldownMinutes, setCooldownMinutes] = useState(0);

  // Waiter state
  const [waiterName, setWaiterName] = useState<string | null>(null);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [waiterCallStatus, setWaiterCallStatus] = useState<
    "idle" | "pending" | "acknowledged"
  >("idle");
  const [showCallWaiterModal, setShowCallWaiterModal] = useState(false);
  const [callType, setCallType] = useState<"assistance" | "bill" | "order">(
    "assistance",
  );

  // Customer registration state
  const [currentCustomer, setCurrentCustomer] =
    useState<SessionCustomer | null>(null);
  const [sessionCustomers, setSessionCustomers] = useState<SessionCustomer[]>(
    [],
  );
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

  // Broadcast notification state
  const [orderNotification, setOrderNotification] = useState<string | null>(
    null,
  );
  const broadcastChannelRef = useRef<ReturnType<
    typeof supabase.channel
  > | null>(null);

  // Device ID for broadcast deduplication (prevent processing own broadcasts)
  // Using useState with lazy initialization to ensure stable value across renders
  const [deviceId] = useState<string>(() => {
    if (typeof window === "undefined") return "server";

    const stored = localStorage.getItem("mesa-device-id");
    if (stored) return stored;

    const id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("mesa-device-id", id);
    return id;
  });

  // Verification state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSessionCustomerId, setVerificationSessionCustomerId] =
    useState<string | null>(null);
  const [verificationType, setVerificationType] = useState<"email" | "phone">(
    "email",
  );
  const [verificationContact, setVerificationContact] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Debug: log verification modal state changes
  useEffect(() => {
    console.log(
      "[DEBUG] Verification modal state changed:",
      showVerificationModal,
    );
  }, [showVerificationModal]);

  // Ratings (swipe game) state
  const [ratingsStats, setRatingsStats] = useState<{
    tableLeader: TableLeaderInfo | null;
    userRatingCount: number;
    userRatedProductIds: number[];
    userRatedOrderIds: string[];
    totalRatingsAtTable: number;
  }>({
    tableLeader: null,
    userRatingCount: 0,
    userRatedProductIds: [],
    userRatedOrderIds: [],
    totalRatingsAtTable: 0,
  });

  // Refs
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  // Cart hook - manages cart state, totals, actions
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
    finalTotal,
    rodizioPrice,
    editingNotes,
    setEditingNotes,
  } = useCart({ orderType, isLunch, numPessoas });

  // Order review hook - manages review modal, duplicate detection
  const {
    showReviewModal,
    openReview,
    closeReview,
    duplicateMap,
    duplicateItems,
    hasUnconfirmedDuplicates,
    confirmedDuplicates,
    confirmDuplicate,
    undoConfirmDuplicate,
  } = useOrderReview({ cart, sessionOrders });

  // Order cooldown hook - blocks orders for X minutes after last order
  const { isCooldownActive, remainingFormatted, progress } = useOrderCooldown({
    sessionOrders,
    cooldownMinutes,
  });

  // Check if profile is incomplete (missing optional fields)
  const hasIncompleteProfile = useMemo(() => {
    if (!currentCustomer) return false;
    return (
      !currentCustomer.email ||
      !currentCustomer.full_name ||
      !currentCustomer.birth_date
    );
  }, [currentCustomer]);

  // Count unrated items available for games
  const unratedItemsCount = useMemo(() => {
    return orderItemsForRating.filter(
      (item) => !ratingsStats.userRatedOrderIds.includes(item.orderId),
    ).length;
  }, [orderItemsForRating, ratingsStats.userRatedOrderIds]);

  // Fetch table info, waiter, and recover existing session on load
  useEffect(() => {
    async function fetchTableAndSession() {
      try {
        // Get table by number and location
        const { data: tableData } = await supabase
          .from("tables")
          .select("id")
          .eq("number", parseInt(mesaNumero))
          .eq("location", localizacao)
          .single();

        if (!tableData) return;

        setTableId(tableData.id);

        // Fetch waiter assignment using the view
        const { data: waiterData } = await (
          supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
          }
        )
          .from("waiter_assignments")
          .select("staff_name")
          .eq("table_id", tableData.id)
          .single();

        if (waiterData) {
          setWaiterName(waiterData.staff_name);
        }

        // Fetch cooldown setting and games mode from restaurant
        const { data: restaurantData } = await (
          supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
          }
        )
          .from("restaurants")
          .select("id, order_cooldown_minutes, games_mode")
          .eq("slug", localizacao)
          .single();
        if (restaurantData) {
          const rd = restaurantData as Record<string, unknown>;
          setCooldownMinutes((rd.order_cooldown_minutes as number) ?? 0);
          setGamesMode(((rd.games_mode as string) ?? "selection") as GamesMode);
          if (rd.id) setRestaurantId(rd.id as string);
        }

        // Check for existing active session on this table
        const { data: activeSession } = await supabase
          .from("sessions")
          .select("*")
          .eq("table_id", tableData.id)
          .in("status", ["active", "pending_payment"])
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (activeSession) {
          setSession(activeSession);
          setOrderType(activeSession.is_rodizio ? "rodizio" : "carta");
          setNumPessoas(activeSession.num_people || 2);
          setStep("active");
        }
      } catch (err) {
        console.error("Error fetching table info", err);
      } finally {
        setIsCheckingSession(false);
      }
    }

    fetchTableAndSession();
  }, [supabase, mesaNumero, localizacao]);

  // Prompt customer identification when entering active session
  useEffect(() => {
    if (step === "active" && !currentCustomer && !isCheckingSession) {
      setShowCustomerModal(true);
    }
  }, [step, currentCustomer, isCheckingSession]);

  // Pre-fill form when modal opens for an already-identified customer
  useEffect(() => {
    if (showCustomerModal && currentCustomer) {
      setCustomerForm({
        display_name: currentCustomer.display_name || "",
        full_name: currentCustomer.full_name || "",
        email: currentCustomer.email || "",
        phone: currentCustomer.phone || "",
        birth_date: currentCustomer.birth_date || "",
        marketing_consent: currentCustomer.marketing_consent || false,
        preferred_contact: currentCustomer.preferred_contact || "email",
      });
    }
  }, [showCustomerModal, currentCustomer]);

  // Set active category when categories load (React Query handles fetching automatically)
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

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

      setSessionOrders(data as unknown as OrderWithProduct[]);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [session, supabase]);

  // Fetch orders when session becomes active
  useEffect(() => {
    if (step === "active" && session) {
      fetchSessionOrders();
    }
  }, [step, session, fetchSessionOrders]);

  // Fetch ratings stats for swipe game (table leader, user count)
  const fetchRatingsStats = useCallback(async () => {
    if (!session?.id) return;
    try {
      const params = new URLSearchParams({ sessionId: session.id });
      if (currentCustomer?.id)
        params.set("sessionCustomerId", currentCustomer.id);
      const res = await fetch(`/api/mesa/ratings?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setRatingsStats({
        tableLeader: data.tableLeader ?? null,
        userRatingCount: data.userRatingCount ?? 0,
        userRatedProductIds: data.userRatedProductIds ?? [],
        userRatedOrderIds: data.userRatedOrderIds ?? [],
        totalRatingsAtTable: data.totalRatingsAtTable ?? 0,
      });
    } catch (e) {
      console.error("Fetch ratings stats:", e);
    }
  }, [session?.id, currentCustomer?.id]);

  useEffect(() => {
    if (step === "active" && session?.id) {
      fetchRatingsStats();
    }
  }, [step, session?.id, fetchRatingsStats]);

  // Real-time subscription for order updates
  // Use session?.id in dependencies to prevent channel recreation when session properties change
  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId || step !== "active") return;

    const channel = supabase
      .channel(`orders-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === "UPDATE") {
            // Update the specific order in state
            setSessionOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id
                  ? { ...order, ...payload.new }
                  : order,
              ),
            );
          } else if (payload.eventType === "INSERT") {
            // Fetch the new order with product info
            const { data } = await supabase
              .from("orders")
              .select("*, product:products(*)")
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setSessionOrders((prev) => {
                // Prevent duplicates: check if order already exists
                const exists = prev.some((order) => order.id === data.id);
                if (exists) {
                  console.log(
                    `[DEBUG] Order ${data.id} already exists, skipping INSERT event`,
                  );
                  return prev;
                }
                return [data as unknown as OrderWithProduct, ...prev];
              });
            }
          } else if (payload.eventType === "DELETE") {
            setSessionOrders((prev) =>
              prev.filter((order) => order.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, step, supabase]);

  // Broadcast channel for cross-device order notifications (timer cleanup on unmount in hook)
  useOrderNotificationChannel({
    session,
    step,
    supabase: supabase as unknown as OrderNotificationSupabaseLike,
    t,
    fetchSessionOrders,
    setOrderNotification,
    channelRef:
      broadcastChannelRef as MutableRefObject<RealtimeChannelLike | null>,
    deviceId,
  });

  // Group orders by timestamp (rounded to minute)
  const groupedOrders: GroupedOrders[] = sessionOrders.reduce(
    (groups, order) => {
      const date = new Date(order.created_at);
      const timeKey = date.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const existingGroup = groups.find((g) => g.timestamp === timeKey);
      if (existingGroup) {
        existingGroup.orders.push(order);
      } else {
        groups.push({ timestamp: timeKey, orders: [order] });
      }
      return groups;
    },
    [] as GroupedOrders[],
  );

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
      // 1. Find table by number and location
      let foundTableId: string | null = null;

      const { data: tableData } = await supabase
        .from("tables")
        .select("id")
        .eq("number", parseInt(mesaNumero))
        .eq("location", localizacao)
        .eq("is_active", true)
        .single();

      if (tableData) {
        foundTableId = tableData.id;
      } else {
        // Fallback: search without location filter
        const { data: tableDataFallback, error: tableErrorFallback } =
          await supabase
            .from("tables")
            .select("id")
            .eq("number", parseInt(mesaNumero))
            .eq("is_active", true)
            .single();

        if (tableErrorFallback || !tableDataFallback) {
          throw new Error(t("mesa.errors.tableNotFound"));
        }
        foundTableId = tableDataFallback.id;
      }

      setTableId(foundTableId);

      // 2. Create session via API (handles table status + auto waiter assignment)
      const totalAmount =
        orderType === "rodizio" ? rodizioPrice * numPessoas : 0;

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: foundTableId,
          isRodizio: orderType === "rodizio",
          numPeople: numPessoas,
          totalAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("mesa.errors.startSession"));
      }

      setSession(result.session);

      // 3. Update waiter name if auto-assigned
      if (result.waiterName) {
        setWaiterName(result.waiterName);
      }

      setStep("active");
    } catch (err) {
      console.error("Error starting session:", err);
      setError(
        err instanceof Error ? err.message : t("mesa.errors.startSession"),
      );
    } finally {
      setIsStartingSession(false);
    }
  }, [
    orderType,
    mesaNumero,
    localizacao,
    numPessoas,
    rodizioPrice,
    supabase,
    t,
  ]);

  // Fetch session customers
  const fetchSessionCustomers = useCallback(
    async (sessionId: string) => {
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
    },
    [supabase],
  );

  // Load current customer from localStorage
  useEffect(() => {
    if (session?.id) {
      const storedCustomerId = localStorage.getItem(`customer_${session.id}`);
      if (storedCustomerId && sessionCustomers.length > 0) {
        const customer = sessionCustomers.find(
          (c) => c.id === storedCustomerId,
        );
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

  // Sync session_customer to loyalty program (customers table) so they appear in admin
  const syncToLoyaltyCustomer = useCallback(
    async (sessionCustomerId: string, emailTrim: string) => {
      const res = await fetch("/api/customers/from-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim,
          displayName: customerForm.display_name.trim(),
          fullName: customerForm.full_name.trim() || null,
          phone: customerForm.phone.trim() || null,
          birthDate: customerForm.birth_date || null,
          marketingConsent: customerForm.marketing_consent,
          sessionCustomerId,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("[mesa] sync to customers failed:", res.status, errBody);
        setError(
          t("mesa.errors.syncLoyalty") ||
            "Não foi possível sincronizar com o programa de fidelização. Verifique SUPABASE_SERVICE_ROLE_KEY no servidor.",
        );
        return null;
      }
      const { customerId } = (await res.json()) as { customerId: string };
      return customerId;
    },
    [customerForm, t],
  );

  // Send verification code
  const sendVerificationCode = useCallback(
    async (
      sessionCustomerId: string,
      type: "email" | "phone",
      contact: string,
    ) => {
      try {
        const response = await fetch("/api/verification/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionCustomerId,
            verificationType: type,
            contactValue: contact,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // If SMS is not configured, show friendly message
          if (response.status === 503 && type === "phone") {
            setError(
              "Verificação por SMS não está configurada. Use email por favor.",
            );
            return { success: false, error: "SMS not configured" };
          }
          throw new Error(data.error || "Failed to send verification code");
        }

        return { success: true, expiresAt: data.expiresAt };
      } catch (err) {
        console.error("Error sending verification:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [],
  );

  // Resend verification code
  const resendVerificationCode = useCallback(async () => {
    if (!verificationSessionCustomerId || !verificationContact) return;

    setIsResending(true);
    setVerificationError(null);

    const result = await sendVerificationCode(
      verificationSessionCustomerId,
      verificationType,
      verificationContact,
    );

    setIsResending(false);

    if (result.success) {
      setSuccessMessage("✅ Código reenviado com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setVerificationError(result.error || "Falha ao reenviar código");
    }
  }, [
    verificationSessionCustomerId,
    verificationType,
    verificationContact,
    sendVerificationCode,
  ]);

  // Verify the code
  const verifyCode = useCallback(async () => {
    if (!verificationSessionCustomerId || !verificationCode.trim()) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch("/api/verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCustomerId: verificationSessionCustomerId,
          token: verificationCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Update currentCustomer with verified status
      const verifiedField =
        verificationType === "email" ? "email_verified" : "phone_verified";

      setCurrentCustomer((prev) =>
        prev ? { ...prev, [verifiedField]: true } : prev,
      );

      setSessionCustomers((prev) =>
        prev.map((c) =>
          c.id === verificationSessionCustomerId
            ? { ...c, [verifiedField]: true }
            : c,
        ),
      );

      // Show success message
      const associatedCount = data.associatedCount || 0;
      if (associatedCount > 0) {
        setSuccessMessage(
          `✅ ${verificationType === "email" ? "Email" : "Telefone"} verificado! ${associatedCount} pessoa(s) na mesa também foram associadas.`,
        );
      } else {
        setSuccessMessage(
          `✅ ${verificationType === "email" ? "Email" : "Telefone"} verificado com sucesso!`,
        );
      }
      setTimeout(() => setSuccessMessage(null), 5000);

      // Close modal and reset
      setShowVerificationModal(false);
      setVerificationCode("");
      setVerificationSessionCustomerId(null);
    } catch (err) {
      console.error("Error verifying code:", err);
      setVerificationError(
        err instanceof Error ? err.message : "Código inválido ou expirado",
      );
    } finally {
      setIsVerifying(false);
    }
  }, [verificationSessionCustomerId, verificationCode, verificationType]);

  // Register customer (new person) or update existing session_customer (edit profile)
  const registerCustomer = useCallback(async () => {
    if (!session || !customerForm.display_name.trim()) return;

    setError(null);
    const extendedSupabase = supabase as unknown as {
      from: (table: string) => ReturnType<typeof supabase.from>;
    };
    const emailTrim = customerForm.email.trim();
    const phoneTrim = customerForm.phone.trim();
    const isEditingCurrent =
      currentCustomer &&
      customerForm.display_name.trim() === currentCustomer.display_name;

    // Check if email or phone is being added/changed
    const emailChanged =
      isEditingCurrent && emailTrim && emailTrim !== currentCustomer?.email;
    const phoneChanged =
      isEditingCurrent && phoneTrim && phoneTrim !== currentCustomer?.phone;
    const hasNewContact = !isEditingCurrent && (emailTrim || phoneTrim);

    try {
      if (isEditingCurrent && currentCustomer) {
        // Atualizar perfil do session_customer atual (ex.: adicionar email)
        const { data: updated, error: updateError } = await extendedSupabase
          .from("session_customers")
          .update({
            display_name: customerForm.display_name.trim(),
            full_name: customerForm.full_name.trim() || null,
            email: emailTrim || null,
            phone: phoneTrim || null,
            birth_date: customerForm.birth_date || null,
            marketing_consent: customerForm.marketing_consent,
            preferred_contact: customerForm.preferred_contact,
          })
          .eq("id", currentCustomer.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const updatedCustomer = updated as SessionCustomer;
        setSessionCustomers((prev) =>
          prev.map((c) => (c.id === currentCustomer.id ? updatedCustomer : c)),
        );
        setCurrentCustomer(updatedCustomer);

        // Send verification if email or phone was added/changed
        console.log("[DEBUG] Verification check:", {
          emailChanged,
          phoneChanged,
          emailTrim,
          phoneTrim,
          currentEmail: currentCustomer?.email,
          currentPhone: currentCustomer?.phone,
        });

        if (emailChanged || phoneChanged) {
          const type = emailChanged ? "email" : "phone";
          const contact = emailChanged ? emailTrim : phoneTrim;

          console.log("[DEBUG] Sending verification:", { type, contact });
          const result = await sendVerificationCode(
            currentCustomer.id,
            type,
            contact,
          );
          console.log("[DEBUG] Verification result:", result);

          if (result.success) {
            console.log("[DEBUG] Showing verification modal");
            setVerificationSessionCustomerId(currentCustomer.id);
            setVerificationType(type);
            setVerificationContact(contact);
            setShowCustomerModal(false);
            setShowVerificationModal(true);
            return;
          } else {
            // Even if verification fails, continue with normal flow
            console.error("Failed to send verification:", result.error);
          }
        }

        if (emailTrim) {
          const customerId = await syncToLoyaltyCustomer(
            currentCustomer.id,
            emailTrim,
          );
          if (customerId) {
            setSessionCustomers((prev) =>
              prev.map((c) =>
                c.id === currentCustomer.id
                  ? { ...c, customer_id: customerId }
                  : c,
              ),
            );
            setCurrentCustomer((prev) =>
              prev?.id === currentCustomer.id
                ? { ...prev, customer_id: customerId }
                : prev,
            );
            setSuccessMessage(
              t("mesa.success.profileSaved") ||
                "Perfil guardado. Aparecerá no painel Clientes.",
            );
          }
        } else {
          setSuccessMessage(
            t("mesa.success.profileSaved") || "Perfil guardado.",
          );
        }
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowCustomerModal(false);
        return;
      }

      // Inserir novo participante na sessão
      const customerData: SessionCustomerInsert = {
        session_id: session.id,
        display_name: customerForm.display_name.trim(),
        full_name: customerForm.full_name.trim() || null,
        email: emailTrim || null,
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
      setSessionCustomers((prev) => [...prev, newCustomer]);
      setCurrentCustomer(newCustomer);
      localStorage.setItem(`customer_${session.id}`, newCustomer.id);

      // Send verification if new customer has email or phone
      console.log("[DEBUG] New customer verification check:", {
        hasNewContact,
        emailTrim,
        phoneTrim,
      });

      if (hasNewContact) {
        const type = emailTrim ? "email" : "phone";
        const contact = emailTrim || phoneTrim;

        console.log("[DEBUG] Sending verification for new customer:", {
          type,
          contact,
        });
        const result = await sendVerificationCode(
          newCustomer.id,
          type,
          contact,
        );
        console.log("[DEBUG] New customer verification result:", result);

        if (result.success) {
          console.log("[DEBUG] Showing verification modal for new customer");
          setVerificationSessionCustomerId(newCustomer.id);
          setVerificationType(type);
          setVerificationContact(contact);

          // Clear form and close customer modal
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

          // Show verification modal
          setShowVerificationModal(true);
          return;
        } else {
          // Even if verification fails, continue with normal flow
          console.error("Failed to send verification:", result.error);
        }
      }

      if (emailTrim) {
        const customerId = await syncToLoyaltyCustomer(
          newCustomer.id,
          emailTrim,
        );
        if (customerId) {
          setSessionCustomers((prev) =>
            prev.map((c) =>
              c.id === newCustomer.id ? { ...c, customer_id: customerId } : c,
            ),
          );
          setCurrentCustomer((prev) =>
            prev?.id === newCustomer.id
              ? { ...prev, customer_id: customerId }
              : prev,
          );
        }
      }

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
      setError(t("mesa.errors.register"));
    }
  }, [
    session,
    customerForm,
    sessionCustomers.length,
    currentCustomer,
    supabase,
    t,
    syncToLoyaltyCustomer,
    sendVerificationCode,
  ]);

  // Select existing customer
  const selectCustomer = useCallback(
    (customer: SessionCustomer) => {
      if (session?.id) {
        setCurrentCustomer(customer);
        localStorage.setItem(`customer_${session.id}`, customer.id);
        setShowCustomerModal(false);
      }
    },
    [session?.id],
  );

  // Submit order
  const submitOrder = useCallback(async () => {
    // Prevent double-clicks and double submissions
    if (isSubmittingOrder || !session || cart.length === 0) return;

    setIsSubmittingOrder(true);
    setError(null);

    try {
      const ordersToInsert = CartService.buildOrderInserts(
        cart,
        session.id,
        currentCustomer?.id || null,
      );

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

      setSession((prev) => (prev ? { ...prev, total_amount: newTotal } : null));

      // Broadcast notification to other devices at this table
      const customerName = currentCustomer?.display_name;
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "order-submitted",
          payload: {
            customerName: customerName || "?",
            itemCount: cartItemsCount,
            deviceId, // Identify sender
          },
        });
      }

      clearCart();

      // Show success message
      setSuccessMessage(
        customerName
          ? `${customerName}, ${t("mesa.success.orderSent").toLowerCase()}`
          : t("mesa.success.orderSent"),
      );
      setTimeout(() => setSuccessMessage(null), 3000);

      setActiveTab("pedidos");
    } catch (err) {
      console.error("Error submitting order:", err);
      setError(t("mesa.errors.submitOrder"));
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [
    isSubmittingOrder,
    session,
    cart,
    cartTotal,
    cartItemsCount,
    clearCart,
    supabase,
    currentCustomer?.id,
    currentCustomer?.display_name,
    deviceId,
    t,
  ]);

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

      setSession((prev) =>
        prev ? { ...prev, status: "pending_payment" } : null,
      );
      setBillRequested(true);
      setShowBillModal(false);
      setSuccessMessage(t("mesa.success.billRequested"));
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Error requesting bill:", err);
      setError(t("mesa.errors.requestBill"));
    } finally {
      setIsRequestingBill(false);
    }
  }, [session, supabase, t]);

  // Call waiter function
  const callWaiter = useCallback(
    async (type: "assistance" | "bill" | "order" = "assistance") => {
      if (!tableId || isCallingWaiter) return;

      setIsCallingWaiter(true);

      try {
        // Create waiter call record
        const { error: insertError } = await (
          supabase as unknown as {
            from: (table: string) => ReturnType<typeof supabase.from>;
          }
        )
          .from("waiter_calls")
          .insert({
            table_id: tableId,
            session_id: session?.id || null,
            session_customer_id: currentCustomer?.id || null,
            call_type: type,
            location: localizacao,
            status: "pending",
          });

        if (insertError) throw insertError;

        setWaiterCallStatus("pending");
        setShowCallWaiterModal(false);

        const messages = {
          assistance: waiterName
            ? `${waiterName} ${t("mesa.success.staffCalled").toLowerCase()}`
            : t("mesa.success.staffCalled"),
          bill: t("mesa.success.billRequested"),
          order: t("mesa.success.staffCalledOrder"),
        };

        setSuccessMessage(messages[type]);
        setTimeout(() => setSuccessMessage(null), 5000);

        // Reset call status after 2 minutes
        setTimeout(() => {
          setWaiterCallStatus("idle");
        }, 120000);
      } catch (err) {
        console.error("Error calling waiter:", err);
        setError(t("mesa.errors.callStaff"));
      } finally {
        setIsCallingWaiter(false);
      }
    },
    [
      tableId,
      session,
      localizacao,
      waiterName,
      isCallingWaiter,
      supabase,
      t,
      currentCustomer?.id,
    ],
  );

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
            setSuccessMessage(
              waiterName
                ? `${waiterName} está a caminho!`
                : "O funcionário está a caminho!",
            );
            setTimeout(() => setSuccessMessage(null), 5000);
          } else if (payload.new.status === "completed") {
            setWaiterCallStatus("idle");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, waiterName, supabase]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-red-500/90 text-white px-4 py-3 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-2 font-bold text-xl"
          >
            ×
          </button>
        </div>
      )}

      {/* Order Notification Banner (from other devices) */}
      {orderNotification && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-blue-500/90 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-down">
          <span className="text-lg">🔔</span>
          <p className="text-sm flex-1">{orderNotification}</p>
          <button
            onClick={() => setOrderNotification(null)}
            className="text-white/70 hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-green-500/90 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-down">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Welcome Step */}
      {step === "welcome" && isCheckingSession && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
        </div>
      )}
      {step === "welcome" && !isCheckingSession && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
          {/* Language Switcher */}
          <div className="absolute top-4 right-4">
            <MesaLanguageSwitcher />
          </div>

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
                <span className="text-xs text-gray-500 uppercase">
                  {t("mesa.table")}
                </span>
                <span className="text-xl font-bold text-[#D4AF37]">
                  {mesaNumero}
                </span>
              </div>
            </div>
          </div>

          {/* Waiter Info Card */}
          {waiterName && (
            <div className="w-full max-w-sm mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#D4AF37]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">
                      {t("mesa.yourWaiter")}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {waiterName}
                    </p>
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
                  {waiterCallStatus === "pending"
                    ? t("mesa.status.pending") + "..."
                    : waiterCallStatus === "acknowledged"
                      ? "A caminho!"
                      : t("mesa.call")}
                </button>
              </div>
            </div>
          )}

          <div className="w-full max-w-sm mb-8">
            <p className="text-sm text-gray-400 text-center mb-4">
              {t("mesa.chooseMode")}
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
                      {isLunch ? t("mesa.lunch") : t("mesa.dinner")} •{" "}
                      {t("mesa.allYouCanEat")}
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
                    <p className="font-semibold text-lg">
                      {t("mesa.alaCarte")}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t("mesa.alaCarteDesc")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      {t("mesa.variedPrices")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="w-full max-w-sm mb-10">
            <p className="text-sm text-gray-400 text-center mb-4">
              {t("mesa.numPeople")}
            </p>
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
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("mesa.starting")}
              </span>
            ) : (
              t("mesa.startOrder")
            )}
          </button>

          {orderType === "rodizio" && (
            <p className="mt-4 text-sm text-gray-400">
              {t("mesa.estimatedTotal")}{" "}
              <span className="text-[#D4AF37] font-semibold">
                €{rodizioPrice * numPessoas}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Active Session - Tab Panels */}
      {step === "active" && (
        <div className="flex-1 flex flex-col bg-[#0D0D0D]">
          {/* Menu Tab */}
          {activeTab === "menu" && (
            <div className="flex-1 flex flex-col">
              {/* Fixed Header - Compact */}
              <div className="sticky top-0 z-20 bg-[#0D0D0D]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] font-bold">
                      #{mesaNumero}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      {orderType === "rodizio"
                        ? `Rodízio ${numPessoas}p`
                        : "À Carta"}
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
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="max-w-[60px] truncate">
                        {currentCustomer?.display_name || t("mesa.login")}
                      </span>
                    </button>
                  </div>
                </div>

                <div
                  ref={tabsRef}
                  className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-gray-800 categories"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => scrollToCategory(category.id)}
                      data-testid="category"
                      className={`category flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                        activeCategory === category.id
                          ? "bg-[#D4AF37] text-black font-semibold"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {category.icon && (
                        <span className="text-sm">{category.icon}</span>
                      )}
                      <span className="text-xs">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto pb-24" data-testid="menu">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-20">
                    <svg
                      className="animate-spin h-10 w-10 text-[#D4AF37]"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-gray-400 text-center py-20">
                    {t("mesa.menuUnavailable")}
                  </p>
                ) : (
                  <div className="px-4 py-4 products" data-testid="categories">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        ref={(el) => {
                          categoryRefs.current[category.id] = el;
                        }}
                        className="mb-8"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          {category.icon && (
                            <span className="text-2xl">{category.icon}</span>
                          )}
                          <h2 className="text-xl font-semibold text-[#D4AF37]">
                            {category.name}
                          </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {category.products.map((product) => {
                            const cartQty = getCartQuantity(product.id);
                            const isIncludedInRodizio =
                              orderType === "rodizio" && product.isRodizio;
                            const hasQuantity = cartQty > 0;

                            return (
                              <div
                                key={product.id}
                                className={`relative bg-gray-900 rounded-xl overflow-hidden border-2 transition-all ${
                                  hasQuantity
                                    ? "border-[#D4AF37]"
                                    : "border-transparent"
                                }`}
                              >
                                <div className="relative aspect-square bg-gray-800">
                                  {product.imageUrl ? (
                                    <Image
                                      src={product.imageUrl}
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

                                  {preparationTimes[product.id] && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                      <span>⏱️</span>
                                      <span>
                                        ~{preparationTimes[product.id]} min
                                      </span>
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between mt-2">
                                    <div>
                                      {orderType === "carta" && (
                                        <span className="text-[#D4AF37] font-bold">
                                          €{product.price.toFixed(2)}
                                        </span>
                                      )}
                                      {orderType === "rodizio" &&
                                        !product.isRodizio && (
                                          <span className="text-[#D4AF37] font-bold text-sm">
                                            +€{product.price.toFixed(2)}
                                          </span>
                                        )}
                                    </div>

                                    {hasQuantity ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() =>
                                            updateQuantity(
                                              product.id,
                                              cartQty - 1,
                                            )
                                          }
                                          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                                        >
                                          −
                                        </button>
                                        <span className="w-6 text-center font-semibold text-sm">
                                          {cartQty}
                                        </span>
                                        <button
                                          onClick={() =>
                                            addToCart(
                                              product,
                                              currentCustomer?.display_name ||
                                                "?",
                                            )
                                          }
                                          className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold hover:bg-[#C4A030] transition-colors"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          addToCart(
                                            product,
                                            currentCustomer?.display_name ||
                                              "?",
                                          )
                                        }
                                        className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black hover:bg-[#C4A030] transition-colors"
                                      >
                                        <svg
                                          className="w-5 h-5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M12 4v16m8-8H4"
                                          />
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
            </div>
          )}

          {/* Cart Tab */}
          {activeTab === "cart" && (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="sticky top-0 z-20 bg-[#0D0D0D] border-b border-gray-800">
                <div className="flex items-center justify-between px-4 py-3">
                  <h2 className="text-lg font-semibold">
                    {t("mesa.yourOrder")}
                  </h2>
                  <span className="text-sm text-gray-400">
                    {cartItemsCount} {t("mesa.review.itemsCount")}
                  </span>
                </div>
              </div>

              {/* Cooldown Banner */}
              {isCooldownActive && (
                <>
                  <div className="mx-4 mt-3 p-4 rounded-xl bg-gray-900 border border-gray-700 flex items-center gap-4">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="4"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke="#D4AF37"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress)}`}
                          className="transition-all duration-1000 ease-linear"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#D4AF37]">
                        {remainingFormatted}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t("mesa.cooldown.title")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t("mesa.cooldown.description")}
                      </p>
                    </div>
                  </div>

                  {/* Cooldown CTA: Incentivize profile completion and games */}
                  <div className="mx-4 mt-3 space-y-3">
                    <p className="text-sm font-semibold text-gray-300 px-1">
                      ⏱️ Enquanto esperas...
                    </p>

                    {/* Complete Profile CTA */}
                    {hasIncompleteProfile && (
                      <button
                        onClick={() => setShowCustomerModal(true)}
                        className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <svg
                              className="w-6 h-6 text-blue-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-blue-300">
                              ✨ Completa o teu perfil
                            </p>
                            <p className="text-xs text-blue-400/80 mt-0.5">
                              Adiciona email e data de nascimento para descontos
                              exclusivos!
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    )}

                    {/* Play Games CTA */}
                    {unratedItemsCount > 0 && (
                      <button
                        onClick={() => setActiveTab("jogos")}
                        className="w-full p-4 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/20 border border-[#D4AF37]/40 hover:border-[#D4AF37]/60 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <svg
                              className="w-6 h-6 text-[#D4AF37]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-[#D4AF37]">
                              🎮 Joga e ganha pontos!
                            </p>
                            <p className="text-xs text-amber-300/80 mt-0.5">
                              {unratedItemsCount}{" "}
                              {unratedItemsCount === 1
                                ? "item disponível"
                                : "items disponíveis"}{" "}
                              para avaliar
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-[#D4AF37] group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    )}

                    {/* Fallback: Just enjoy the moment if nothing to do */}
                    {!hasIncompleteProfile && unratedItemsCount === 0 && (
                      <div className="w-full p-4 rounded-xl bg-gray-900/50 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">☕</div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-300">
                              Relaxa e aproveita!
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              A tua próxima encomenda estará disponível em breve
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-4 pb-48">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-400 mb-2">{t("mesa.cartEmpty")}</p>
                    {/* Hide "Go to Menu" button during cooldown (can't add items anyway) */}
                    {!isCooldownActive && (
                      <button
                        onClick={() => setActiveTab("menu")}
                        className="text-[#D4AF37] text-sm font-medium"
                      >
                        {t("mesa.tabs.menu")} →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="bg-gray-900 rounded-xl p-4"
                      >
                        <div className="flex gap-3">
                          <div className="relative w-16 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                            {item.product.imageUrl ? (
                              <Image
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">
                                🍣
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-sm line-clamp-1">
                                  {item.product.name}
                                </h3>
                                {item.addedBy && (
                                  <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">
                                    {item.addedBy}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removeFromCart(item.productId)}
                                className="p-1 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                              <div>
                                {orderType === "rodizio" &&
                                item.product.isRodizio ? (
                                  <span className="text-green-500 text-xs">
                                    {t("mesa.included")}
                                  </span>
                                ) : (
                                  <span className="text-[#D4AF37] font-semibold text-sm">
                                    €
                                    {(
                                      item.product.price * item.quantity
                                    ).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 text-sm"
                                >
                                  −
                                </button>
                                <span className="w-5 text-center font-semibold text-sm">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="w-7 h-7 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#C4A030] text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="mt-2">
                              {editingNotes === item.productId ? (
                                <input
                                  type="text"
                                  placeholder={t("mesa.notePlaceholder")}
                                  defaultValue={item.notes || ""}
                                  className="w-full bg-gray-800 text-xs px-3 py-1.5 rounded-lg border border-gray-700 focus:border-[#D4AF37] focus:outline-none"
                                  onBlur={(e) => {
                                    updateNotes(item.productId, e.target.value);
                                    setEditingNotes(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateNotes(
                                        item.productId,
                                        e.currentTarget.value,
                                      );
                                      setEditingNotes(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() =>
                                    setEditingNotes(item.productId)
                                  }
                                  className="text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                  {item.notes ? (
                                    <span className="flex items-center gap-1">
                                      📝 {item.notes}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      + {t("mesa.addNote")}
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

              {/* Cart Footer - Totals + Review Button */}
              {cart.length > 0 && (
                <div
                  className="fixed bottom-16 left-0 right-0 z-30 bg-[#0D0D0D] border-t border-gray-800 px-4 py-3"
                  style={{
                    paddingBottom:
                      "calc(env(safe-area-inset-bottom) + 0.75rem)",
                  }}
                >
                  <div className="space-y-1 mb-3">
                    {orderType === "rodizio" && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>
                          {t("mesa.rodizioFor", { count: numPessoas })}
                        </span>
                        <span>€{(rodizioPrice * numPessoas).toFixed(2)}</span>
                      </div>
                    )}
                    {cartTotal > 0 && orderType === "rodizio" && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{t("mesa.extras")}</span>
                        <span>€{cartTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>{t("mesa.total")}</span>
                      <span className="text-[#D4AF37]">
                        €{finalTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openReview()}
                    disabled={isCooldownActive}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 ${
                      isCooldownActive
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[#D4AF37] text-black hover:bg-[#C4A030]"
                    }`}
                  >
                    {isCooldownActive ? (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {t("mesa.cooldown.waitMessage", {
                          time: remainingFormatted,
                        })}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        {t("mesa.review.reviewAndSend")}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pedidos Tab */}
          {activeTab === "pedidos" && (
            <div className="flex-1 flex flex-col">
              {/* Header - Compact */}
              <div className="sticky top-0 z-20 bg-[#0D0D0D] border-b border-gray-800">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] font-bold">
                      #{mesaNumero}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      {orderType === "rodizio"
                        ? `Rodízio ${numPessoas}p`
                        : "À Carta"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
                {isLoadingOrders ? (
                  <div className="flex items-center justify-center py-20">
                    <svg
                      className="animate-spin h-10 w-10 text-[#D4AF37]"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                ) : sessionOrders.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🍽️</div>
                    <p className="text-gray-400 mb-2">
                      {t("mesa.noOrdersYet")}
                    </p>
                    <button
                      onClick={() => setActiveTab("menu")}
                      className="text-[#D4AF37] font-semibold hover:underline"
                    >
                      {t("mesa.viewMenuLink")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedOrders.map((group, groupIndex) => (
                      <div key={groupIndex}>
                        {/* Time Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-sm text-gray-500 font-medium">
                            {group.timestamp}
                          </div>
                          <div className="flex-1 h-px bg-gray-800" />
                        </div>

                        {/* Orders in group */}
                        <div className="space-y-2">
                          {group.orders.map((order) => {
                            const statusConfig = STATUS_ICONS[order.status];
                            const statusLabel = t(
                              `mesa.status.${order.status}`,
                            );
                            const estimatedTime =
                              preparationTimes[order.product_id];

                            return (
                              <div
                                key={order.id}
                                className={`flex items-center justify-between p-4 rounded-xl bg-gray-900/50 ${
                                  order.status === "delivered"
                                    ? "opacity-60"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">
                                    {statusConfig.icon}
                                  </span>
                                  <div>
                                    <p className="font-medium">
                                      {order.quantity}×{" "}
                                      {order.product?.name || "Produto"}
                                    </p>
                                    {order.notes && (
                                      <p className="text-xs text-gray-500">
                                        📝 {order.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`text-sm font-medium ${statusConfig.color}`}
                                  >
                                    {statusLabel}
                                  </div>
                                  {estimatedTime &&
                                    order.status !== "delivered" && (
                                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                                        <span>⏱️</span>
                                        <span>~{estimatedTime} min</span>
                                      </p>
                                    )}
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
            </div>
          )}

          {/* Chamar Tab */}
          {activeTab === "chamar" && (
            <div className="flex-1 overflow-y-auto pb-24">
              <div className="px-4 py-6 flex flex-col items-center">
                {/* Waiter info card */}
                {waiterName && (
                  <div className="w-full max-w-sm mb-8">
                    <div className="flex items-center gap-4 p-5 bg-gray-900/50 rounded-2xl border border-gray-800">
                      <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-[#D4AF37]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">
                          {t("mesa.yourWaiter")}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {waiterName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status indicator when call is active */}
                {waiterCallStatus !== "idle" && (
                  <div
                    className={`w-full max-w-sm mb-6 p-5 rounded-2xl border-2 text-center ${
                      waiterCallStatus === "pending"
                        ? "border-yellow-500/30 bg-yellow-500/10"
                        : "border-green-500/30 bg-green-500/10"
                    }`}
                  >
                    <div
                      className={`text-4xl mb-3 ${waiterCallStatus === "pending" ? "animate-pulse" : ""}`}
                    >
                      {waiterCallStatus === "pending" ? "🔔" : "✅"}
                    </div>
                    <p
                      className={`text-lg font-semibold ${
                        waiterCallStatus === "pending"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {waiterCallStatus === "pending"
                        ? t("mesa.status.pending") + "..."
                        : "A caminho!"}
                    </p>
                  </div>
                )}

                {/* Call type buttons */}
                {waiterCallStatus === "idle" && (
                  <div className="w-full max-w-sm space-y-3">
                    <p className="text-sm text-gray-400 text-center mb-4">
                      {t("mesa.staffNotified")}
                    </p>

                    <button
                      onClick={() => callWaiter("assistance")}
                      disabled={isCallingWaiter}
                      className="w-full p-5 rounded-2xl border-2 border-gray-700 hover:border-[#D4AF37] transition-all text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">🙋</span>
                        <div>
                          <p className="font-semibold text-lg">
                            {t("mesa.needHelp")}
                          </p>
                          <p className="text-sm text-gray-400">
                            {t("mesa.generalAssistance")}
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => callWaiter("order")}
                      disabled={isCallingWaiter}
                      className="w-full p-5 rounded-2xl border-2 border-gray-700 hover:border-[#D4AF37] transition-all text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">📝</span>
                        <div>
                          <p className="font-semibold text-lg">
                            {t("mesa.orderHelp")}
                          </p>
                          <p className="text-sm text-gray-400">
                            {t("mesa.menuQuestions")}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conta Tab */}
          {activeTab === "conta" && (
            <div className="flex-1 overflow-y-auto pb-24">
              <div className="px-4 py-6">
                {/* Session total - hero card */}
                {session && (
                  <div className="bg-gray-900/50 rounded-2xl p-6 mb-6 border border-gray-800">
                    <p className="text-sm text-gray-400 mb-2">
                      {t("mesa.sessionTotal")}
                    </p>
                    <p className="text-4xl font-bold text-[#D4AF37]">
                      €{session.total_amount.toFixed(2)}
                    </p>
                    {orderType === "rodizio" && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">
                            {t("mesa.rodizioFor", { count: numPessoas })}
                          </span>
                          <span>€{(rodizioPrice * numPessoas).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Waiter info */}
                {waiterName && (
                  <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-xl border border-gray-800 mb-6">
                    <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[#D4AF37]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">
                        {t("mesa.yourWaiter")}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {waiterName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Request Bill Button */}
                <button
                  onClick={() => setShowBillModal(true)}
                  disabled={billRequested}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                    billRequested
                      ? "bg-green-500/20 text-green-500 border-2 border-green-500/30"
                      : "bg-[#D4AF37] text-black hover:bg-[#C4A030]"
                  }`}
                >
                  {billRequested ? (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {t("mesa.success.billRequested")}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      {t("mesa.requestBill")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Jogos Tab - Interactive games (includes Quiz, Preference, and Swipe Rating) */}
          {activeTab === "jogos" && session && (
            <GameHub
              sessionId={session.id}
              sessionCustomerId={currentCustomer?.id ?? null}
              restaurantId={restaurantId}
              gamesMode={gamesMode}
              orderItems={orderItemsForRating.filter(
                (item) =>
                  !ratingsStats.userRatedOrderIds.includes(item.orderId),
              )}
              tableLeader={ratingsStats.tableLeader}
              leaderProductName={
                ratingsStats.tableLeader
                  ? (products.find(
                      (p) =>
                        String(p.id) ===
                        String(ratingsStats.tableLeader!.productId),
                    )?.name ?? null)
                  : null
              }
              userRatingCount={ratingsStats.userRatingCount}
              totalRatingsAtTable={ratingsStats.totalRatingsAtTable}
              onRated={fetchRatingsStats}
              onClose={() => setActiveTab("menu")}
              t={t}
            />
          )}

          {/* Bottom Tab Bar */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D] border-t border-gray-800"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-around h-16">
              <button
                onClick={() => setActiveTab("menu")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  activeTab === "menu" ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
                <span className="text-[10px] font-medium">
                  {t("mesa.tabs.menu")}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("cart")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  activeTab === "cart" ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              >
                <div className="relative">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  {cartItemsCount > 0 && (
                    <div className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-[#D4AF37] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-black leading-none">
                        {cartItemsCount}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium">
                  {t("mesa.tabs.cart")}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("pedidos")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  activeTab === "pedidos" ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="text-[10px] font-medium">
                  {t("mesa.tabs.orders")}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("chamar")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  activeTab === "chamar" ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              >
                <div className="relative">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {waiterCallStatus !== "idle" && (
                    <div
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
                        waiterCallStatus === "pending"
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-green-500"
                      }`}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">
                  {t("mesa.tabs.callStaff")}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("jogos")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  activeTab === "jogos" ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-[10px] font-medium">
                  {t("mesa.tabs.games")}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("conta")}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  activeTab === "conta" ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                  />
                </svg>
                <span className="text-[10px] font-medium">
                  {t("mesa.tabs.bill")}
                </span>
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
            <h3 className="text-xl font-semibold mb-2">
              {t("mesa.requestBill")}
            </h3>
            <p className="text-gray-400 mb-6">{t("mesa.confirmBill")}</p>

            {session && (
              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t("mesa.totalToPay")}</span>
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
                {t("mesa.cancel")}
              </button>
              <button
                onClick={requestBill}
                disabled={isRequestingBill}
                className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRequestingBill ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  t("mesa.confirm")
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
            <h3 className="text-xl font-semibold mb-2">
              {t("mesa.callStaff")}
            </h3>
            <p className="text-gray-400 mb-6">
              {waiterName
                ? `${waiterName} ${t("mesa.staffNotified").toLowerCase()}`
                : t("mesa.staffNotified")}
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
                    <p className="font-semibold">{t("mesa.needHelp")}</p>
                    <p className="text-sm text-gray-400">
                      {t("mesa.generalAssistance")}
                    </p>
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
                    <p className="font-semibold">{t("mesa.orderHelp")}</p>
                    <p className="text-sm text-gray-400">
                      {t("mesa.menuQuestions")}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCallWaiterModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors"
              >
                {t("mesa.cancel")}
              </button>
              <button
                onClick={() => callWaiter(callType)}
                disabled={isCallingWaiter}
                className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCallingWaiter ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  t("mesa.call")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Order Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => closeReview()}
          />

          <div className="relative bg-[#1A1A1A] rounded-t-2xl w-full max-h-[90vh] flex flex-col animate-slide-up">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <h2 className="text-lg font-semibold">
                {t("mesa.review.title")}
              </h2>
              <button
                onClick={() => closeReview()}
                className="p-2 -mr-2 text-gray-400 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Anti-waste policy banner */}
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-3">
                  <p className="text-amber-200 text-xs leading-relaxed">
                    ⚠️ {t("mesa.review.wastePolicy")}
                  </p>
                </div>

                {/* Duplicate alerts - must be confirmed before submitting */}
                {duplicateItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                      {t("mesa.review.duplicatesFound")}
                    </p>
                    {duplicateItems.map((item) => {
                      const existing = duplicateMap.get(item.productId)!;
                      const isConfirmed = confirmedDuplicates.has(
                        item.productId,
                      );
                      return (
                        <div
                          key={`dup-${item.productId}`}
                          className={`rounded-xl border p-3 transition-all ${isConfirmed ? "border-green-700/50 bg-green-900/20" : "border-amber-600/50 bg-amber-900/20"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                              {item.product.imageUrl ? (
                                <Image
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm">
                                  🍣
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-amber-300 mt-0.5">
                                {t("mesa.review.alreadyOrdered", {
                                  qty: existing.totalQty,
                                })}{" "}
                                +{" "}
                                {t("mesa.review.newQty", {
                                  qty: item.quantity,
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2.5">
                            {isConfirmed ? (
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-xs text-green-400 flex items-center gap-1 flex-1">
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  {t("mesa.review.confirmed")}
                                </span>
                                <button
                                  onClick={() =>
                                    undoConfirmDuplicate(item.productId)
                                  }
                                  className="text-[10px] text-gray-400 hover:text-white underline"
                                >
                                  {t("mesa.review.undo")}
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    confirmDuplicate(item.productId)
                                  }
                                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-amber-600/30 text-amber-200 hover:bg-amber-600/50 transition-colors"
                                >
                                  {t("mesa.review.keepAll", {
                                    qty: existing.totalQty + item.quantity,
                                  })}
                                </button>
                                <button
                                  onClick={() => removeFromCart(item.productId)}
                                  className="py-1.5 px-3 text-xs font-semibold rounded-lg border border-gray-600 text-gray-300 hover:border-gray-500 transition-colors"
                                >
                                  {t("mesa.review.remove")}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Items grouped by person */}
                {Object.entries(CartService.groupByPerson(cart)).map(
                  ([person, items]) => (
                    <div key={person}>
                      <p className="text-xs text-gray-400 mb-2 font-medium">
                        {t("mesa.review.groupedBy", { name: person })} (
                        {items.length})
                      </p>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const isDuplicate = duplicateMap.has(item.productId);
                          return (
                            <div
                              key={item.productId}
                              className={`flex items-center gap-3 rounded-lg p-2.5 ${isDuplicate ? "bg-amber-900/10 border border-amber-800/30" : "bg-gray-900/50"}`}
                            >
                              <div className="relative w-10 h-10 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                {item.product.imageUrl ? (
                                  <Image
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm">
                                    🍣
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium line-clamp-1">
                                    {item.product.name}
                                  </span>
                                  {isDuplicate && (
                                    <span className="text-[10px] bg-amber-600/30 text-amber-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                      {t("mesa.review.duplicateWarning")}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  x{item.quantity}
                                </span>
                              </div>
                              <div className="text-sm text-right flex-shrink-0">
                                {orderType === "rodizio" &&
                                item.product.isRodizio ? (
                                  <span className="text-green-500 text-xs">
                                    {t("mesa.included")}
                                  </span>
                                ) : (
                                  <span className="text-[#D4AF37] font-medium">
                                    €
                                    {(
                                      item.product.price * item.quantity
                                    ).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}

                {/* Totals */}
                <div className="border-t border-gray-800 pt-3 space-y-1">
                  {orderType === "rodizio" && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{t("mesa.rodizioFor", { count: numPessoas })}</span>
                      <span>€{(rodizioPrice * numPessoas).toFixed(2)}</span>
                    </div>
                  )}
                  {cartTotal > 0 && orderType === "rodizio" && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{t("mesa.extras")}</span>
                      <span>€{cartTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1">
                    <span>{t("mesa.total")}</span>
                    <span className="text-[#D4AF37]">
                      €{finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div
                className="border-t border-gray-800 px-5 py-4 space-y-3"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                }}
              >
                {hasUnconfirmedDuplicates && (
                  <p className="text-xs text-amber-400 text-center">
                    {t("mesa.review.confirmDuplicatesFirst")}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => closeReview()}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-700 text-gray-300 font-semibold hover:border-gray-600 transition-colors"
                  >
                    {t("mesa.review.cancel")}
                  </button>
                  <button
                    onClick={() => {
                      closeReview();
                      submitOrder();
                    }}
                    disabled={
                      isSubmittingOrder ||
                      hasUnconfirmedDuplicates ||
                      isCooldownActive
                    }
                    className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-bold hover:bg-[#C4A030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingOrder ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        {t("mesa.review.sendToKitchen")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
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
                <h3 className="text-xl font-semibold">{t("mesa.identify")}</h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-white"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {t("mesa.customizeExperience")}
              </p>
            </div>

            <div className="p-6">
              {/* Registration Form */}
              <div className="space-y-4">
                {/* Display Name - Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t("mesa.howToAddress")}
                  </label>
                  <input
                    type="text"
                    value={customerForm.display_name}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({
                        ...prev,
                        display_name: e.target.value,
                      }))
                    }
                    placeholder={t("mesa.namePlaceholder")}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-[#D4AF37] focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {/* Incentive Message - Only show if no additional data has been provided */}
                {!currentCustomer?.email &&
                  !currentCustomer?.phone &&
                  !currentCustomer?.birth_date && (
                    <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🎁</span>
                        <div>
                          <p className="text-sm font-medium text-[#D4AF37]">
                            {t("mesa.exclusiveBenefits")}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {t("mesa.benefitsDesc")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Incomplete profile reminder - Show if some data is filled but not all */}
                {currentCustomer &&
                  (currentCustomer.email ||
                    currentCustomer.phone ||
                    currentCustomer.birth_date) &&
                  hasIncompleteProfile && (
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">ℹ️</span>
                        <div>
                          <p className="text-sm font-medium text-blue-300">
                            Complete o seu perfil
                          </p>
                          <p className="text-xs text-blue-400/80 mt-1">
                            Adicione os dados em falta para desbloquear todos os
                            benefícios
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Optional Fields - Collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer py-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <span>{t("mesa.additionalData")}</span>
                    <svg
                      className="w-5 h-5 transform group-open:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>

                  <div className="space-y-4 pt-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-2">
                        {t("mesa.email")}
                        {currentCustomer?.email_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Verificado
                          </span>
                        )}
                      </label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) =>
                          setCustomerForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder={t("mesa.emailPlaceholder")}
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-2">
                        {t("mesa.phone")}
                        {currentCustomer?.phone_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Verificado
                          </span>
                        )}
                      </label>
                      <input
                        type="tel"
                        value={customerForm.phone}
                        onChange={(e) =>
                          setCustomerForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder={t("mesa.phonePlaceholder")}
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                      <p className="text-xs text-amber-500/70 mt-1 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verificação por SMS requer configuração. Use email.
                      </p>
                    </div>

                    {/* Birth Date */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        {t("mesa.birthDate")}
                      </label>
                      <input
                        type="date"
                        value={customerForm.birth_date}
                        onChange={(e) =>
                          setCustomerForm((prev) => ({
                            ...prev,
                            birth_date: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t("mesa.birthdaySurprise")}
                      </p>
                    </div>

                    {/* Preferred Contact */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        {t("mesa.preferredContact")}
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "email", label: "Email" },
                          { value: "phone", label: "Telemóvel" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setCustomerForm((prev) => ({
                                ...prev,
                                preferred_contact: option.value as
                                  | "email"
                                  | "phone",
                              }))
                            }
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
                          onChange={(e) =>
                            setCustomerForm((prev) => ({
                              ...prev,
                              marketing_consent: e.target.checked,
                            }))
                          }
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            customerForm.marketing_consent
                              ? "bg-[#D4AF37] border-[#D4AF37]"
                              : "border-gray-600 group-hover:border-gray-500"
                          }`}
                        >
                          {customerForm.marketing_consent && (
                            <svg
                              className="w-3 h-3 text-black"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">
                        {t("mesa.receivePromotions")}
                      </span>
                    </label>
                  </div>
                </details>
              </div>

              {/* Submit Button - Smart single button */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    // Check if there are changes
                    const hasChanges =
                      currentCustomer &&
                      (customerForm.display_name.trim() !==
                        currentCustomer.display_name ||
                        customerForm.email.trim() !==
                          (currentCustomer.email || "") ||
                        customerForm.phone.trim() !==
                          (currentCustomer.phone || "") ||
                        customerForm.birth_date !==
                          (currentCustomer.birth_date || "") ||
                        customerForm.marketing_consent !==
                          (currentCustomer.marketing_consent || false) ||
                        customerForm.preferred_contact !==
                          (currentCustomer.preferred_contact || "email"));

                    if (hasChanges || !currentCustomer) {
                      // Save changes or register new customer
                      registerCustomer();
                    } else {
                      // No changes, just close modal
                      setShowCustomerModal(false);
                    }
                  }}
                  disabled={!customerForm.display_name.trim()}
                  className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(() => {
                    // Smart button text based on context
                    if (!currentCustomer) {
                      return sessionCustomers.length === 0
                        ? t("mesa.startOrdering")
                        : t("mesa.addPerson");
                    }

                    // Check if editing current customer
                    const hasChanges =
                      customerForm.display_name.trim() !==
                        currentCustomer.display_name ||
                      customerForm.email.trim() !==
                        (currentCustomer.email || "") ||
                      customerForm.phone.trim() !==
                        (currentCustomer.phone || "") ||
                      customerForm.birth_date !==
                        (currentCustomer.birth_date || "") ||
                      customerForm.marketing_consent !==
                        (currentCustomer.marketing_consent || false) ||
                      customerForm.preferred_contact !==
                        (currentCustomer.preferred_contact || "email");

                    return hasChanges
                      ? t("mesa.saveChanges") || "Guardar Alterações"
                      : t("mesa.continue") || "Continuar";
                  })()}
                </button>
              </div>

              {/* Active customers in session - Moved to bottom with less importance */}
              {sessionCustomers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-800/50">
                  <p className="text-xs text-gray-500 mb-2.5 uppercase tracking-wide">
                    {t("mesa.atTable")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sessionCustomers.map((customer) => (
                      <span
                        key={customer.id}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          currentCustomer?.id === customer.id
                            ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                            : "bg-gray-800/50 text-gray-400"
                        }`}
                      >
                        {customer.display_name}
                        {customer.is_session_host && (
                          <span className="ml-1 opacity-70">
                            {t("mesa.host")}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification Code Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop - no onClick to prevent accidental dismissal */}
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full border border-gray-800 animate-scale-up">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Verificar {verificationType === "email" ? "Email" : "Telefone"}
              </h3>
              <p className="text-sm text-gray-400">
                Enviámos um código de 6 dígitos para:
              </p>
              <p className="text-base text-[#D4AF37] font-semibold mt-1">
                {verificationContact}
              </p>
            </div>

            {/* Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Código de Verificação
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setVerificationCode(value);
                  setVerificationError(null);
                }}
                placeholder="000000"
                className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-[#D4AF37] transition-colors"
                autoFocus
              />
              {verificationError && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {verificationError}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationCode("");
                  setVerificationError(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                disabled={isVerifying}
              >
                Cancelar
              </button>
              <button
                onClick={verifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className="flex-1 px-4 py-3 bg-[#D4AF37] text-black rounded-xl font-semibold hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    A verificar...
                  </>
                ) : (
                  "Verificar"
                )}
              </button>
            </div>

            {/* Help Text & Resend */}
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-500 text-center">
                Não recebeu o código? Verifique a pasta de spam.
              </p>
              <button
                onClick={resendVerificationCode}
                disabled={isResending || isVerifying}
                className="w-full text-sm text-[#D4AF37] hover:text-[#C4A030] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? "A reenviar..." : "📧 Reenviar Código"}
              </button>
              <p className="text-xs text-gray-600 text-center italic">
                Para fechar esta janela, clique em &quot;Cancelar&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes scale-up {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
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
    </main>
  );
}
