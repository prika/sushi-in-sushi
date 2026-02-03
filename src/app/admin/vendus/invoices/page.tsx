"use client";

import { useState, useEffect, useCallback } from "react";

interface Invoice {
  id: string;
  vendus_document_number: string | null;
  vendus_document_type: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method_name: string | null;
  customer_nif: string | null;
  customer_name: string | null;
  status: string;
  status_label: string;
  table_number: number | null;
  table_name: string | null;
  issued_by_name: string | null;
  voided_by_name: string | null;
  void_reason: string | null;
  pdf_url: string | null;
  created_at: string;
  voided_at: string | null;
}

export default function VendusInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [showVoidModal, setShowVoidModal] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");

      const response = await fetch(`/api/vendus/invoices?${params.toString()}`);
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleVoid = async (invoiceId: string) => {
    if (!voidReason.trim()) {
      alert("Por favor, indique o motivo da anulacao");
      return;
    }

    setIsVoiding(invoiceId);
    try {
      const response = await fetch("/api/vendus/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, reason: voidReason }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchInvoices();
        setShowVoidModal(null);
        setVoidReason("");
      } else {
        alert(result.error || "Erro ao anular fatura");
      }
    } catch (error) {
      console.error("Error voiding invoice:", error);
      alert("Erro ao anular fatura");
    } finally {
      setIsVoiding(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Pendente" },
      issued: { color: "bg-green-100 text-green-700 border-green-200", label: "Emitida" },
      voided: { color: "bg-red-100 text-red-700 border-red-200", label: "Anulada" },
      error: { color: "bg-red-100 text-red-700 border-red-200", label: "Erro" },
    };

    const { color, label } = variants[status] || variants.pending;
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${color}`}>
        {label}
      </span>
    );
  };

  const stats = {
    total: invoices.length,
    issued: invoices.filter((i) => i.status === "issued").length,
    voided: invoices.filter((i) => i.status === "voided").length,
    totalAmount: invoices
      .filter((i) => i.status === "issued")
      .reduce((sum, i) => sum + i.total, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Faturas Vendus</h1>
        <p className="text-gray-500">Visualizar faturas emitidas atraves do Vendus POS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Faturas</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Emitidas</p>
          <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Anuladas</p>
          <p className="text-2xl font-bold text-red-600">{stats.voided}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Faturado</p>
          <p className="text-2xl font-bold text-[#D4AF37]">{stats.totalAmount.toFixed(2)} EUR</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
        >
          <option value="all">Todos os estados</option>
          <option value="issued">Emitidas</option>
          <option value="voided">Anuladas</option>
          <option value="error">Com erro</option>
        </select>
        <button
          onClick={fetchInvoices}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Atualizar
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mesa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.vendus_document_number || "-"}
                    </p>
                    <p className="text-sm text-gray-500">{invoice.vendus_document_type}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {invoice.table_name || `Mesa ${invoice.table_number}` || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invoice.customer_nif ? (
                    <div>
                      <p className="text-gray-900">{invoice.customer_name || "-"}</p>
                      <p className="text-sm text-gray-500">{invoice.customer_nif}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400">Consumidor final</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {invoice.total.toFixed(2)} EUR
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invoice.created_at).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    {invoice.pdf_url && (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="Ver PDF"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </a>
                    )}
                    {invoice.status === "issued" && (
                      <button
                        onClick={() => setShowVoidModal(invoice.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Anular fatura"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma fatura encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Anular Fatura</h3>
            <p className="text-gray-600 mb-4">
              Indique o motivo da anulacao. Sera emitida uma nota de credito no Vendus.
            </p>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Motivo da anulacao..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowVoidModal(null);
                  setVoidReason("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleVoid(showVoidModal)}
                disabled={isVoiding === showVoidModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isVoiding === showVoidModal ? "A anular..." : "Anular Fatura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
