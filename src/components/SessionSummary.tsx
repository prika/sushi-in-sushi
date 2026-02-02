"use client";

import type { SessionStatus, OrderStatus } from "@/types/database";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: OrderStatus;
  products?: { name: string } | null;
}

interface SessionData {
  id: string;
  status: SessionStatus;
  is_rodizio: boolean;
  num_people: number;
  created_at: string;
  closed_at?: string | null;
  total_amount: number;
  tables?: { number: number } | null;
  orders?: OrderItem[];
}

interface SessionSummaryProps {
  session: SessionData;
  variant?: "compact" | "expanded";
  showOrders?: boolean;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  active: "Ativa",
  pending_payment: "Conta Pedida",
  paid: "Paga",
  closed: "Fechada",
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  active: "text-green-600 bg-green-100",
  pending_payment: "text-yellow-600 bg-yellow-100",
  paid: "text-blue-600 bg-blue-100",
  closed: "text-gray-600 bg-gray-100",
};

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMins = Math.floor((end.getTime() - start.getTime()) / 60000);

  if (diffMins < 60) return `${diffMins}min`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}min`;
}

export function SessionSummary({
  session,
  variant = "compact",
  showOrders = false,
}: SessionSummaryProps) {
  const totalItems = session.orders?.reduce((sum, o) => sum + o.quantity, 0) || 0;
  const calculatedTotal = session.orders?.reduce(
    (sum, o) => sum + o.quantity * (o.unit_price || 0),
    0
  ) || session.total_amount;

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          {/* Table Number */}
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold text-gray-700">
              {session.tables?.number || "?"}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                Mesa {session.tables?.number}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[session.status]}`}>
                {STATUS_LABELS[session.status]}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span>{session.is_rodizio ? "Rodízio" : "À la Carte"}</span>
              <span>•</span>
              <span>{session.num_people} pessoas</span>
              <span>•</span>
              <span>{formatTime(session.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-[#D4AF37]">
            {calculatedTotal.toFixed(2)}€
          </div>
          <div className="text-sm text-gray-500">{totalItems} items</div>
        </div>
      </div>
    );
  }

  // Expanded variant
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-[#D4AF37]">
                {session.tables?.number || "?"}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mesa {session.tables?.number}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[session.status]}`}>
                {STATUS_LABELS[session.status]}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-[#D4AF37]">
              {calculatedTotal.toFixed(2)}€
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-gray-500">Tipo</div>
          <div className="font-medium">{session.is_rodizio ? "Rodízio" : "À la Carte"}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Pessoas</div>
          <div className="font-medium">{session.num_people}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Início</div>
          <div className="font-medium">{formatTime(session.created_at)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Duração</div>
          <div className="font-medium">{formatDuration(session.created_at, session.closed_at)}</div>
        </div>
      </div>

      {/* Orders List */}
      {showOrders && session.orders && session.orders.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="p-4">
            <h4 className="font-medium text-gray-700 mb-3">Pedidos ({totalItems} items)</h4>
            <div className="space-y-2">
              {session.orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {order.quantity}x {order.products?.name || "Produto"}
                    </span>
                    <OrderStatusDot status={order.status} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {(order.quantity * (order.unit_price || 0)).toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderStatusDot({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = {
    pending: "bg-yellow-500",
    preparing: "bg-orange-500",
    ready: "bg-green-500",
    delivered: "bg-gray-400",
    cancelled: "bg-red-500",
  };

  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}
