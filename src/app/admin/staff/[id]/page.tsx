"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import type { StaffWithRole, Table, RoleName } from "@/types/database";

interface StaffMetrics {
  ordersDeliveredToday: number;
  revenueGeneratedToday: number;
  averageDeliveryTimeMinutes: number | null;
  totalOrdersDelivered: number;
  totalRevenueGenerated: number;
}

interface DailyMetric {
  date: string;
  ordersDelivered: number;
  revenueGenerated: number;
  averageDeliveryTimeMinutes: number | null;
}

interface ActivityLogItem {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface StaffDetailData {
  staff: StaffWithRole;
  assignedTables: Table[];
  todayMetrics: StaffMetrics;
  historicalMetrics: DailyMetric[];
  recentActivity: ActivityLogItem[];
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StaffDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        const response = await fetch(`/api/staff/${id}/metrics?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao carregar dados");
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, dateRange]);

  const getRoleBadgeColor = (roleName: RoleName) => {
    switch (roleName) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "kitchen":
        return "bg-orange-100 text-orange-700";
      case "waiter":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleLabel = (roleName: RoleName) => {
    const labels: Record<RoleName, string> = {
      admin: "Administrador",
      kitchen: "Cozinha",
      waiter: "Atendente",
      customer: "Cliente",
    };
    return labels[roleName] || roleName;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: "Login",
      logout: "Logout",
      order_delivered: "Pedido entregue",
      session_closed: "Sessão fechada",
    };
    return labels[action] || action;
  };

  const getLocationLabel = (location: string | null) => {
    if (!location) return "Todas";
    const labels: Record<string, string> = {
      circunvalacao: "Circunvalação",
      boavista: "Boavista",
    };
    return labels[location] || location;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar
        </Link>
        <Card variant="light">
          <div className="text-center py-12">
            <p className="text-red-500">{error || "Erro ao carregar dados"}</p>
          </div>
        </Card>
      </div>
    );
  }

  const {
    staff,
    assignedTables,
    todayMetrics,
    historicalMetrics,
    recentActivity,
  } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/admin/staff"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Voltar para Funcionários
      </Link>

      {/* Staff Info Header */}
      <Card variant="light">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600">
                {staff.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{staff.name}</h1>
              <p className="text-gray-500">{staff.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(staff.role?.name || "")}`}
                >
                  {getRoleLabel(staff.role?.name || "")}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    staff.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {staff.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              <span className="font-medium">Localização:</span>{" "}
              {getLocationLabel(staff.location)}
            </p>
            <p>
              <span className="font-medium">Telefone:</span>{" "}
              {staff.phone || "-"}
            </p>
            <p>
              <span className="font-medium">Último login:</span>{" "}
              {staff.last_login
                ? new Date(staff.last_login).toLocaleString("pt-PT")
                : "Nunca"}
            </p>
            <p>
              <span className="font-medium">Criado:</span>{" "}
              {new Date(staff.created_at).toLocaleDateString("pt-PT")}
            </p>
          </div>
        </div>
      </Card>

      {/* Assigned Tables (for waiters) */}
      {staff.role?.name === "waiter" && (
        <Card
          variant="light"
          header={
            <h3 className="font-semibold text-gray-900">Mesas Atribuídas</h3>
          }
        >
          {assignedTables.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {assignedTables.map((table) => (
                <div
                  key={table.id}
                  className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <span className="font-bold text-blue-700">
                    #{table.number}
                  </span>
                  <span className="text-blue-600 ml-2">{table.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma mesa atribuída</p>
          )}
        </Card>
      )}

      {/* Today's Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card variant="light">
          <div className="text-center">
            <p className="text-sm text-gray-500">Pedidos Hoje</p>
            <p className="text-3xl font-bold text-[#D4AF37]">
              {todayMetrics.ordersDeliveredToday}
            </p>
          </div>
        </Card>
        <Card variant="light">
          <div className="text-center">
            <p className="text-sm text-gray-500">Receita Hoje</p>
            <p className="text-3xl font-bold text-green-600">
              {todayMetrics.revenueGeneratedToday.toFixed(2)}€
            </p>
          </div>
        </Card>
        <Card variant="light">
          <div className="text-center">
            <p className="text-sm text-gray-500">Tempo Médio</p>
            <p className="text-3xl font-bold text-blue-600">
              {todayMetrics.averageDeliveryTimeMinutes !== null
                ? `${todayMetrics.averageDeliveryTimeMinutes} min`
                : "-"}
            </p>
          </div>
        </Card>
        <Card variant="light">
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Pedidos</p>
            <p className="text-3xl font-bold text-gray-700">
              {todayMetrics.totalOrdersDelivered}
            </p>
          </div>
        </Card>
        <Card variant="light">
          <div className="text-center">
            <p className="text-sm text-gray-500">Receita Total</p>
            <p className="text-3xl font-bold text-gray-700">
              {todayMetrics.totalRevenueGenerated.toFixed(2)}€
            </p>
          </div>
        </Card>
      </div>

      {/* Date Range Filter and Historical Metrics */}
      <Card
        variant="light"
        header={
          <h3 className="font-semibold text-gray-900">
            Histórico de Performance
          </h3>
        }
      >
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
            />
          </div>
        </div>

        {/* Historical Metrics Table */}
        {historicalMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Receita
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Tempo Médio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historicalMetrics.map((metric) => (
                  <tr key={metric.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(metric.date).toLocaleDateString("pt-PT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#D4AF37]">
                      {metric.ordersDelivered}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {metric.revenueGenerated.toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {metric.averageDeliveryTimeMinutes !== null
                        ? `${metric.averageDeliveryTimeMinutes} min`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            Sem dados de performance para o período selecionado
          </p>
        )}
      </Card>

      {/* Recent Activity */}
      <Card
        variant="light"
        header={
          <h3 className="font-semibold text-gray-900">Atividade Recente</h3>
        }
      >
        {recentActivity.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {getActionLabel(activity.action)}
                  </p>
                  {activity.details && (
                    <p className="text-sm text-gray-500">
                      {activity.entity_type === "order" && (
                        <>
                          Mesa{" "}
                          {
                            (activity.details as Record<string, unknown>)
                              .tableNumber
                          }{" "}
                          -{" "}
                          {
                            (activity.details as Record<string, unknown>)
                              .productName
                          }
                        </>
                      )}
                      {activity.entity_type === "session" && (
                        <>
                          Mesa{" "}
                          {
                            (activity.details as Record<string, unknown>)
                              .tableNumber
                          }{" "}
                          -{" "}
                          {(
                            (activity.details as Record<string, unknown>)
                              .totalAmount as number
                          )?.toFixed(2)}
                          €
                        </>
                      )}
                    </p>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(activity.created_at).toLocaleString("pt-PT")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            Sem atividade registada
          </p>
        )}
      </Card>
    </div>
  );
}
