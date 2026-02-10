"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocations } from "@/presentation/hooks";
import { CustomerTierService } from "@/domain/services/CustomerTierService";
import type { CustomerTier } from "@/domain/value-objects/CustomerTier";

interface CustomerHistoryReservation {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  location: string;
  status: string;
  tableNumber: number | null;
  tableName: string | null;
  isRodizio: boolean;
  specialRequests: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  sessionId: string | null;
  seatedAt: string | null;
  createdAt: string;
}

interface CustomerHistoryVisit {
  sessionId: string;
  startedAt: string;
  closedAt: string | null;
  totalAmount: number;
  status: string;
  tableNumber: number;
  tableName: string;
  location: string;
  isRodizio: boolean;
  numPeople: number;
}

interface CustomerHistoryOrder {
  id: string;
  sessionId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  createdAt: string;
}

const TIER_LABELS_PT: Record<CustomerTier, string> = {
  1: "Sessão",
  2: "Básico",
  3: "Completo",
  4: "Perfil Entrega",
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
  no_show: "Não compareceu",
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  pending_payment: "A aguardar pagamento",
  paid: "Paga",
  closed: "Fechada",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  preparing: "A preparar",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

interface CustomerHistoryData {
  customer: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    birthDate: string | null;
    preferredLocation: string | null;
    marketingConsent: boolean;
    points: number;
    totalSpent: number;
    visitCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  reservations: CustomerHistoryReservation[];
  visits: CustomerHistoryVisit[];
  orders: CustomerHistoryOrder[];
}

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { locations } = useLocations();
  const [data, setData] = useState<CustomerHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${id}/history`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Erro ao carregar cliente");
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getLocationLabel = (slug: string) =>
    locations.find((loc) => loc.slug === slug)?.name ?? slug;

  const formatDate = (s: string) =>
    s ? new Date(s).toLocaleDateString("pt-PT", { dateStyle: "short" }) : "—";
  const formatDateTime = (s: string) =>
    s ? new Date(s).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-10 w-10 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D4AF37]"
        >
          ← Voltar a Clientes
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
          {error ?? "Cliente não encontrado."}
        </div>
      </div>
    );
  }

  const { customer, reservations, visits, orders } = data;
  const tier = CustomerTierService.computeTier({
    displayName: customer.name,
    email: customer.email,
    phone: customer.phone,
    fullName: customer.name,
    birthDate: customer.birthDate,
  });
  const totalFromOrders = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-8 text-gray-900">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D4AF37]"
        >
          ← Voltar a Clientes
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-gray-900">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Detalhe do Cliente</h1>
          <p className="text-sm text-gray-500">Dados, reservas, visitas e pedidos</p>
        </div>

        <div className="p-6 space-y-8 text-gray-900">
          {/* Dados do cliente */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Nome</p>
                <p className="font-medium text-gray-900">{customer.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{customer.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Telefone</p>
                <p className="font-medium text-gray-900">{customer.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Data de Nascimento</p>
                <p className="font-medium text-gray-900">
                  {customer.birthDate ? formatDate(customer.birthDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Localização Preferida</p>
                <p className="font-medium text-gray-900">
                  {customer.preferredLocation
                    ? getLocationLabel(customer.preferredLocation)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Marketing</p>
                <p className="font-medium text-gray-900">
                  {customer.marketingConsent ? "Sim" : "Não"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Patamar</p>
                <p className="font-medium text-gray-900">{TIER_LABELS_PT[tier as CustomerTier]}</p>
              </div>
              <div>
                <p className="text-gray-500">Pontos</p>
                <p className="font-medium text-[#D4AF37]">{customer.points} pts</p>
              </div>
              <div>
                <p className="text-gray-500">N.º de Visitas</p>
                <p className="font-medium text-gray-900">{customer.visitCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Gasto (registado)</p>
                <p className="font-medium text-gray-900">
                  {Number(customer.totalSpent).toFixed(2)}€
                </p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <p className="font-medium text-gray-900">
                  {customer.isActive ? "Ativo" : "Inativo"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Membro desde</p>
                <p className="font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Última atualização</p>
                <p className="font-medium text-gray-900">{formatDate(customer.updatedAt)}</p>
              </div>
            </div>
          </section>

          {/* Resumo valor pago */}
          <section className="p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Valor pago (pedidos)</h2>
            <p className="text-2xl font-bold text-[#D4AF37]">
              {totalFromOrders.toFixed(2)}€
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Soma dos pedidos associados a este cliente ({orders.length} pedidos). Total em sessões (visitas):{" "}
              {visits.reduce((s, v) => s + v.totalAmount, 0).toFixed(2)}€
            </p>
          </section>

          {/* Reservas */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Reservas ({reservations.length})
            </h2>
            {reservations.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma reserva encontrada (por email).</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Data / Hora</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Nome</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Pax</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Local</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Mesa</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Estado</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Rodízio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-900">
                    {reservations.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">
                          {formatDate(r.reservationDate)} {r.reservationTime}
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="px-4 py-2 text-gray-900">{r.partySize}</td>
                        <td className="px-4 py-2 text-gray-900">{getLocationLabel(r.location)}</td>
                        <td className="px-4 py-2 text-gray-900">{r.tableNumber ?? r.tableName ?? "—"}</td>
                        <td className="px-4 py-2 text-gray-900">
                          <span className="font-medium">
                            {RESERVATION_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-900">{r.isRodizio ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Visitas (sessões) */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Visitas aos restaurantes ({visits.length})
            </h2>
            {visits.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Nenhuma visita encontrada (sessões em que o cliente esteve identificado).
              </p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Início</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Fim</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Mesa</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Local</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Pax</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Valor</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Estado</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Rodízio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-900">
                    {visits.map((v) => (
                      <tr key={v.sessionId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{formatDateTime(v.startedAt)}</td>
                        <td className="px-4 py-2 text-gray-900">
                          {v.closedAt ? formatDateTime(v.closedAt) : "—"}
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {v.tableName} (#{v.tableNumber})
                        </td>
                        <td className="px-4 py-2 text-gray-900">{getLocationLabel(v.location)}</td>
                        <td className="px-4 py-2 text-gray-900">{v.numPeople}</td>
                        <td className="px-4 py-2 font-semibold text-gray-900">
                          {v.totalAmount.toFixed(2)}€
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {SESSION_STATUS_LABELS[v.status] ?? v.status}
                        </td>
                        <td className="px-4 py-2 text-gray-900">{v.isRodizio ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Pedidos */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pedidos ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum pedido encontrado.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Data</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Produto</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Qtd</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Preço un.</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Total</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-900">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{formatDateTime(o.createdAt)}</td>
                        <td className="px-4 py-2 text-gray-900">{o.productName}</td>
                        <td className="px-4 py-2 text-gray-900">{o.quantity}</td>
                        <td className="px-4 py-2 text-gray-900">{o.unitPrice.toFixed(2)}€</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{o.total.toFixed(2)}€</td>
                        <td className="px-4 py-2 text-gray-900">
                          {ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
