"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import type { SessionStatus } from "@/types/database";

type PeriodType = "today" | "week" | "month" | "custom";
type FormatType = "csv" | "json";
type StatusFilter = "all" | SessionStatus;

export default function ExportarPage() {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [format, setFormat] = useState<FormatType>("csv");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customDateStart, setCustomDateStart] = useState<string>("");
  const [customDateEnd, setCustomDateEnd] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<{
    sessions: number;
    orders: number;
    total: number;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        startDate = customDateStart ? new Date(customDateStart) : new Date();
        endDate = customDateEnd ? new Date(customDateEnd) : new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  };

  // Fetch preview data
  useEffect(() => {
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      const supabase = createClient();
      const { startDate, endDate } = getDateRange();

      let sessionsQuery = supabase
        .from("sessions")
        .select(`
          *,
          orders (*)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (statusFilter !== "all") {
        sessionsQuery = sessionsQuery.eq("status", statusFilter);
      }

      const { data: sessions } = await sessionsQuery;

      if (sessions) {
        const allOrders = sessions.flatMap((s: any) => s.orders || []);
        const total = allOrders
          .filter((o: any) => o.status !== "cancelled")
          .reduce((sum: number, o: any) => sum + o.quantity * (o.unit_price || 0), 0);

        setPreview({
          sessions: sessions.length,
          orders: allOrders.length,
          total,
        });
      }

      setIsLoadingPreview(false);
    };

    fetchPreview();
  }, [period, statusFilter, customDateStart, customDateEnd]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const { startDate, endDate } = getDateRange();

      const params = new URLSearchParams({
        format,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }

    setIsExporting(false);
  };

  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "week", label: "Últimos 7 dias" },
    { value: "month", label: "Último mês" },
    { value: "custom", label: "Período personalizado" },
  ];

  const formatOptions: { value: FormatType; label: string; description: string }[] = [
    { value: "csv", label: "CSV", description: "Compatível com Excel" },
    { value: "json", label: "JSON", description: "Dados estruturados" },
  ];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todas as sessões" },
    { value: "active", label: "Apenas ativas" },
    { value: "pending_payment", label: "Conta pedida" },
    { value: "paid", label: "Pagas" },
    { value: "closed", label: "Apenas fechadas" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Period Selection */}
      <Card variant="light" header={<h2 className="text-lg font-semibold">Período</h2>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                period === option.value
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className={`font-medium ${
                  period === option.value ? "text-[#D4AF37]" : "text-gray-700"
                }`}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data início</label>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data fim</label>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Filters */}
      <Card variant="light" header={<h2 className="text-lg font-semibold">Filtros</h2>}>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Estado das sessões</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#D4AF37] focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Format Selection */}
      <Card variant="light" header={<h2 className="text-lg font-semibold">Formato</h2>}>
        <div className="grid md:grid-cols-2 gap-4">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormat(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                format === option.value
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className={`font-medium ${
                  format === option.value ? "text-[#D4AF37]" : "text-gray-700"
                }`}
              >
                {option.label}
              </span>
              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <Card variant="light" header={<h2 className="text-lg font-semibold">Pré-visualização</h2>}>
        {isLoadingPreview ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
          </div>
        ) : preview ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{preview.sessions}</p>
              <p className="text-sm text-gray-500">Sessões</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{preview.orders}</p>
              <p className="text-sm text-gray-500">Pedidos</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-[#D4AF37]">{preview.total.toFixed(2)}€</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">Nenhum dado encontrado</p>
        )}
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleExport}
          isLoading={isExporting}
          disabled={!preview || preview.sessions === 0}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar {format.toUpperCase()}
        </Button>
      </div>
    </div>
  );
}
