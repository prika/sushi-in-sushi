"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Modal, Badge } from "@/components/ui";
import { useActivityLog } from "@/presentation/hooks";
import type { SessionStatus } from "@/types/database";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  notes: string | null;
  created_at: string;
  products?: { name: string } | null;
}

interface Session {
  id: string;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
  tables?: { number: number } | null;
  orders?: OrderItem[];
}

type FilterStatus = "all" | SessionStatus;

export default function SessoesPage() {
  const { logActivity } = useActivityLog();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  const fetchSessions = useCallback(async () => {
    const supabase = createClient();

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = supabase
      .from("sessions")
      .select(`
        *,
        tables (number),
        orders (*, products(name))
      `)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;

    if (!error && data) {
      setSessions(data as Session[]);
    }

    setIsLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    fetchSessions();

    // Set up real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchSessions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  const handleCloseSession = async () => {
    if (!selectedSession) return;

    setClosingSession(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", selectedSession.id);

    if (!error) {
      // Log activity when session is closed
      await logActivity("session_closed", "session", selectedSession.id, {
        tableNumber: selectedSession.tables?.number,
        totalAmount: calculateSessionTotal(selectedSession),
        orderCount: selectedSession.orders?.length || 0,
      });

      fetchSessions();
    }

    setClosingSession(false);
    setShowCloseModal(false);
    setSelectedSession(null);
  };

  const calculateSessionTotal = (session: Session) => {
    if (!session.orders) return 0;
    return session.orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, order) => sum + order.quantity * (order.unit_price || 0), 0);
  };

  const getStatusBadge = (status: SessionStatus): "pending" | "preparing" | "ready" | "delivered" | "cancelled" => {
    const mapping: Record<SessionStatus, "pending" | "preparing" | "ready" | "delivered" | "cancelled"> = {
      active: "preparing",
      pending_payment: "ready",
      paid: "delivered",
      closed: "delivered",
    };
    return mapping[status] || "pending";
  };

  const filterButtons: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "active", label: "Ativas" },
    { value: "pending_payment", label: "Conta Pedida" },
    { value: "closed", label: "Fechadas" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilterStatus(btn.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === btn.value
                ? "bg-[#D4AF37] text-black"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card variant="light">
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">Nenhuma sessão encontrada</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const total = calculateSessionTotal(session);
            const orderCount = session.orders?.length || 0;
            const deliveredCount = session.orders?.filter((o) => o.status === "delivered").length || 0;

            return (
              <Card key={session.id} variant="light">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Session Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-700">
                        {session.tables?.number || "?"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          Mesa {session.tables?.number}
                        </h3>
                        <Badge status={getStatusBadge(session.status)} />
                      </div>
                      <p className="text-sm text-gray-500">
                        Início:{" "}
                        {new Date(session.created_at).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {session.closed_at && (
                          <>
                            {" "}
                            • Fim:{" "}
                            {new Date(session.closed_at).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Orders Summary */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
                      <p className="text-xs text-gray-500">Pedidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
                      <p className="text-xs text-gray-500">Entregues</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#D4AF37]">{total.toFixed(2)}€</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                    >
                      Ver Detalhes
                    </Button>
                    {session.status !== "closed" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setShowCloseModal(true);
                        }}
                      >
                        Fechar Sessão
                      </Button>
                    )}
                  </div>
                </div>

                {/* Orders List (Expandable) */}
                {selectedSession?.id === session.id && !showCloseModal && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-3">Pedidos</h4>
                    {session.orders && session.orders.length > 0 ? (
                      <div className="space-y-2">
                        {session.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <OrderStatusBadge status={order.status} />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {order.quantity}x {order.products?.name || "Produto"}
                                </p>
                                {order.notes && (
                                  <p className="text-xs text-gray-500">
                                    Nota: {order.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {(order.quantity * (order.unit_price || 0)).toFixed(2)}€
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.created_at).toLocaleTimeString("pt-PT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Nenhum pedido nesta sessão</p>
                    )}
                    <button
                      onClick={() => setSelectedSession(null)}
                      className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Fechar detalhes
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Close Session Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => {
          setShowCloseModal(false);
          setSelectedSession(null);
        }}
        title="Fechar Sessão"
      >
        {selectedSession && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Tem a certeza que deseja fechar a sessão da Mesa{" "}
              <strong>{selectedSession.tables?.number}</strong>?
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total de pedidos:</span>
                <span className="font-medium">{selectedSession.orders?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor total:</span>
                <span className="font-bold text-[#D4AF37]">
                  {calculateSessionTotal(selectedSession).toFixed(2)}€
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCloseModal(false);
                  setSelectedSession(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCloseSession}
                isLoading={closingSession}
              >
                Confirmar Fecho
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendente" },
    preparing: { bg: "bg-orange-100", text: "text-orange-700", label: "A Preparar" },
    ready: { bg: "bg-blue-100", text: "text-blue-700", label: "Pronto para servir" },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Entregue" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelado" },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
