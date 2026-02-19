/**
 * Vendus Product Synchronization Service
 *
 * Sincronização bidirecional de produtos entre Supabase e Vendus POS.
 * Suporta push (exportar), pull (importar), conflitos e modo de pré-visualização.
 *
 * @module vendus/products
 * @see docs/VENDUS_SYNC.md
 */

import { createClient } from "@/lib/supabase/server";
import { VendusClient, getVendusClient, VendusApiError } from "./client";
import { getVendusConfig, VENDUS_TAX_RATES } from "./config";
import { syncCategoriesToVendus } from "./categories";
import type {
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
 * @param options.syncCategoriesFirst - No push: exportar categorias antes
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
    syncCategoriesFirst = true,
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
  const supabase = await createClient();

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
      if (syncCategoriesFirst) {
        await syncCategoriesToVendus(locationSlug, initiatedBy);
      }
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
};

/**
 * Resolve conflict between local and Vendus product when both changed since last sync.
 * Returns the data to apply and appends warnings/conflicts to result/preview.
 */
function resolveConflict(
  localProduct: LocalProduct,
  vProduct: { id: string; name: string; updated_at?: string },
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
    const warning: SyncWarning = {
      id: vProduct.id,
      type: "conflict_resolved",
      message: `Conflito em "${vProduct.name}"${suffix}: ambos alterados. Usado: ${
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
      vendusId: vProduct.id,
      name: vProduct.name,
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  result: SyncResult,
  options: PullOptions = {},
): Promise<void> {
  const { previewOnly = false, defaultCategoryId } = options;

  console.log(
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
    const response = await client.get<VendusProductsResponse>("/products");
    const vendusProducts = response.products || [];

    console.log(`[Vendus] Found ${vendusProducts.length} products in Vendus`);

    let resolvedDefaultCategoryId = defaultCategoryId;
    if (!resolvedDefaultCategoryId) {
      const { data: firstCategory } = await supabase
        .from("categories")
        .select("id")
        .order("sort_order")
        .limit(1)
        .single();
      resolvedDefaultCategoryId = firstCategory?.id ?? undefined;
    }

    // Pre-fetch all local products to avoid N+1 queries
    const { data: allLocalProducts } = await supabase
      .from("products")
      .select(
        "id, updated_at, vendus_synced_at, name, price, description, is_available, vendus_id",
      );

    const byVendusId = new Map<string, LocalProduct>();
    const byNameLower = new Map<string, LocalProduct>();

    for (const p of (allLocalProducts || []) as LocalProduct[]) {
      if (p.vendus_id) {
        byVendusId.set(p.vendus_id, p);
      } else {
        byNameLower.set(p.name.toLowerCase(), p);
      }
    }

    for (const vProduct of vendusProducts) {
      result.recordsProcessed++;

      try {
        const vendusUpdatedAt = vProduct.updated_at
          ? new Date(vProduct.updated_at).getTime()
          : 0;

        const vendusLinkData = {
          vendus_id: vProduct.id,
          vendus_reference: vProduct.reference,
          vendus_tax_id: vProduct.tax_id,
          vendus_synced_at: new Date().toISOString(),
          vendus_sync_status: "synced" as const,
        };

        const fullUpdateData = {
          ...vendusLinkData,
          name: vProduct.name,
          description: vProduct.description ?? null,
          price: vProduct.price,
          is_available: vProduct.is_active ?? true,
        };

        // Check if product exists locally by vendus_id
        const existing = byVendusId.get(vProduct.id);

        if (existing) {
          const dataToApply = resolveConflict(
            existing, vProduct, vendusUpdatedAt,
            vendusLinkData, fullUpdateData, result, preview, "vendus_id",
          );

          if (previewOnly) {
            preview.toUpdate.push({
              vendusId: vProduct.id,
              name: vProduct.name,
              price: vProduct.price,
              action: "update",
              localId: existing.id,
            });
          } else {
            await supabase
              .from("products")
              .update(dataToApply)
              .eq("id", existing.id);
            result.recordsUpdated++;
          }
        } else {
          // Try to match by name if no vendus_id match
          const nameMatch = byNameLower.get(vProduct.name.toLowerCase());

          if (nameMatch) {
            const dataToApply = resolveConflict(
              nameMatch, vProduct, vendusUpdatedAt,
              vendusLinkData, fullUpdateData, result, preview, "name",
            );

            if (previewOnly) {
              preview.toUpdate.push({
                vendusId: vProduct.id,
                name: vProduct.name,
                price: vProduct.price,
                action: "update",
                localId: nameMatch.id,
              });
            } else {
              await supabase
                .from("products")
                .update(dataToApply)
                .eq("id", nameMatch.id);
              result.recordsUpdated++;
              console.log(`[Vendus] Matched product by name: ${vProduct.name}`);
            }

            // Remove from name map so it can't be matched again
            byNameLower.delete(vProduct.name.toLowerCase());
          } else {
            // No match - create new product from Vendus
            if (!resolvedDefaultCategoryId) {
              result.errors.push({
                id: vProduct.id,
                error: `Sem categoria por defeito. Adicione categorias ou defina defaultCategoryId para criar "${vProduct.name}"`,
              });
              result.recordsFailed++;
              continue;
            }

            if (previewOnly) {
              preview.toCreate.push({
                vendusId: vProduct.id,
                name: vProduct.name,
                price: vProduct.price,
                action: "create",
              });
            } else {
              const { error: insertError } = await supabase
                .from("products")
                .insert({
                  name: vProduct.name,
                  description: vProduct.description ?? null,
                  price: vProduct.price,
                  category_id: resolvedDefaultCategoryId,
                  is_available: vProduct.is_active ?? true,
                  is_rodizio: false,
                  sort_order: 999,
                  ...vendusLinkData,
                });

              if (insertError) {
                result.recordsFailed++;
                result.errors.push({
                  id: vProduct.id,
                  error: insertError.message,
                });
              } else {
                result.recordsCreated++;
                console.log(
                  `[Vendus] Created product from Vendus: ${vProduct.name}`,
                );
              }
            }
          }
        }
      } catch (error) {
        result.recordsFailed++;
        result.errors.push({
          id: vProduct.id,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
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
 * Push local products to Vendus
 */
async function pushProductsToVendus(
  client: VendusClient,
  supabase: Awaited<ReturnType<typeof createClient>>,
  result: SyncResult,
  options: PushProductsOptions = {},
): Promise<void> {
  const { productIds, pushAll = false } = options;

  console.log("[Vendus] Pushing products to Vendus...");

  // Fetch local products
  let query = supabase
    .from("products")
    .select(
      "id, name, description, price, is_available, vendus_id, category_id",
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
    console.log("[Vendus] No products to push");
    return;
  }

  // Build category_id -> vendus_id map for including category in Vendus
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

  console.log(`[Vendus] Pushing ${products.length} products to Vendus`);

  type ProductRow = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    is_available: boolean;
    vendus_id: string | null;
    category_id: string;
  };

  for (const product of products as ProductRow[]) {
    result.recordsProcessed++;

    try {
      const vendusCategoryId = categoryVendusMap.get(product.category_id);
      const vendusData: VendusProductRequest = {
        reference: product.id.substring(0, 20),
        name: product.name,
        description: product.description || "",
        price: product.price,
        tax_id: VENDUS_TAX_RATES.NORMAL,
        is_active: product.is_available,
      };
      if (typeof vendusCategoryId === "string") {
        vendusData.category_id = vendusCategoryId;
      }

      let vendusId = product.vendus_id;

      if (vendusId) {
        await client.put(
          `/products/${vendusId}`,
          vendusData as unknown as Record<string, unknown>,
        );
        result.recordsUpdated++;
        console.log(`[Vendus] Updated product: ${product.name}`);
      } else {
        const response = await client.post<{ id: string }>(
          "/products",
          vendusData as unknown as Record<string, unknown>,
        );
        vendusId = response.id;
        result.recordsCreated++;
        console.log(`[Vendus] Created product: ${product.name} (${vendusId})`);
      }

      await supabase
        .from("products")
        .update({
          vendus_id: vendusId,
          vendus_reference: vendusData.reference,
          vendus_synced_at: new Date().toISOString(),
          vendus_sync_status: "synced",
        })
        .eq("id", product.id);
    } catch (error) {
      result.recordsFailed++;
      const errorMessage =
        error instanceof VendusApiError
          ? error.getUserMessage()
          : (error as Error).message;

      result.errors.push({
        id: product.id,
        error: errorMessage,
      });

      await supabase
        .from("products")
        .update({ vendus_sync_status: "error" })
        .eq("id", product.id);

      console.error(
        `[Vendus] Failed to sync product ${product.name}: ${errorMessage}`,
      );
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
  const supabase = await createClient();

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
  const supabase = await createClient();

  await supabase
    .from("products")
    .update({ vendus_sync_status: "pending" })
    .eq("id", productId);
}

/**
 * Get products with sync status
 */
export async function getProductsWithSyncStatus() {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
