"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

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
  if (!modes || modes.length === 0)
    return <span className="text-gray-400">-</span>;
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
  syncLogId?: number;
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "synced" | "pending" | "error" | "no_vendus"
  >("all");
  const [previewResult, setPreviewResult] = useState<SyncResult | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Read-only mode
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Orphans management
  const [orphans, setOrphans] = useState<
    { id: string; name: string; price: number }[]
  >([]);
  const [orphansCount, setOrphansCount] = useState(0);
  const [isLoadingOrphans, setIsLoadingOrphans] = useState(false);
  const [isDeletingOrphans, setIsDeletingOrphans] = useState(false);
  const [showOrphansPreview, setShowOrphansPreview] = useState(false);

  // Vendus product list modal
  const [vendusProductsList, setVendusProductsList] = useState<
    {
      id: string;
      title: string;
      gross_price: string;
      status: string;
      service_mode: string | null;
      category_name: string | null;
    }[]
  >([]);
  const [isLoadingVendusProducts, setIsLoadingVendusProducts] = useState(false);
  const [showVendusProductsModal, setShowVendusProductsModal] = useState(false);

  const fetchProducts = useCallback(async () => {
    setFetchError(null);
    setIsLoading(true);
    try {
      const [syncRes, locationsRes] = await Promise.all([
        fetch("/api/vendus/sync/products"),
        fetch("/api/locations"),
      ]);

      const syncData = syncRes.ok
        ? await syncRes.json()
        : await syncRes
            .json()
            .catch(() => ({ error: `Erro ${syncRes.status}` }));
      const locationsData = locationsRes.ok ? await locationsRes.json() : [];

      if (syncData.error) {
        setFetchError(syncData.error);
      } else {
        setProducts((syncData.products || []) as ProductWithStatus[]);
        setCategories(syncData.categories || []);
        setIsReadOnly(syncData.isReadOnly ?? false);
      }
      const locs = Array.isArray(locationsData) ? locationsData : [];
      setLocations(locs);
      setSelectedLocation((prev) => prev || locs[0]?.slug || "");
    } catch (err) {
      console.error("Error fetching sync data:", err);
      setFetchError("Erro de ligacao ao servidor");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrphansCount = useCallback(async () => {
    try {
      const res = await fetch("/api/vendus/sync/orphans");
      if (res.ok) {
        const data = await res.json();
        setOrphansCount(data.count ?? 0);
      }
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchOrphansCount();
  }, [fetchProducts, fetchOrphansCount]);

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

  const [isReverting, setIsReverting] = useState(false);
  const [revertResult, setRevertResult] = useState<{
    success: boolean;
    restored: number;
    message?: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const handleRevert = async () => {
    const logId = syncResult?.syncLogId;
    if (!logId) return;
    setIsReverting(true);
    setRevertResult(null);
    try {
      const res = await fetch("/api/vendus/sync/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncLogId: logId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevertResult({ success: true, restored: data.restored });
        setSyncResult(null);
        setConfirmRevert(false);
        await fetchProducts();
      } else {
        setRevertResult({
          success: false,
          restored: 0,
          message: data.error || "Erro ao reverter",
        });
      }
    } catch {
      setRevertResult({
        success: false,
        restored: 0,
        message: "Erro de ligacao",
      });
    } finally {
      setIsReverting(false);
    }
  };

  const handleResetStatus = async (onlyErrors: boolean) => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/vendus/sync/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAll: true, onlyErrors }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProducts();
      } else {
        console.error("Reset failed:", data.error);
      }
    } catch {
      console.error("Reset connection error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLoadOrphansPreview = async () => {
    setIsLoadingOrphans(true);
    try {
      const res = await fetch("/api/vendus/sync/orphans");
      if (res.ok) {
        const data = await res.json();
        setOrphans(data.products || []);
        setOrphansCount(data.count || 0);
        setShowOrphansPreview(true);
      }
    } catch {
      console.error("Erro ao carregar orfaos");
    } finally {
      setIsLoadingOrphans(false);
    }
  };

  const handleConfirmDeleteOrphans = async () => {
    if (orphans.length === 0) return;
    setIsDeletingOrphans(true);
    try {
      const res = await fetch("/api/vendus/sync/orphans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: orphans.map((o) => o.id) }),
      });
      if (res.ok) {
        setShowOrphansPreview(false);
        setOrphans([]);
        await fetchProducts();
        await fetchOrphansCount();
      }
    } catch {
      console.error("Erro ao apagar orfaos");
    } finally {
      setIsDeletingOrphans(false);
    }
  };

  const handleLoadVendusProducts = async () => {
    if (!selectedLocation) return;
    setIsLoadingVendusProducts(true);
    try {
      const res = await fetch(
        `/api/vendus/products/list?locationSlug=${selectedLocation}`,
      );
      if (res.ok) {
        const data = await res.json();
        setVendusProductsList(data.products || []);
        setShowVendusProductsModal(true);
      }
    } catch {
      console.error("Erro ao carregar produtos Vendus");
    } finally {
      setIsLoadingVendusProducts(false);
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

  const stats = {
    total: visibleProducts.length,
    synced: visibleProducts.filter((p) => p.vendus_sync_status === "synced")
      .length,
    pending: visibleProducts.filter(
      (p) => p.vendus_sync_status === "pending" || !p.vendus_sync_status,
    ).length,
    error: visibleProducts.filter((p) => p.vendus_sync_status === "error")
      .length,
    no_vendus: visibleProducts.filter(
      (p) =>
        !p.vendus_id &&
        (!p.vendus_ids || Object.keys(p.vendus_ids).length === 0),
    ).length,
  };

  const statusFiltered =
    statusFilter === "all"
      ? visibleProducts
      : statusFilter === "synced"
        ? visibleProducts.filter((p) => p.vendus_sync_status === "synced")
        : statusFilter === "pending"
          ? visibleProducts.filter(
              (p) =>
                p.vendus_sync_status === "pending" || !p.vendus_sync_status,
            )
          : statusFilter === "error"
            ? visibleProducts.filter((p) => p.vendus_sync_status === "error")
            : visibleProducts.filter(
                (p) =>
                  !p.vendus_id &&
                  (!p.vendus_ids || Object.keys(p.vendus_ids).length === 0),
              );

  const filteredProducts = statusFiltered.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Vendus products grouping stats + grouped rows (for modal)
  const vendusGrouping = useMemo(() => {
    if (vendusProductsList.length === 0) return null;

    type GroupedProduct = {
      title: string;
      prices: { delivery?: string; takeaway?: string };
      categoryNames: string[];
      statuses: string[];
      ids: string[];
      isGrouped: boolean;
    };

    const groupMap = new Map<string, GroupedProduct>();
    let noTitle = 0;

    for (const p of vendusProductsList) {
      const key = p.title?.trim().toLowerCase();
      if (!key) {
        noTitle++;
        continue;
      }
      const mode = p.service_mode as "delivery" | "takeaway" | null;
      const existing = groupMap.get(key);
      if (existing) {
        if (mode) existing.prices[mode] = p.gross_price;
        existing.statuses.push(p.status);
        existing.ids.push(p.id);
        if (p.category_name && !existing.categoryNames.includes(p.category_name)) {
          existing.categoryNames.push(p.category_name);
        }
      } else {
        groupMap.set(key, {
          title: p.title,
          prices: mode ? { [mode]: p.gross_price } : {},
          categoryNames: p.category_name ? [p.category_name] : [],
          statuses: [p.status],
          ids: [p.id],
          isGrouped: false,
        });
      }
    }

    // Mark groups with multiple entries
    groupMap.forEach((g) => {
      g.isGrouped = g.ids.length > 1;
    });

    const rows = Array.from(groupMap.values());
    const uniqueNames = rows.length;
    const grouped = vendusProductsList.length - noTitle - uniqueNames;

    return { uniqueNames, grouped, noTitle, rows };
  }, [vendusProductsList]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sincronizacao de Produtos
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium mb-2">
            Erro ao carregar dados
          </p>
          <p className="text-red-600 text-sm mb-4">{fetchError}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
          >
            Tentar novamente
          </button>
        </div>
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

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-3">
          <svg
            className="w-5 h-5 text-amber-600 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Modo Somente-Leitura
            </p>
            <p className="text-xs text-amber-700">
              <code className="font-mono bg-amber-100 px-1 rounded">
                VENDUS_READONLY=true
              </code>{" "}
              — Exportacao e sincronizacão completa estao desativadas. Apenas
              importacao (pull) é permitida.
            </p>
          </div>
        </div>
      )}

      {/* Stats — clickable filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            key: "all" as const,
            label: "Todos",
            value: stats.total,
            color: "text-gray-900",
            ring: "ring-gray-400",
          },
          {
            key: "synced" as const,
            label: "Sincronizados",
            value: stats.synced,
            color: "text-green-600",
            ring: "ring-green-400",
          },
          {
            key: "pending" as const,
            label: "Pendentes",
            value: stats.pending,
            color: "text-yellow-600",
            ring: "ring-yellow-400",
          },
          {
            key: "error" as const,
            label: "Com Erro",
            value: stats.error,
            color: "text-red-600",
            ring: "ring-red-400",
          },
          {
            key: "no_vendus" as const,
            label: "Sem Vendus",
            value: stats.no_vendus,
            color: "text-gray-500",
            ring: "ring-gray-400",
          },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() =>
              setStatusFilter(s.key === statusFilter ? "all" : s.key)
            }
            aria-pressed={statusFilter === s.key}
            className={`bg-white p-4 rounded-xl shadow-sm border text-left transition-all ${
              statusFilter === s.key
                ? `border-transparent ring-2 ${s.ring}`
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Sync Actions */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-1">Acoes de Sincronizacao</h2>
        <p className="text-xs text-gray-500 mb-4">
          Use &quot;Pre-visualizar&quot; para rever importacoes antes de
          confirmar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Import: Vendus → Sushi */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 uppercase tracking-wide">
              <span>Vendus</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
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
          <div
            className={`rounded-lg border border-orange-200 bg-orange-50/50 p-3 space-y-2 ${isReadOnly ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 uppercase tracking-wide">
              <span>Sushi</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <span>Vendus</span>
              {isReadOnly && (
                <span className="ml-auto text-gray-400 normal-case tracking-normal">
                  bloqueado
                </span>
              )}
            </div>
            <button
              onClick={() => handleSync("push")}
              disabled={isSyncing || isReadOnly}
              title={
                isReadOnly ? "Desativado: VENDUS_READONLY=true" : undefined
              }
              className="w-full px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A exportar..." : "Exportar pendentes"}
            </button>
            <button
              onClick={() => handleSync("push", { pushAll: true })}
              disabled={isSyncing || isReadOnly}
              title={
                isReadOnly ? "Desativado: VENDUS_READONLY=true" : undefined
              }
              className="w-full px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A exportar..." : "Exportar tudo"}
            </button>
          </div>

          {/* Full Sync: both directions */}
          <div
            className={`rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/5 p-3 space-y-2 ${isReadOnly ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#B8960C] uppercase tracking-wide">
              <span>Vendus</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              <span>Sushi</span>
              {isReadOnly && (
                <span className="ml-auto text-gray-400 normal-case tracking-normal">
                  bloqueado
                </span>
              )}
            </div>
            <button
              onClick={() => handleSync("both")}
              disabled={isSyncing || isReadOnly}
              title={
                isReadOnly ? "Desativado: VENDUS_READONLY=true" : undefined
              }
              className="w-full px-3 py-1.5 text-sm bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#C4A030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? "A sincronizar..." : "Sincronizacao completa"}
            </button>
          </div>
        </div>

        {/* Reset actions - moved to Gestao de Produtos section below */}

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
                  <div
                    key={p.vendusId}
                    className="text-amber-800 flex items-center gap-2"
                  >
                    <span>
                      + Criar: {p.name} ({p.price.toFixed(2)} EUR)
                    </span>
                    {p.serviceModes && p.serviceModes.length > 0 && (
                      <ServiceModeBadges modes={p.serviceModes} />
                    )}
                    {p.categoryAutoMatched && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                        auto-cat
                      </span>
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
                  <div
                    key={p.vendusId}
                    className="text-amber-800 flex items-center gap-2"
                  >
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p
                  className={
                    syncResult.success ? "text-green-700" : "text-red-700"
                  }
                >
                  {syncResult.success
                    ? `Sincronizacao concluida: ${syncResult.recordsUpdated} atualizados, ${syncResult.recordsCreated} criados (${syncResult.duration}ms)`
                    : `Sincronizacao parada: ${syncResult.errors?.[0]?.error || "Erro desconhecido"}`}
                </p>
                {syncResult.recordsFailed > 0 && (
                  <div className="text-red-600 text-sm mt-1 space-y-0.5">
                    <p>
                      Parou no erro do produto. {syncResult.recordsProcessed}{" "}
                      processado(s) antes de parar.
                    </p>
                    {syncResult.errors.map((e) => (
                      <p
                        key={e.id}
                        className="text-xs font-mono bg-red-100 px-2 py-1 rounded"
                      >
                        {e.error}
                      </p>
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
              {syncResult.syncLogId && (
                <div className="shrink-0">
                  {!confirmRevert ? (
                    <button
                      onClick={() => setConfirmRevert(true)}
                      className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Reverter
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-red-600">
                        Reverter esta sincronizacao?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleRevert}
                          disabled={isReverting}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {isReverting ? "A reverter..." : "Confirmar"}
                        </button>
                        <button
                          onClick={() => setConfirmRevert(false)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {revertResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              revertResult.success
                ? "bg-blue-50 border border-blue-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p
              className={
                revertResult.success ? "text-blue-700" : "text-red-700"
              }
            >
              {revertResult.success
                ? `Sync revertido: ${revertResult.restored} produtos restaurados`
                : revertResult.message || "Erro ao reverter"}
            </p>
          </div>
        )}
      </div>

      {/* Gestao de Produtos */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Gestao de Produtos
        </h2>

        {/* Product Source Overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.total - stats.no_vendus}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Produtos Vendus</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{orphansCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sem Vendus ID</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Produtos</p>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap gap-4 items-start">
          {/* Delete orphans */}
          <div className="flex flex-col gap-1">
            {!showOrphansPreview ? (
              <button
                onClick={handleLoadOrphansPreview}
                disabled={isLoadingOrphans || orphansCount === 0}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoadingOrphans
                  ? "A carregar..."
                  : `Apagar sem Vendus ID (${orphansCount})`}
              </button>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 w-96">
                {orphans.length > 0 ? (
                  <>
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Apagar {orphans.length} produto(s) sem Vendus ID?
                    </p>
                    <p className="text-xs text-red-600 mb-2">
                      Pedidos e ingredientes associados serao tambem removidos.
                    </p>
                    <div className="max-h-36 overflow-y-auto text-xs space-y-0.5 mb-3">
                      {orphans.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between text-red-700"
                        >
                          <span className="truncate max-w-[220px]">
                            {p.name}
                          </span>
                          <span className="tabular-nums">
                            {p.price.toFixed(2)} EUR
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 mb-3">
                    Nenhum produto orfao encontrado.
                  </p>
                )}
                <div className="flex gap-2">
                  {orphans.length > 0 && (
                    <button
                      onClick={handleConfirmDeleteOrphans}
                      disabled={isDeletingOrphans}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeletingOrphans
                        ? "A apagar..."
                        : `Confirmar apagar (${orphans.length})`}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowOrphansPreview(false);
                      setOrphans([]);
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Remove produtos locais que nao existem no Vendus
            </p>
          </div>

          {/* Ver produtos no Vendus */}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleLoadVendusProducts}
              disabled={isLoadingVendusProducts || !selectedLocation}
              className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoadingVendusProducts
                ? "A carregar..."
                : "Ver produtos no Vendus"}
            </button>
            <p className="text-xs text-gray-400">
              Lista somente-leitura do catalogo Vendus
            </p>
          </div>

          {/* Divider */}
          <div className="border-l border-gray-200 h-10 self-center" />

          {/* Reset com erro */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleResetStatus(true)}
              disabled={isResetting || isSyncing || stats.error === 0}
              title="Limpa o status de erro para que possam ser re-sincronizados na proxima operacao"
              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isResetting
                ? "A resetar..."
                : `Resetar com erro (${stats.error})`}
            </button>
            <p className="text-xs text-gray-400">
              Limpa erros para nova tentativa de sync
            </p>
          </div>

          {/* Resetar todos */}
          <div className="flex flex-col gap-1">
            {!confirmResetAll ? (
              <button
                onClick={() => setConfirmResetAll(true)}
                disabled={isResetting || isSyncing}
                title="Define todos os produtos como pendentes para forcar uma re-sincronizacao completa"
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Resetar todos para pendente
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600">Confirmar?</span>
                <button
                  onClick={() => {
                    handleResetStatus(false);
                    setConfirmResetAll(false);
                  }}
                  disabled={isResetting}
                  className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isResetting ? "A resetar..." : "Confirmar"}
                </button>
                <button
                  onClick={() => setConfirmResetAll(false)}
                  className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Forca re-sincronizacao de todos os produtos
            </p>
          </div>
        </div>
      </div>

      {/* Search + filter info */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Filtro:{" "}
              {statusFilter === "synced"
                ? "Sincronizados"
                : statusFilter === "pending"
                  ? "Pendentes"
                  : statusFilter === "error"
                    ? "Com Erro"
                    : "Sem Vendus"}
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {(statusFilter !== "all" || searchTerm) && (
          <p className="text-xs text-gray-400 mt-2">
            A mostrar {filteredProducts.length} de {visibleProducts.length}{" "}
            produtos
          </p>
        )}
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
                  <p className="font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.category_name || "Sem categoria"}
                  </p>
                </div>
                {getSyncBadge(product.vendus_sync_status)}
              </div>

              {/* Price + Service Modes */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#D4AF37] tabular-nums">
                  {product.price.toFixed(2)} EUR
                </span>
                {!product.is_available && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    Indisponivel
                  </span>
                )}
              </div>

              {/* Service Modes */}
              <ServiceModeBadges modes={product.service_modes} />

              {/* Vendus info */}
              <div className="mt-auto pt-2 border-t border-gray-100 text-xs text-gray-400">
                {product.vendus_ids &&
                Object.keys(product.vendus_ids).length > 0 ? (
                  <div className="space-y-0.5 mb-1">
                    {Object.entries(product.vendus_ids).map(([mode, vid]) => (
                      <div key={mode} className="flex justify-between">
                        <span>{SERVICE_MODE_LABELS[mode] || mode}</span>
                        <span
                          className="font-mono truncate max-w-[100px]"
                          title={vid}
                        >
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
                    ? new Date(product.vendus_synced_at).toLocaleString(
                        "pt-PT",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "Nunca sincronizado"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendus Products Modal */}
      {showVendusProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Produtos no Vendus ({vendusProductsList.length})
              </h3>
              <button
                onClick={() => setShowVendusProductsModal(false)}
                className="text-gray-400 hover:text-gray-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {vendusGrouping && vendusGrouping.grouped > 0 && (
              <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="text-blue-800 font-medium">
                  {vendusProductsList.length} registos no Vendus →{" "}
                  {vendusGrouping.uniqueNames} produtos unicos
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  {vendusGrouping.grouped} registo(s) com nome duplicado sao
                  agrupados por modo de servico (Sala / Delivery / Take Away) e
                  importados como 1 produto com precos diferentes por modo.
                </p>
                {vendusGrouping.noTitle > 0 && (
                  <p className="text-amber-600 text-xs mt-1">
                    {vendusGrouping.noTitle} registo(s) sem titulo — ignorados
                    na importacao.
                  </p>
                )}
              </div>
            )}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {!vendusGrouping || vendusGrouping.rows.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum produto encontrado no Vendus
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                      <th className="text-left pb-2">Nome</th>
                      <th className="text-right pb-2">Take Away</th>
                      <th className="text-right pb-2">Delivery</th>
                      <th className="text-right pb-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendusGrouping.rows.map((row) => {
                      const allActive = row.statuses.every(
                        (s) => s === "on",
                      );
                      const anyActive = row.statuses.some((s) => s === "on");
                      return (
                        <tr
                          key={row.ids[0]}
                          className={`border-b border-gray-50 ${row.isGrouped ? "bg-blue-50/40" : ""}`}
                        >
                          <td className="py-2 text-gray-900 max-w-[240px]">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{row.title}</span>
                              {row.isGrouped && (
                                <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-600 tabular-nums">
                                  x{row.ids.length}
                                </span>
                              )}
                            </div>
                            {row.categoryNames.length > 0 && (
                              <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                                {row.categoryNames.join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums text-gray-700">
                            {row.prices.takeaway
                              ? `${parseFloat(row.prices.takeaway).toFixed(2)}`
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 text-right tabular-nums text-gray-700">
                            {row.prices.delivery
                              ? `${parseFloat(row.prices.delivery).toFixed(2)}`
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 text-right">
                            <span
                              className={`px-2 py-0.5 text-[10px] rounded-full ${
                                allActive
                                  ? "bg-green-100 text-green-700"
                                  : anyActive
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {allActive
                                ? "Ativo"
                                : anyActive
                                  ? "Parcial"
                                  : "Inativo"}
                            </span>
                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                              {row.ids.map((id) => `#${id}`).join(", ")}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
              Vista somente-leitura — dados diretos do Vendus
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
