/**
 * Vendus Product Synchronization Service
 */

import { createClient } from "@/lib/supabase/server";
import { VendusClient, getVendusClient, VendusApiError } from "./client";
import { getVendusConfig, VENDUS_TAX_RATES } from "./config";
import type {
  VendusProductRequest,
  VendusProductsResponse,
  ProductSyncOptions,
  SyncResult,
} from "./types";

// Helper to get typed supabase query for tables not in generated types
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// =============================================
// PRODUCT SYNC
// =============================================

/**
 * Synchronize products between local database and Vendus
 */
export async function syncProducts(options: ProductSyncOptions): Promise<SyncResult> {
  const { locationSlug, direction, productIds, initiatedBy } = options;
  const startTime = Date.now();

  const config = getVendusConfig(locationSlug);
  if (!config) {
    throw new Error(`Vendus nao configurado para ${locationSlug}`);
  }

  const client = getVendusClient(config, locationSlug);
  const supabase = await createClient();
  const extendedSupabase = getExtendedSupabase(supabase);

  const result: SyncResult = {
    success: true,
    operation: direction === "push" ? "product_push" : direction === "pull" ? "product_pull" : "product_sync",
    direction,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
    duration: 0,
  };

  // Log sync start
  const { data: logEntry } = await extendedSupabase
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
      await pullProductsFromVendus(client, extendedSupabase, result);
    }

    if (direction === "push" || direction === "both") {
      await pushProductsToVendus(client, extendedSupabase, result, productIds);
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
    await extendedSupabase
      .from("vendus_sync_log")
      .update({
        status: result.success ? "success" : result.errors.length > 0 ? "partial" : "error",
        records_processed: result.recordsProcessed,
        records_created: result.recordsCreated,
        records_updated: result.recordsUpdated,
        records_failed: result.recordsFailed,
        error_message: result.errors[0]?.error,
        error_details: result.errors.length > 0 ? { errors: result.errors } : null,
        completed_at: new Date().toISOString(),
        duration_ms: result.duration,
      })
      .eq("id", logEntry.id);
  }

  return result;
}

/**
 * Pull products from Vendus and update local database
 */
async function pullProductsFromVendus(
  client: VendusClient,
  supabase: ReturnType<typeof getExtendedSupabase>,
  result: SyncResult
): Promise<void> {
  console.log("[Vendus] Pulling products from Vendus...");

  try {
    const response = await client.get<VendusProductsResponse>("/products");
    const vendusProducts = response.products || [];

    console.log(`[Vendus] Found ${vendusProducts.length} products in Vendus`);

    for (const vProduct of vendusProducts) {
      result.recordsProcessed++;

      try {
        // Check if product exists locally by vendus_id
        const { data: existing } = await supabase
          .from("products")
          .select("id, updated_at")
          .eq("vendus_id", vProduct.id)
          .single();

        const productData = {
          vendus_id: vProduct.id,
          vendus_reference: vProduct.reference,
          vendus_tax_id: vProduct.tax_id,
          vendus_synced_at: new Date().toISOString(),
          vendus_sync_status: "synced",
        };

        if (existing) {
          // Update existing product's Vendus fields
          await supabase.from("products").update(productData).eq("id", existing.id);
          result.recordsUpdated++;
        } else {
          // Try to match by name if no vendus_id match
          const { data: nameMatch } = await supabase
            .from("products")
            .select("id")
            .ilike("name", vProduct.name)
            .is("vendus_id", null)
            .single();

          if (nameMatch) {
            await supabase.from("products").update(productData).eq("id", nameMatch.id);
            result.recordsUpdated++;
            console.log(`[Vendus] Matched product by name: ${vProduct.name}`);
          }
          // Note: We don't auto-create products from Vendus as they need category assignment
        }
      } catch (error) {
        result.recordsFailed++;
        result.errors.push({
          id: vProduct.id,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }
  } catch (error) {
    throw new Error(
      `Erro ao obter produtos do Vendus: ${error instanceof VendusApiError ? error.getUserMessage() : (error as Error).message}`
    );
  }
}

/**
 * Push local products to Vendus
 */
async function pushProductsToVendus(
  client: VendusClient,
  supabase: ReturnType<typeof getExtendedSupabase>,
  result: SyncResult,
  productIds?: string[]
): Promise<void> {
  console.log("[Vendus] Pushing products to Vendus...");

  // Fetch local products that need syncing
  let query = supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .or("vendus_sync_status.eq.pending,vendus_sync_status.is.null");

  if (productIds?.length) {
    query = supabase
      .from("products")
      .select("*")
      .in("id", productIds);
  }

  const { data: products, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Erro ao obter produtos locais: ${fetchError.message}`);
  }

  if (!products || products.length === 0) {
    console.log("[Vendus] No products to push");
    return;
  }

  console.log(`[Vendus] Pushing ${products.length} products to Vendus`);

  for (const product of products as Array<{ id: string; name: string; description: string | null; price: number; is_available: boolean; vendus_id: string | null }>) {
    result.recordsProcessed++;

    try {
      const vendusData: VendusProductRequest = {
        reference: product.id.substring(0, 20),
        name: product.name,
        description: product.description || "",
        price: product.price,
        tax_id: VENDUS_TAX_RATES.NORMAL,
        is_active: product.is_available,
      };

      let vendusId = product.vendus_id;

      if (vendusId) {
        await client.put(`/products/${vendusId}`, vendusData as unknown as Record<string, unknown>);
        result.recordsUpdated++;
        console.log(`[Vendus] Updated product: ${product.name}`);
      } else {
        const response = await client.post<{ id: string }>(
          "/products",
          vendusData as unknown as Record<string, unknown>
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
        error instanceof VendusApiError ? error.getUserMessage() : (error as Error).message;

      result.errors.push({
        id: product.id,
        error: errorMessage,
      });

      await supabase
        .from("products")
        .update({ vendus_sync_status: "error" })
        .eq("id", product.id);

      console.error(`[Vendus] Failed to sync product ${product.name}: ${errorMessage}`);
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
  const extendedSupabase = getExtendedSupabase(supabase);

  const { data } = await extendedSupabase
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
  const extendedSupabase = getExtendedSupabase(supabase);

  await extendedSupabase
    .from("products")
    .update({ vendus_sync_status: "pending" })
    .eq("id", productId);
}

/**
 * Get products with sync status
 */
export async function getProductsWithSyncStatus() {
  const supabase = await createClient();
  const extendedSupabase = getExtendedSupabase(supabase);

  const { data, error } = await extendedSupabase
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
  const extendedSupabase = getExtendedSupabase(supabase);

  const { data: products } = await extendedSupabase
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
    pending: productList.filter((p) => p.vendus_sync_status === "pending" || !p.vendus_sync_status).length,
    error: productList.filter((p) => p.vendus_sync_status === "error").length,
  };
}
