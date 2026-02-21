/**
 * Vendus Product Synchronization Service
 *
 * Sincronização bidirecional de produtos entre Supabase e Vendus POS.
 * Suporta push (exportar), pull (importar), conflitos e modo de pré-visualização.
 *
 * @module vendus/products
 * @see docs/VENDUS_SYNC.md
 */

import { createAdminClient } from "@/lib/supabase/server";
import { VendusClient, getVendusClient, VendusApiError } from "./client";
import { getVendusConfig, VENDUS_TAX_RATES } from "./config";
// Types for reading Vendus categories (used in pull/push for category mapping)
interface VendusCategory {
  id: string;
  name: string;
}

interface VendusCategoriesResponse {
  categories?: VendusCategory[];
  data?: VendusCategory[];
}
import type {
  VendusProduct,
  VendusProductRequest,
  VendusProductsResponse,
  ProductSyncOptions,
  SyncResult,
  SyncPreview,
  SyncPreviewItem,
  SyncPreviewConflict,
  SyncWarning,
} from "./types";

// =============================================
// SERVICE MODE HELPERS
// =============================================

/** Maps a Vendus category name to a service_mode value */
function vendusCategoryToServiceMode(categoryName: string): string {
  const n = categoryName.toLowerCase().trim();
  if (n.includes("delivery") || n.includes("entrega")) return "delivery";
  if (n.includes("take away") || n.includes("takeaway") || n.includes("levar"))
    return "takeaway";
  return "dine_in";
}

/** Tries to match a product to a local category by name (longest match wins) */
function matchProductToCategory(
  productName: string,
  localCategories: Array<{ id: string; name: string }>,
): string | null {
  const nameLower = productName.toLowerCase();
  let best: { id: string; len: number } | null = null;
  for (const cat of localCategories) {
    const catLower = cat.name.toLowerCase();
    if (nameLower.includes(catLower) && (!best || cat.name.length > best.len)) {
      best = { id: cat.id, len: cat.name.length };
    }
  }
  return best?.id ?? null;
}

// =============================================
// PRODUCT SYNC
// =============================================

/**
 * Sincroniza produtos entre a base de dados local e o Vendus.
 *
 * @param options - Opções de sincronização
 * @param options.locationSlug - Localização (circunvalacao, boavista)
 * @param options.direction - Direção: push (exportar), pull (importar), both
 * @param options.previewOnly - Se true, não aplica alterações e devolve preview
 * @param options.defaultCategoryId - Categoria para novos produtos no pull
 * @param options.pushAll - No push: enviar todos os produtos (ignorar status)
 * @returns Resultado com recordsCreated, recordsUpdated, warnings, preview
 * @throws Error se Vendus não estiver configurado
 */
export async function syncProducts(
  options: ProductSyncOptions,
): Promise<SyncResult> {
  const {
    locationSlug,
    direction,
    productIds,
    pushAll = false,
    previewOnly = false,
    defaultCategoryId,
    initiatedBy,
  } = options;
  const startTime = Date.now();

  const config = await getVendusConfig(locationSlug);
  if (!config) {
    throw new Error(`Vendus nao configurado para ${locationSlug}`);
  }

  const client = getVendusClient(config, locationSlug);
  const supabase = createAdminClient();

  const result: SyncResult = {
    success: true,
    operation:
      direction === "push"
        ? "product_push"
        : direction === "pull"
          ? "product_pull"
          : "product_sync",
    direction,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
    duration: 0,
  };

  // Log sync start
  const { data: logEntry } = await supabase
    .from("vendus_sync_log")
    .insert({
      operation: result.operation,
      direction,
      entity_type: "product",
      status: "started",
      initiated_by: initiatedBy,
    })
    .select("id")
    .single();

  try {
    if (direction === "pull" || direction === "both") {
      await pullProductsFromVendus(client, supabase, result, {
        previewOnly,
        defaultCategoryId,
      });
    }

    if ((direction === "push" || direction === "both") && !previewOnly) {
      await pushProductsToVendus(client, supabase, result, {
        productIds,
        pushAll,
      });
    }

    result.success = result.recordsFailed === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      id: "global",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }

  result.duration = Date.now() - startTime;

  // Update sync log
  if (logEntry?.id) {
    await supabase
      .from("vendus_sync_log")
      .update({
        status: result.success
          ? "success"
          : result.errors.length > 0
            ? "partial"
            : "error",
        records_processed: result.recordsProcessed,
        records_created: result.recordsCreated,
        records_updated: result.recordsUpdated,
        records_failed: result.recordsFailed,
        error_message: result.errors[0]?.error,
        error_details:
          result.errors.length > 0
            ? (JSON.parse(
                JSON.stringify({ errors: result.errors }),
              ) as import("@/types/database").Json)
            : null,
        completed_at: new Date().toISOString(),
        duration_ms: result.duration,
      })
      .eq("id", logEntry.id);
  }

  return result;
}

