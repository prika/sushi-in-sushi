"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireWaiter } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import type { Table, Session, OrderWithProduct, Product, Category } from "@/types/database";

interface TableWithDetails extends Table {
  activeSession?: Session | null;
  orders?: OrderWithProduct[];
}

export default function WaiterMesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useRequireWaiter();
  const router = useRouter();
  const { logActivity } = useActivityLog();
  const [table, setTable] = useState<TableWithDetails | null>(null);
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const supabase = createClient();

      // Verify access to this table
      if (user.role === "waiter") {
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
      }

      // Fetch table details
      const { data: tableData } = await supabase
        .from("tables")
        .select("*")
        .eq("id", id)
        .single();

      if (!tableData) {
        router.push("/waiter");
        return;
      }

      // Fetch active session
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("table_id", id)
        .eq("status", "active")
        .single();

      setTable({
        ...tableData,
        activeSession: sessionData || null,
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

        setOrders((ordersData || []) as OrderWithProduct[]);
      }

      // Fetch products and categories for adding orders
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("sort_order");

      setCategories(categoriesData || []);
      setProducts(productsData || []);
      setIsLoading(false);
    };

    fetchData();

    // Set up real-time subscription for orders
    const supabase = createClient();
    const subscription = supabase
      .channel(`waiter-orders-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, id, router]);

  const handleStartSession = async (isRodizio: boolean, numPeople: number) => {
    if (!table) return;

    const supabase = createClient();
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        table_id: table.id,
        is_rodizio: isRodizio,
        num_people: numPeople,
        status: "active",
      })
      .select()
      .single();

    if (!error && session) {
      setTable({ ...table, activeSession: session });
    }
  };

  const handleAddOrder = async (product: Product) => {
    if (!table?.activeSession) return;

    const supabase = createClient();
    await supabase.from("orders").insert({
      session_id: table.activeSession.id,
      product_id: product.id,
      quantity: quantity,
      unit_price: product.price,
      notes: orderNote || null,
      status: "pending",
    });

    setOrderNote("");
    setQuantity(1);
    setShowAddOrder(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const supabase = createClient();
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
  };

  const handleCloseSession = async () => {
    if (!table?.activeSession) return;

    const supabase = createClient();
    await supabase
      .from("sessions")
      .update({ status: "pending_payment" })
      .eq("id", table.activeSession.id);
  };

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

  const totalAmount = orders.reduce(
    (sum, order) => sum + order.unit_price * order.quantity,
    0
  );

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/waiter"
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">
                Mesa #{table.number}
              </h1>
              <p className="text-sm text-gray-400">{table.name}</p>
            </div>
          </div>

          {table.activeSession && (
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 text-sm bg-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                {table.activeSession.num_people} pessoas
              </span>
              {table.activeSession.is_rodizio && (
                <span className="px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-full">
                  Rodízio
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* No Active Session */}
        {!table.activeSession && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🪑</div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Mesa Disponível
            </h2>
            <p className="text-gray-400 mb-8">
              Inicie uma nova sessão para começar a receber pedidos.
            </p>

            <div className="max-w-md mx-auto space-y-4">
              <button
                onClick={() => handleStartSession(false, 2)}
                className="w-full py-4 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#C4A030] transition-colors"
              >
                Iniciar Sessão Normal
              </button>
              <button
                onClick={() => handleStartSession(true, 2)}
                className="w-full py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
              >
                Iniciar Rodízio
              </button>
            </div>
          </div>
        )}

        {/* Active Session */}
        {table.activeSession && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Orders List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Add Order Button */}
              <button
                onClick={() => setShowAddOrder(true)}
                className="w-full py-4 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#C4A030] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Pedido
              </button>

              {/* Orders by Status */}
              {pendingOrders.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full" />
                    Pendentes ({pendingOrders.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleUpdateOrderStatus}
                      />
                    ))}
                  </div>
                </section>
              )}

              {preparingOrders.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full" />
                    Em Preparação ({preparingOrders.length})
                  </h3>
                  <div className="space-y-2">
                    {preparingOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleUpdateOrderStatus}
                      />
                    ))}
                  </div>
                </section>
              )}

              {readyOrders.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Pronto para Entregar ({readyOrders.length})
                  </h3>
                  <div className="space-y-2">
                    {readyOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleUpdateOrderStatus}
                      />
                    ))}
                  </div>
                </section>
              )}

              {deliveredOrders.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-500 rounded-full" />
                    Entregues ({deliveredOrders.length})
                  </h3>
                  <div className="space-y-2">
                    {deliveredOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleUpdateOrderStatus}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 sticky top-24">
                <h3 className="text-lg font-semibold text-white mb-4">Resumo</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Pedidos</span>
                    <span>{orders.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Pessoas</span>
                    <span>{table.activeSession.num_people}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tipo</span>
                    <span>{table.activeSession.is_rodizio ? "Rodízio" : "Normal"}</span>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 mb-6">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-[#D4AF37]">
                      {totalAmount.toFixed(2)}€
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCloseSession}
                  className="w-full py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-colors"
                >
                  Fechar Sessão
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Order Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end lg:items-center justify-center">
          <div className="bg-[#1a1a1a] w-full lg:max-w-2xl lg:rounded-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Adicionar Pedido</h2>
              <button
                onClick={() => setShowAddOrder(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    !selectedCategory
                      ? "bg-[#D4AF37] text-black"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-[#D4AF37] text-black"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products
                  .filter((p) => !selectedCategory || p.category_id === selectedCategory)
                  .map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddOrder(product)}
                      className="bg-gray-800 rounded-xl p-4 text-left hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-white">{product.name}</span>
                        <span className="text-[#D4AF37] font-semibold">
                          {product.price.toFixed(2)}€
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({
  order,
  onStatusChange,
}: {
  order: OrderWithProduct;
  onStatusChange: (orderId: string, status: string) => void;
}) {
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
    ready: "Pronto",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  const nextStatus: Record<string, string | null> = {
    pending: null, // Kitchen handles this
    preparing: null, // Kitchen handles this
    ready: "delivered",
    delivered: null,
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
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
        <span className="text-[#D4AF37] font-semibold">
          {(order.unit_price * order.quantity).toFixed(2)}€
        </span>

        {nextStatus[order.status] && (
          <button
            onClick={() => onStatusChange(order.id, nextStatus[order.status]!)}
            className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            Marcar como {statusLabels[nextStatus[order.status]!]}
          </button>
        )}
      </div>
    </div>
  );
}
