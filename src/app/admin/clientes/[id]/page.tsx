"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocations } from "@/presentation/hooks";
import { CustomerTierService, type BehavioralInsight, type CustomerStats } from "@/domain/services/CustomerTierService";
import { CUSTOMER_TIER_LABELS, CUSTOMER_TIER_COLORS, getProfileCompleteness } from "@/domain/value-objects/CustomerTier";

const PROFILE_FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefone",
  birthDate: "Data de Nascimento",
  preferredLocation: "Localização Preferida",
  marketingConsent: "Marketing",
};

const INSIGHT_SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  negative: "bg-red-50 text-red-700 border-red-200",
};

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
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancellationSource: string | null;
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
  ready: "Pronto para servir",
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
  stats: CustomerStats;
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

  const { customer, reservations, visits, orders, stats } = data;
  const tier = CustomerTierService.computeTierFromCustomer(customer);
  const tierColors = CUSTOMER_TIER_COLORS[tier];
  const insights = CustomerTierService.computeInsights(stats);
  const profile = getProfileCompleteness(customer);
  const allProfileFields = ["email", "phone", "birthDate", "preferredLocation", "marketingConsent"];
  const totalFromOrders = stats.totalFromOrders;

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
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${tierColors.bg} ${tierColors.text}`}>
                  {CUSTOMER_TIER_LABELS[tier]}
                </span>
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

          {/* Dados recolhidos + Insights comportamentais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Perfil de conhecimento */}
            <section className="p-4 bg-white rounded-xl border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Dados recolhidos ({profile.filled.length}/{allProfileFields.length})
              </h2>
              <div className="space-y-2">
                {allProfileFields.map((field) => {
                  const isFilled = profile.filled.includes(field);
                  return (
                    <div key={field} className="flex items-center gap-2">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${
                        isFilled ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        {isFilled ? "✓" : "○"}
                      </span>
                      <span className={`text-sm ${isFilled ? "text-gray-900" : "text-gray-400"}`}>
                        {PROFILE_FIELD_LABELS[field]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${(profile.filled.length / allProfileFields.length) * 100}%` }}
                />
              </div>
            </section>

            {/* Insights comportamentais */}
            <section className="p-4 bg-white rounded-xl border border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Perfil comportamental
              </h2>
              {insights.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Dados insuficientes para gerar insights.
                  {stats.reservationCount === 0 && " Sem reservas registadas."}
                  {stats.visitCount === 0 && " Sem visitas registadas."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {insights.map((insight: BehavioralInsight) => (
                    <span
                      key={insight.key}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${INSIGHT_SEVERITY_COLORS[insight.severity]}`}
                    >
                      <span>{insight.icon}</span>
                      <span>{insight.label}</span>
                    </span>
                  ))}
                </div>
              )}
              {/* Summary stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-1.5 bg-gray-50 rounded">
                  <span className="text-gray-500">Reservas</span>
                  <span className="font-medium text-gray-900">{stats.reservationCount}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-gray-50 rounded">
                  <span className="text-gray-500">No-shows</span>
                  <span className={`font-medium ${stats.noShowCount > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {stats.noShowCount}
                  </span>
                </div>
                <div className="flex justify-between p-1.5 bg-gray-50 rounded">
                  <span className="text-gray-500">Cancelamentos</span>
                  <span className="font-medium text-gray-900">{stats.cancelledReservations}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-gray-50 rounded">
                  <span className="text-gray-500">Média pax</span>
                  <span className="font-medium text-gray-900">{stats.avgPartySize || "—"}</span>
                </div>
              </div>
            </section>
          </div>

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
              {reservations.filter(r => r.status === 'cancelled').length > 0 && (
                <span className="text-sm font-normal text-red-500 ml-2">
                  — {reservations.filter(r => r.status === 'cancelled').length} cancelada{reservations.filter(r => r.status === 'cancelled').length !== 1 ? 's' : ''}
                </span>
              )}
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
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Estado</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Cancelamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-900">
                    {reservations.map((r) => (
                      <tr key={r.id} className={`hover:bg-gray-50 ${r.status === 'cancelled' ? 'bg-red-50/50' : ''}`}>
                        <td className="px-4 py-2 text-gray-900">
                          {formatDate(r.reservationDate)} {r.reservationTime}
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="px-4 py-2 text-gray-900">{r.partySize}</td>
                        <td className="px-4 py-2 text-gray-900">{getLocationLabel(r.location)}</td>
                        <td className="px-4 py-2 text-gray-900">
                          <span className={`font-medium ${r.status === 'cancelled' ? 'text-red-600' : ''}`}>
                            {RESERVATION_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {r.status === 'cancelled' ? (
                            <div className="space-y-1">
                              {r.cancellationReason && (
                                <p className="text-xs text-gray-600 italic line-clamp-1">{r.cancellationReason}</p>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {r.cancelledBy && (
                                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                                    r.cancelledBy === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {r.cancelledBy === 'customer' ? 'Cliente' : 'Admin'}
                                  </span>
                                )}
                                {r.cancellationSource && (
                                  <span className="px-1.5 py-0.5 text-[10px] rounded-full font-medium bg-gray-100 text-gray-600">
                                    {r.cancellationSource === 'site' ? 'Site' : 'Telefone'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
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