interface PullOptions {
  previewOnly?: boolean;
  defaultCategoryId?: string;
}

/**
 * Pull products from Vendus and update local database
 * - Creates new products when no match (uses default category)
 * - Updates existing: vendus_* fields + name, price, description, is_available from Vendus
 * - Conflict resolution: when both changed since last sync, newer timestamp wins (with warning)
 */
type LocalProduct = {
  id: string;
  updated_at: string | null;
  vendus_synced_at: string | null;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean;
  vendus_id: string | null;
  vendus_ids: Record<string, string> | null;
};

/**
 * Resolve conflict between local and Vendus product when both changed since last sync.
 * Returns the data to apply and appends warnings/conflicts to result/preview.
 */
function resolveConflict(
  localProduct: LocalProduct,
  vProduct: { id: number | string; title: string; updated_at?: string },
  vendusUpdatedAt: number,
  vendusLinkData: Record<string, unknown>,
  fullUpdateData: Record<string, unknown>,
  result: SyncResult,
  preview: SyncPreview,
  matchType: "vendus_id" | "name",
): Record<string, unknown> {
  const localUpdatedAt = localProduct.updated_at
    ? new Date(localProduct.updated_at).getTime()
    : 0;
  const lastSyncAt = localProduct.vendus_synced_at
    ? new Date(localProduct.vendus_synced_at).getTime()
    : 0;

  const bothChanged =
    localUpdatedAt > lastSyncAt &&
    vendusUpdatedAt > lastSyncAt &&
    lastSyncAt > 0;

  if (bothChanged) {
    const vendusWins = vendusUpdatedAt >= localUpdatedAt;
    const suffix = matchType === "name" ? " (match por nome)" : "";
    const vid = String(vProduct.id);
    const warning: SyncWarning = {
      id: vid,
      type: "conflict_resolved",
      message: `Conflito em "${vProduct.title}"${suffix}: ambos alterados. Usado: ${
        vendusWins ? "Vendus" : "local"
      } (mais recente)`,
      details: {
        localUpdatedAt: localProduct.updated_at,
        vendusUpdatedAt: vProduct.updated_at,
        resolution: vendusWins ? "vendus_wins" : "local_wins",
      },
    };
    result.warnings = result.warnings ?? [];
    result.warnings.push(warning);
    preview.conflicts.push({
      vendusId: vid,
      name: vProduct.title,
      message: warning.message,
      resolution: vendusWins ? "vendus_wins" : "local_wins",
      localUpdatedAt: localProduct.updated_at ?? undefined,
      vendusUpdatedAt: vProduct.updated_at,
    });

    return vendusWins ? fullUpdateData : vendusLinkData;
  }

  return fullUpdateData;
}

