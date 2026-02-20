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
  vendus_ids?: Record<string, string> | null;
  vendus_sync_status: SyncStatus | null;
  vendus_synced_at: string | null;
  category_name: string | null;
  sync_status_label: string;
  location_id?: string | null;
  location_slug?: string | null;
  service_modes?: string[];
}

interface SyncPreviewItem {
  vendusId: string;
  name: string;
  price: number;
  action: "create" | "update";
  localId?: string;
  serviceModes?: string[];
  vendusCategory?: string;
  categoryAutoMatched?: boolean;
}

const SERVICE_MODE_LABELS: Record<string, string> = {
  delivery: "Delivery",
  takeaway: "Take Away",
  dine_in: "Sala",
};

function ServiceModeBadges({ modes }: { modes?: string[] }) {
  if (!modes || modes.length === 0) return <span className="text-gray-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {modes.map((m) => (
        <span
          key={m}
          className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200"
        >
          {SERVICE_MODE_LABELS[m] || m}
        </span>
      ))}
    </div>
  );
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
          syncCategoriesFirst: false,
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
          (!p.location_slug && !p.location_id) || // include unassigned products
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-1">Acoes de Sincronizacao</h2>
        <p className="text-xs text-gray-500 mb-4">
          Use &quot;Pre-visualizar&quot; para rever importacoes antes de confirmar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Import: Vendus → Sushi */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 uppercase tracking-wide">
              <span>Vendus</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              <span>Sushi</span>
            </div>
            <button
              onClick={() => handleSync("pull", { previewOnly: true })}
              disabled={isSyncing}
              className="w-full px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A analisar..." : "Pre-visualizar"}
            </button>
            <button
              onClick={() => handleSync("pull")}
              disabled={isSyncing}
              className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A importar..." : "Importar produtos"}
            </button>
          </div>

          {/* Export: Sushi → Vendus */}
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 uppercase tracking-wide">
              <span>Sushi</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              <span>Vendus</span>
            </div>
            <button
              onClick={() => handleSync("push")}
              disabled={isSyncing}
              className="w-full px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A exportar..." : "Exportar pendentes"}
            </button>
            <button
              onClick={() => handleSync("push", { pushAll: true })}
              disabled={isSyncing}
              className="w-full px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A exportar..." : "Exportar tudo"}
            </button>
          </div>

          {/* Full Sync: both directions */}
          <div className="rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#B8960C] uppercase tracking-wide">
              <span>Vendus</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              <span>Sushi</span>
            </div>
            <button
              onClick={() => handleSync("both")}
              disabled={isSyncing}
              className="w-full px-3 py-1.5 text-sm bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#C4A030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A sincronizar..." : "Sincronizacao completa"}
            </button>
          </div>
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
                  <div key={p.vendusId} className="text-amber-800 flex items-center gap-2">
                    <span>+ Criar: {p.name} ({p.price.toFixed(2)} EUR)</span>
                    {p.serviceModes && p.serviceModes.length > 0 && (
                      <ServiceModeBadges modes={p.serviceModes} />
                    )}
                    {p.categoryAutoMatched && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">auto-cat</span>
                    )}
                  </div>
                ))}
                {previewResult.preview.toCreate.length > 5 && (
                  <div className="text-amber-600">
                    + ... e mais {previewResult.preview.toCreate.length - 5}{" "}
                    produtos
                  </div>
                )}
                {previewResult.preview.toUpdate.slice(0, 5).map((p) => (
                  <div key={p.vendusId} className="text-amber-800 flex items-center gap-2">
                    <span>~ Atualizar: {p.name}</span>
                    {p.serviceModes && p.serviceModes.length > 0 && (
                      <ServiceModeBadges modes={p.serviceModes} />
                    )}
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
                : `Sincronizacao parada: ${syncResult.errors?.[0]?.error || "Erro desconhecido"}`}
            </p>
            {syncResult.recordsFailed > 0 && (
              <div className="text-red-600 text-sm mt-1 space-y-0.5">
                <p>Parou no erro do produto. {syncResult.recordsProcessed} processado(s) antes de parar.</p>
                {syncResult.errors.map((e, i) => (
                  <p key={i} className="text-xs font-mono bg-red-100 px-2 py-1 rounded">{e.error}</p>
                ))}
              </div>
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

      {/* Products Cards */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500">
            {searchTerm
              ? "Nenhum produto encontrado para a pesquisa"
              : "Nenhum produto disponivel"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 ${!product.is_available ? "opacity-60" : ""}`}
            >
              {/* Header: name + availability */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category_name || "Sem categoria"}</p>
                </div>
                {getSyncBadge(product.vendus_sync_status)}
              </div>

              {/* Price + Service Modes */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#D4AF37] tabular-nums">{product.price.toFixed(2)} EUR</span>
                {!product.is_available && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">Indisponivel</span>
                )}
              </div>

              {/* Service Modes */}
              <ServiceModeBadges modes={product.service_modes} />

              {/* Vendus info */}
              <div className="mt-auto pt-2 border-t border-gray-100 text-xs text-gray-400">
                {product.vendus_ids && Object.keys(product.vendus_ids).length > 0 ? (
                  <div className="space-y-0.5 mb-1">
                    {Object.entries(product.vendus_ids).map(([mode, vid]) => (
                      <div key={mode} className="flex justify-between">
                        <span>{SERVICE_MODE_LABELS[mode] || mode}</span>
                        <span className="font-mono truncate max-w-[100px]" title={vid}>
                          #{vid.substring(0, 8)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : product.vendus_id ? (
                  <div className="mb-1">
                    <span className="font-mono" title={product.vendus_id}>
                      #{product.vendus_id.substring(0, 10)}
                    </span>
                  </div>
                ) : (
                  <div className="mb-1">Sem Vendus ID</div>
                )}
                <div className="text-right">
                  {product.vendus_synced_at
                    ? new Date(product.vendus_synced_at).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Nunca sincronizado"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
