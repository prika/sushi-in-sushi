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
  location_id?: string | null;
  location_slug?: string | null;
}

interface SyncPreviewItem {
  vendusId: string;
  name: string;
  price: number;
  action: "create" | "update";
  localId?: string;
}

interface SyncPreviewConflict {
  vendusId: string;
  name: string;
  message: string;
  resolution: string;
  localUpdatedAt?: string;
  vendusUpdatedAt?: string;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
  warnings?: Array<{
    id: string;
    type: string;
    message: string;
    details?: unknown;
  }>;
  preview?: {
    toCreate: SyncPreviewItem[];
    toUpdate: SyncPreviewItem[];
    conflicts: SyncPreviewConflict[];
    warnings: Array<{ id: string; type: string; message: string }>;
  };
}

export default function VendusSyncPage() {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [locations, setLocations] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewResult, setPreviewResult] = useState<SyncResult | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  const fetchProducts = useCallback(async () => {
    const supabase = createClient();
    const [productsRes, categoriesRes, locationsRes] = await Promise.all([
      supabase.from("products_with_vendus_status").select("*").order("name"),
      supabase.from("categories").select("id, name").order("sort_order"),
      fetch("/api/locations").then((r) => r.json()),
    ]);

    if (productsRes.error) {
      console.error("Error fetching products:", productsRes.error);
    } else {
      setProducts((productsRes.data || []) as ProductWithStatus[]);
    }
    if (categoriesRes.data) {
      setCategories(categoriesRes.data);
    }
    const locs = Array.isArray(locationsRes) ? locationsRes : [];
    setLocations(locs);
    setSelectedLocation((prev) => prev || locs[0]?.slug || "");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSync = async (
    direction: "push" | "pull" | "both",
    options?: {
      pushAll?: boolean;
      previewOnly?: boolean;
      defaultCategoryId?: string;
    },
  ) => {
    setIsSyncing(true);
    setSyncResult(null);
    setPreviewResult(null);

    try {
      const response = await fetch("/api/vendus/sync/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationSlug: selectedLocation,
          direction,
          pushAll: options?.pushAll ?? false,
          syncCategoriesFirst: true,
          previewOnly: options?.previewOnly ?? false,
          defaultCategoryId: options?.defaultCategoryId ?? categories[0]?.id,
        }),
      });

      const result = await response.json();
      if (options?.previewOnly) {
        setPreviewResult(result);
      } else {
        setSyncResult(result);
        await fetchProducts();
      }
    } catch (error) {
      const errResult = {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [{ id: "global", error: "Erro na sincronizacao" }],
        duration: 0,
      };
      setSyncResult(errResult);
      setPreviewResult(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult) return;
    setPreviewResult(null);
    await handleSync("pull", {
      previewOnly: false,
      defaultCategoryId: categories[0]?.id,
    });
  };

  const handleSyncCategories = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/vendus/sync/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationSlug: selectedLocation }),
      });

      const result = await response.json();
      setSyncResult({
        ...result,
        success: result.success,
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed,
        errors: result.errors || [],
        duration: result.duration,
      });
    } catch (error) {
      setSyncResult({
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [{ id: "global", error: "Erro ao exportar categorias" }],
        duration: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getSyncBadge = (status: SyncStatus | null) => {
    const variants: Record<SyncStatus, { color: string; label: string }> = {
      synced: {
        color: "bg-green-100 text-green-700 border-green-200",
        label: "Sincronizado",
      },
      pending: {
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        label: "Pendente",
      },
      error: { color: "bg-red-100 text-red-700 border-red-200", label: "Erro" },
      not_applicable: {
        color: "bg-gray-100 text-gray-500 border-gray-200",
        label: "N/A",
      },
    };

    const { color, label } = variants[status || "pending"] || variants.pending;
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${color}`}>
        {label}
      </span>
    );
  };

  const visibleProducts = selectedLocation
    ? products.filter(
        (p) =>
          p.location_slug === selectedLocation ||
          p.location_id ===
            locations.find((l) => l.slug === selectedLocation)?.id,
      )
    : products;

  const filteredProducts = visibleProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: visibleProducts.length,
    synced: visibleProducts.filter((p) => p.vendus_sync_status === "synced")
      .length,
    pending: visibleProducts.filter(
      (p) => p.vendus_sync_status === "pending" || !p.vendus_sync_status,
    ).length,
    error: visibleProducts.filter((p) => p.vendus_sync_status === "error")
      .length,
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
          <h1 className="text-2xl font-bold text-gray-900">
            Sincronizacao de Produtos
          </h1>
          <p className="text-gray-500">
            Gerir sincronizacao de produtos com o Vendus POS
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.slug}>
                {loc.name}
              </option>
            ))}
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
        <p className="text-sm text-gray-500 mb-4">
          As categorias sao exportadas automaticamente antes dos produtos.
          Importacao: use &quot;Pre-visualizar&quot; para rever alteracoes antes
          de confirmar.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleSyncCategories()}
            disabled={isSyncing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? "A exportar..." : "Exportar categorias"}
          </button>
          <button
            onClick={() => handleSync("pull", { previewOnly: true })}
            disabled={isSyncing}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? "A analisar..." : "Pre-visualizar importacao"}
          </button>
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
            onClick={() => handleSync("push", { pushAll: true })}
            disabled={isSyncing}
            className="px-4 py-2 border-2 border-[#D4AF37] text-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSyncing ? "A sincronizar..." : "Exportar tudo"}
          </button>
          <button
            onClick={() => handleSync("both")}
            disabled={isSyncing}
            className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg hover:bg-[#C4A030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSyncing ? "A sincronizar..." : "Sincronizacao Completa"}
          </button>
        </div>

        {previewResult?.preview && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-2">
              Pre-visualizacao da importacao
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              {previewResult.preview.toCreate.length} a criar,{" "}
              {previewResult.preview.toUpdate.length} a atualizar
              {previewResult.preview.conflicts.length > 0 &&
                `, ${previewResult.preview.conflicts.length} conflito(s) (resolvido por timestamp)`}
            </p>
            {(previewResult.preview.toCreate.length > 0 ||
              previewResult.preview.toUpdate.length > 0) && (
              <div className="max-h-40 overflow-y-auto text-sm space-y-1 mb-3">
                {previewResult.preview.toCreate.slice(0, 5).map((p) => (
                  <div key={p.vendusId} className="text-amber-800">
                    + Criar: {p.name} ({p.price.toFixed(2)} EUR)
                  </div>
                ))}
                {previewResult.preview.toCreate.length > 5 && (
                  <div className="text-amber-600">
                    + ... e mais {previewResult.preview.toCreate.length - 5}{" "}
                    produtos
                  </div>
                )}
                {previewResult.preview.toUpdate.slice(0, 5).map((p) => (
                  <div key={p.vendusId} className="text-amber-800">
                    ~ Atualizar: {p.name}
                  </div>
                ))}
                {previewResult.preview.toUpdate.length > 5 && (
                  <div className="text-amber-600">
                    ~ ... e mais {previewResult.preview.toUpdate.length - 5}{" "}
                    produtos
                  </div>
                )}
              </div>
            )}
            {previewResult.warnings && previewResult.warnings.length > 0 && (
              <div className="mb-3 p-2 bg-amber-100 rounded text-sm">
                {previewResult.warnings.map((w) => (
                  <p key={w.id} className="text-amber-800">
                    ⚠ {w.message}
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-amber-600 mb-3">
              Novos produtos serao criados na categoria &quot;
              {categories[0]?.name || "primeira categoria"}&quot;
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmImport}
                disabled={isSyncing}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                Confirmar importacao
              </button>
              <button
                onClick={() => setPreviewResult(null)}
                className="px-4 py-2 border border-amber-300 rounded-lg hover:bg-amber-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {syncResult && !previewResult?.preview && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              syncResult.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p
              className={syncResult.success ? "text-green-700" : "text-red-700"}
            >
              {syncResult.success
                ? `Sincronizacao concluida: ${syncResult.recordsUpdated} atualizados, ${syncResult.recordsCreated} criados (${syncResult.duration}ms)`
                : `Erro: ${syncResult.errors?.[0]?.error || "Erro desconhecido"}`}
            </p>
            {syncResult.recordsFailed > 0 && (
              <p className="text-red-600 text-sm mt-1">
                {syncResult.recordsFailed} produto(s) falharam
              </p>
            )}
            {syncResult.warnings && syncResult.warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-green-200">
                {syncResult.warnings.map((w) => (
                  <p key={w.id} className="text-amber-700 text-sm">
                    ⚠ {w.message}
                  </p>
                ))}
              </div>
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
                    <span className="font-medium text-gray-900">
                      {product.name}
                    </span>
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
                  {product.vendus_id
                    ? product.vendus_id.substring(0, 12) + "..."
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.vendus_synced_at
                    ? new Date(product.vendus_synced_at).toLocaleString(
                        "pt-PT",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
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