async function pullProductsFromVendus(
  client: VendusClient,
  supabase: ReturnType<typeof createAdminClient>,
  result: SyncResult,
  options: PullOptions = {},
): Promise<void> {
  const { previewOnly = false, defaultCategoryId } = options;

  console.info(
    "[Vendus] Pulling products from Vendus...",
    previewOnly ? "(preview)" : "",
  );

  const preview: SyncPreview = {
    toCreate: [],
    toUpdate: [],
    conflicts: [],
    warnings: [],
  };

  try {
    // Vendus API returns an array directly, not { products: [...] }
    // Fetch all pages to get complete product list
    let vendusProducts: VendusProduct[] = [];
    let page = 1;
    const perPage = 200;
    let hasMore = true;

    while (hasMore) {
      const raw = await client.get<VendusProduct[] | VendusProductsResponse>(
        `/products?per_page=${perPage}&page=${page}`,
      );
      const pageProducts = Array.isArray(raw) ? raw : (raw.products || []);
      vendusProducts = vendusProducts.concat(pageProducts);
      hasMore = pageProducts.length === perPage;
      page++;
    }

    console.info(`[Vendus] Found ${vendusProducts.length} products in Vendus`);

    // Fetch Vendus categories to resolve category_id → name (for service mode mapping)
    const vendusCategoryMap = new Map<number, string>();
    try {
      const rawCats = await client.get<
        VendusCategory[] | VendusCategoriesResponse
      >("/products/categories?per_page=500");
      const cats = Array.isArray(rawCats)
        ? rawCats
        : (rawCats.categories || rawCats.data || []);
      for (const vc of cats) vendusCategoryMap.set(Number(vc.id), vc.name);
    } catch {
      /* default to dine_in if categories unavailable */
    }

    // Fetch local categories for name matching and default fallback
    const { data: localCats } = await supabase
      .from("categories")
      .select("id, name")
      .order("sort_order");
    const localCategories = (localCats || []) as Array<{
      id: string;
      name: string;
    }>;

    let resolvedDefaultCategoryId = defaultCategoryId;
    if (!resolvedDefaultCategoryId && localCategories.length > 0) {
      resolvedDefaultCategoryId = localCategories[0].id;
    }

    // Pre-fetch all local products to avoid N+1 queries
    const { data: allLocalProducts } = await supabase
      .from("products")
      .select(
        "id, updated_at, vendus_synced_at, name, price, description, is_available, vendus_id, vendus_ids",
      );

    const byVendusId = new Map<string, LocalProduct>();
    const byNameLower = new Map<string, LocalProduct>();

    for (const p of (allLocalProducts || []) as LocalProduct[]) {
      let hasVendusLink = false;
      // Index by single vendus_id (legacy)
      if (p.vendus_id) {
        byVendusId.set(p.vendus_id, p);
        hasVendusLink = true;
      }
      // Index by all values in vendus_ids map
      if (p.vendus_ids && typeof p.vendus_ids === "object") {
        for (const vid of Object.values(p.vendus_ids)) {
          if (vid) {
            byVendusId.set(vid, p);
            hasVendusLink = true;
          }
        }
      }
      if (!hasVendusLink) {
        byNameLower.set(p.name.toLowerCase(), p);
      }
    }

    // ── Group Vendus products by title to merge service modes/prices ──
    interface MergedProduct {
      title: string;
      description: string | null;
      isActive: boolean;
      serviceModes: string[];
      servicePrices: Record<string, number>;
      vendusIdsByMode: Record<string, string>;
      basePrice: number;
      primaryVendusId: string;
      reference: string;
      taxId: string;
      vendusUpdatedAt: number;
      vendusUpdatedAtStr?: string;
      matchedCategoryId: string | null;
      vendusCatNames: string[];
    }

    const groupedByName = new Map<string, MergedProduct>();

    for (const vProduct of vendusProducts) {
      const productName = vProduct.title;
      if (!productName) continue;

      const vid = String(vProduct.id);
      const price = parseFloat(vProduct.gross_price) || 0;
      const isActive = vProduct.status === "on";
      const vendusCatName = vProduct.category_id
        ? (vendusCategoryMap.get(vProduct.category_id) ?? null)
        : null;
      const serviceMode = vendusCatName
        ? vendusCategoryToServiceMode(vendusCatName)
        : "dine_in";

      const key = productName.trim().toLowerCase();
      const existing = groupedByName.get(key);

      if (existing) {
        if (!existing.serviceModes.includes(serviceMode)) {
          existing.serviceModes.push(serviceMode);
        }
        existing.servicePrices[serviceMode] = price;
        existing.vendusIdsByMode[serviceMode] = vid;
        existing.basePrice = Math.min(existing.basePrice, price);
        if (isActive) existing.isActive = true;
        if (!existing.description && vProduct.description) {
          existing.description = vProduct.description;
        }
        if (vendusCatName && !existing.vendusCatNames.includes(vendusCatName)) {
          existing.vendusCatNames.push(vendusCatName);
        }
        const ts = vProduct.updated_at ? new Date(vProduct.updated_at).getTime() : 0;
        if (ts > existing.vendusUpdatedAt) {
          existing.vendusUpdatedAt = ts;
          existing.vendusUpdatedAtStr = vProduct.updated_at;
        }
      } else {
        groupedByName.set(key, {
          title: productName.trim(),
          description: vProduct.description ?? null,
          isActive: isActive,
          serviceModes: [serviceMode],
          servicePrices: { [serviceMode]: price },
          vendusIdsByMode: { [serviceMode]: vid },
          basePrice: price,
          primaryVendusId: vid,
          reference: vProduct.reference,
          taxId: vProduct.tax_id,
          vendusUpdatedAt: vProduct.updated_at ? new Date(vProduct.updated_at).getTime() : 0,
          vendusUpdatedAtStr: vProduct.updated_at,
          matchedCategoryId: matchProductToCategory(productName, localCategories),
          vendusCatNames: vendusCatName ? [vendusCatName] : [],
        });
      }
    }

    console.info(`[Vendus] Merged ${vendusProducts.length} Vendus products into ${groupedByName.size} unique products`);

    // ── Process each merged product ──────────────────────────────────
    for (const [, merged] of Array.from(groupedByName.entries())) {
      result.recordsProcessed++;

      const vid = merged.primaryVendusId;

      try {
        const vendusLinkData = {
          vendus_id: vid,
          vendus_ids: merged.vendusIdsByMode,
          vendus_reference: merged.reference,
          vendus_tax_id: merged.taxId,
          vendus_synced_at: new Date().toISOString(),
          vendus_sync_status: "synced" as const,
        };

        const fullUpdateData = {
          ...vendusLinkData,
          name: merged.title,
          description: merged.description,
          price: merged.basePrice,
          is_available: merged.isActive,
          service_modes: merged.serviceModes,
          service_prices: merged.servicePrices,
        };

        // Check if product exists locally by ANY vendus_id in the merged product
        let existingById: LocalProduct | undefined;
        const mergedVids = Object.values(merged.vendusIdsByMode) as string[];
        for (let i = 0; i < mergedVids.length; i++) {
          existingById = byVendusId.get(mergedVids[i]);
          if (existingById) break;
        }

        if (existingById) {
          const dataToApply = resolveConflict(
            existingById,
            { id: vid, title: merged.title, updated_at: merged.vendusUpdatedAtStr },
            merged.vendusUpdatedAt, vendusLinkData, fullUpdateData, result, preview, "vendus_id",
          );

          if (previewOnly) {
            preview.toUpdate.push({
              vendusId: vid,
              vendusIds: merged.vendusIdsByMode,
              name: merged.title,
              price: merged.basePrice,
              action: "update",
              localId: existingById.id,
              serviceModes: merged.serviceModes,
              servicePrices: merged.servicePrices,
              vendusCategory: merged.vendusCatNames.join(", ") || undefined,
            });
          } else {
            await supabase
              .from("products")
              .update(dataToApply)
              .eq("id", existingById.id);
            result.recordsUpdated++;
          }
        } else {
          // Try to match by name if no vendus_id match
          const nameMatch = byNameLower.get(merged.title.toLowerCase());

          if (nameMatch) {
            const dataToApply = resolveConflict(
              nameMatch,
              { id: vid, title: merged.title, updated_at: merged.vendusUpdatedAtStr },
              merged.vendusUpdatedAt, vendusLinkData, fullUpdateData, result, preview, "name",
            );

            if (previewOnly) {
              preview.toUpdate.push({
                vendusId: vid,
                vendusIds: merged.vendusIdsByMode,
                name: merged.title,
                price: merged.basePrice,
                action: "update",
                localId: nameMatch.id,
                serviceModes: merged.serviceModes,
                servicePrices: merged.servicePrices,
                vendusCategory: merged.vendusCatNames.join(", ") || undefined,
              });
            } else {
              await supabase
                .from("products")
                .update(dataToApply)
                .eq("id", nameMatch.id);
              result.recordsUpdated++;
              console.info(`[Vendus] Matched product by name: ${merged.title}`);
            }

            byNameLower.delete(merged.title.toLowerCase());
          } else {
            // No match - create new product from Vendus
            if (!resolvedDefaultCategoryId) {
              result.errors.push({
                id: vid,
                error: `Sem categoria por defeito. Adicione categorias ou defina defaultCategoryId para criar "${merged.title}"`,
              });
              result.recordsFailed++;
              continue;
            }

            if (previewOnly) {
              preview.toCreate.push({
                vendusId: vid,
                vendusIds: merged.vendusIdsByMode,
                name: merged.title,
                price: merged.basePrice,
                action: "create",
                serviceModes: merged.serviceModes,
                servicePrices: merged.servicePrices,
                vendusCategory: merged.vendusCatNames.join(", ") || undefined,
                categoryAutoMatched: !!merged.matchedCategoryId,
              });
            } else {
              const { error: insertError } = await supabase
                .from("products")
                .insert({
                  name: merged.title,
                  description: merged.description,
                  price: merged.basePrice,
                  category_id: merged.matchedCategoryId || resolvedDefaultCategoryId,
                  is_available: merged.isActive,
                  is_rodizio: false,
                  sort_order: 999,
                  service_modes: merged.serviceModes,
                  service_prices: merged.servicePrices,
                  ...vendusLinkData,
                });

              if (insertError) {
                result.recordsFailed++;
                result.errors.push({ id: vid, error: insertError.message });
                break;
              } else {
                result.recordsCreated++;
                console.info(`[Vendus] Created product from Vendus: ${merged.title}`);
              }
            }
          }
        }
      } catch (error) {
        result.recordsFailed++;
        result.errors.push({
          id: vid,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
        // Stop on first error
        break;
      }
    }

    if (previewOnly) {
      if (
        !resolvedDefaultCategoryId &&
        (preview.toCreate.length > 0 ||
          result.errors.some((e) =>
            e.error.includes("Sem categoria por defeito"),
          ))
      ) {
        preview.warnings.push({
          id: "no_category",
          type: "conflict_resolved",
          message:
            "Sem categoria por defeito. Crie categorias no sistema para importar novos produtos.",
        });
      }
      result.preview = preview;
    }
  } catch (error) {
    throw new Error(
      `Erro ao obter produtos do Vendus: ${error instanceof VendusApiError ? error.getUserMessage() : (error as Error).message}`,
    );
  }
}

interface PushProductsOptions {
  productIds?: string[];
  pushAll?: boolean;
}

/**
 * Push local products to Vendus.
 * Creates/updates one Vendus product per service mode (each with its own price and category).
 */
async function pushProductsToVendus(
  client: VendusClient,
  supabase: ReturnType<typeof createAdminClient>,
  result: SyncResult,
  options: PushProductsOptions = {},
): Promise<void> {
  const { productIds, pushAll = false } = options;

  console.info("[Vendus] Pushing products to Vendus...");

  // Fetch local products (including service_modes, service_prices, vendus_ids)
  let query = supabase
    .from("products")
    .select(
      "id, name, description, price, is_available, vendus_id, vendus_ids, category_id, service_modes, service_prices",
    )
    .eq("is_available", true);

  if (productIds?.length) {
    query = query.in("id", productIds);
  } else if (!pushAll) {
    query = query.or(
      "vendus_sync_status.eq.pending,vendus_sync_status.is.null",
    );
  }

  const { data: products, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Erro ao obter produtos locais: ${fetchError.message}`);
  }

  if (!products || products.length === 0) {
    console.info("[Vendus] No products to push");
    return;
  }

  // Build category_id -> vendus_id map (fallback for products without service mode categories)
  const categoryIds = Array.from(
    new Set(
      (products as Array<{ category_id: string }>).map((p) => p.category_id),
    ),
  );
  const { data: categories } = await supabase
    .from("categories")
    .select("id, vendus_id")
    .in("id", categoryIds);
  const categoryVendusMap = new Map(
    (categories || []).map(
      (c: { id: string; vendus_id: string | null }) =>
        [c.id, c.vendus_id] as [string, string | null],
    ),
  );

  // Build service_mode -> vendus_category_id map from Vendus categories
  const serviceModeToVendusCategoryId = new Map<string, string>();
  try {
    const rawCats = await client.get<VendusCategory[] | VendusCategoriesResponse>(
      "/products/categories?per_page=500",
    );
    const cats = Array.isArray(rawCats) ? rawCats : (rawCats.categories || rawCats.data || []);
    for (const vc of cats) {
      const mode = vendusCategoryToServiceMode(vc.name);
      if (!serviceModeToVendusCategoryId.has(mode)) {
        serviceModeToVendusCategoryId.set(mode, vc.id);
      }
    }
  } catch {
    // If categories unavailable, fall back to local category mapping
  }

  console.info(`[Vendus] Pushing ${products.length} products to Vendus`);

  type ProductRow = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    is_available: boolean;
    vendus_id: string | null;
    vendus_ids: Record<string, string> | null;
    category_id: string;
    service_modes: string[] | null;
    service_prices: Record<string, number> | null;
  };

  for (const product of products as ProductRow[]) {
    const modes = product.service_modes?.length
      ? product.service_modes
      : ["dine_in"]; // default to dine_in if no modes

    const existingVendusIds: Record<string, string> = product.vendus_ids
      ? { ...product.vendus_ids }
      : {};

    // Handle legacy: if vendus_id exists but vendus_ids is empty, map it to dine_in
    if (product.vendus_id && Object.keys(existingVendusIds).length === 0) {
      existingVendusIds["dine_in"] = product.vendus_id;
    }

    const updatedVendusIds = { ...existingVendusIds };
    let anyFailed = false;

    for (const mode of modes) {
      result.recordsProcessed++;

      try {
        const modePrice = product.service_prices?.[mode] ?? product.price;
        const vendusCategoryId =
          serviceModeToVendusCategoryId.get(mode) ??
          categoryVendusMap.get(product.category_id);

        const vendusData: VendusProductRequest = {
          reference: `${String(product.id).substring(0, 14)}_${mode.substring(0, 5)}`,
          title: product.name,
          description: product.description || "",
          gross_price: String(modePrice),
          tax_id: VENDUS_TAX_RATES.NORMAL,
          status: product.is_available ? "on" : "off",
        };
        if (typeof vendusCategoryId === "string") {
          vendusData.category_id = vendusCategoryId;
        }

        let vendusId = existingVendusIds[mode] ?? null;

        if (vendusId) {
          await client.put(
            `/products/${vendusId}`,
            vendusData as unknown as Record<string, unknown>,
          );
          result.recordsUpdated++;
          console.info(`[Vendus] Updated product: ${product.name} [${mode}]`);
        } else {
          const response = await client.post<{ id: string }>(
            "/products",
            vendusData as unknown as Record<string, unknown>,
          );
          vendusId = response.id;
          result.recordsCreated++;
          console.info(`[Vendus] Created product: ${product.name} [${mode}] (${vendusId})`);
        }

        updatedVendusIds[mode] = vendusId;
      } catch (error) {
        anyFailed = true;
        result.recordsFailed++;
        const errorMessage =
          error instanceof VendusApiError
            ? error.getUserMessage()
            : (error as Error).message;

        result.errors.push({
          id: product.id,
          error: `${product.name} [${mode}]: ${errorMessage}`,
        });

        console.error(
          `[Vendus] Failed to sync product ${product.name} [${mode}]: ${errorMessage}`,
        );
        // Stop processing remaining modes for this product
        break;
      }
    }

    // Save all vendus_ids back to local product
    const primaryVendusId =
      updatedVendusIds["dine_in"] ??
      Object.values(updatedVendusIds)[0] ??
      product.vendus_id;

    await supabase
      .from("products")
      .update({
        vendus_id: primaryVendusId,
        vendus_ids: updatedVendusIds,
        vendus_synced_at: new Date().toISOString(),
        vendus_sync_status: anyFailed ? "error" : "synced",
      })
      .eq("id", product.id);

    // Stop processing remaining products on error
    if (anyFailed) {
      console.info(`[Vendus] Sync stopped: error on product "${product.name}"`);
      break;
    }
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get sync status for a single product
 */
export async function getProductSyncStatus(productId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("products")
    .select("vendus_id, vendus_reference, vendus_sync_status, vendus_synced_at")
    .eq("id", productId)
    .single();

  return data;
}

/**
 * Mark a product for sync
 */
export async function markProductForSync(productId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("products")
    .update({ vendus_sync_status: "pending" })
    .eq("id", productId);
}

/**
 * Get products with sync status
 */
export async function getProductsWithSyncStatus() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products_with_vendus_status")
    .select("*")
    .order("name");

  if (error) {
    console.error("[Vendus] Error fetching products with status:", error);
    return [];
  }

  return data || [];
}

/**
 * Get sync statistics
 */
export async function getProductSyncStats() {
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from("products")
    .select("vendus_sync_status")
    .eq("is_available", true);

  if (!products) {
    return { total: 0, synced: 0, pending: 0, error: 0 };
  }

  const productList = products as Array<{ vendus_sync_status: string | null }>;

  return {
    total: productList.length,
    synced: productList.filter((p) => p.vendus_sync_status === "synced").length,
    pending: productList.filter(
      (p) => p.vendus_sync_status === "pending" || !p.vendus_sync_status,
    ).length,
    error: productList.filter((p) => p.vendus_sync_status === "error").length,
  };
}
