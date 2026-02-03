"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type SyncStatus = "synced" | "pending" | "error" | "not_applicable";

interface ProductWithStatus {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  vendus_id: string | null;
  vendus_sync_status: SyncStatus | null;
  vendus_synced_at: string | null;
  category_name: string | null;
  sync_status_label: string;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}

export default function VendusSyncPage() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("circunvalacao");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products_with_vendus_status")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSync = async (direction: "push" | "pull" | "both") => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/vendus/sync/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationSlug: selectedLocation, direction }),
      });

      const result = await response.json();
      setSyncResult(result);
      await fetchProducts();
    } catch (error) {
      setSyncResult({
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [{ id: "global", error: "Erro na sincronizacao" }],
        duration: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getSyncBadge = (status: SyncStatus | null) => {
    const variants: Record<SyncStatus, { color: string; label: string }> = {
      synced: { color: "bg-green-100 text-green-700 border-green-200", label: "Sincronizado" },
      pending: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Pendente" },
      error: { color: "bg-red-100 text-red-700 border-red-200", label: "Erro" },
      not_applicable: { color: "bg-gray-100 text-gray-500 border-gray-200", label: "N/A" },
    };

    const { color, label } = variants[status || "pending"] || variants.pending;
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${color}`}>
        {label}
      </span>
    );
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: products.length,
    synced: products.filter((p) => p.vendus_sync_status === "synced").length,
    pending: products.filter(
      (p) => p.vendus_sync_status === "pending" || !p.vendus_sync_status
    ).length,
    error: products.filter((p) => p.vendus_sync_status === "error").length,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sincronizacao de Produtos</h1>
          <p className="text-gray-500">Gerir sincronizacao de produtos com o Vendus POS</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            <option value="circunvalacao">Circunvalacao</option>
            <option value="boavista">Boavista</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Produtos</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Sincronizados</p>
          <p className="text-2xl font-bold text-green-600">{stats.synced}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Com Erro</p>
          <p className="text-2xl font-bold text-red-600">{stats.error}</p>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Acoes de Sincronizacao</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleSync("pull")}
            disabled={isSyncing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? "A sincronizar..." : "Importar do Vendus"}
          </button>
          <button
            onClick={() => handleSync("push")}
            disabled={isSyncing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? "A sincronizar..." : "Exportar para Vendus"}
          </button>
          <button
            onClick={() => handleSync("both")}
            disabled={isSyncing}
            className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg hover:bg-[#C4A030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSyncing ? "A sincronizar..." : "Sincronizacao Completa"}
          </button>
        </div>

        {syncResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              syncResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <p className={syncResult.success ? "text-green-700" : "text-red-700"}>
              {syncResult.success
                ? `Sincronizacao concluida: ${syncResult.recordsUpdated} atualizados, ${syncResult.recordsCreated} criados (${syncResult.duration}ms)`
                : `Erro: ${syncResult.errors?.[0]?.error || "Erro desconhecido"}`}
            </p>
            {syncResult.recordsFailed > 0 && (
              <p className="text-red-600 text-sm mt-1">
                {syncResult.recordsFailed} produto(s) falharam
              </p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <input
          type="text"
          placeholder="Pesquisar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preco
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado Sync
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendus ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ultima Sync
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{product.name}</span>
                    {!product.is_available && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                        Indisponivel
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {product.category_name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {product.price.toFixed(2)} EUR
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSyncBadge(product.vendus_sync_status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {product.vendus_id ? product.vendus_id.substring(0, 12) + "..." : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.vendus_synced_at
                    ? new Date(product.vendus_synced_at).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Nunca"}
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {searchTerm
                    ? "Nenhum produto encontrado para a pesquisa"
                    : "Nenhum produto disponivel"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
