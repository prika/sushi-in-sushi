/**
 * Vendus Kitchen Printing Service
 */

import { createClient } from "@/lib/supabase/server";
import { getVendusClient, VendusApiError } from "./client";
import { getVendusConfig } from "./config";
import type {
  VendusKitchenOrder,
  SendToKitchenOptions,
  SendToKitchenResult,
} from "./types";

// =============================================
// KITCHEN PRINTING
// =============================================

/**
 * Send order to kitchen printer via Vendus
 */
export async function sendOrderToKitchen(
  options: SendToKitchenOptions,
): Promise<SendToKitchenResult> {
  const { sessionId, orderIds, locationSlug, printerId } = options;

  const config = await getVendusConfig(locationSlug);

  // If Vendus not configured, return success (kitchen printing is optional)
  if (!config) {
    console.log("[Vendus] Kitchen printing skipped - Vendus not configured");
    return { success: true };
  }

  const client = getVendusClient(config, locationSlug);
  const supabase = await createClient();

  try {
    // Fetch session with table info
    const { data: session } = await supabase
      .from("sessions")
      .select(
        `
        id,
        tables:table_id (
          number,
          name,
          vendus_table_id
        )
      `,
      )
      .eq("id", sessionId)
      .single();

    if (!session) {
      return { success: false, error: "Sessao nao encontrada" };
    }

    // Fetch orders with products
    const { data: orders } = await supabase
      .from("orders")
      .select(
        `
        id,
        quantity,
        notes,
        products:product_id (name)
      `,
      )
      .in("id", orderIds);

    if (!orders || orders.length === 0) {
      return { success: false, error: "Pedidos nao encontrados" };
    }

    // Build kitchen order
    const table = session.tables as { number: number; name: string } | null;
    const kitchenOrder: VendusKitchenOrder = {
      table_name: table?.name || `Mesa ${table?.number || "?"}`,
      table_number: table?.number,
      items: orders.map((order) => ({
        product_name:
          (order.products as { name: string } | null)?.name || "Produto",
        quantity: order.quantity,
        notes: order.notes || undefined,
      })),
      printer_id: printerId,
    };

    console.log(
      "[Vendus] Sending to kitchen:",
      kitchenOrder.table_name,
      kitchenOrder.items.length,
      "items",
    );

    // Send to Vendus kitchen API
    await client.post(
      "/kitchen/print",
      kitchenOrder as unknown as Record<string, unknown>,
    );

    // Log success
    await supabase.from("vendus_sync_log").insert({
      operation: "kitchen_print",
      direction: "push",
      entity_type: "order",
      entity_id: sessionId,
      status: "success",
      records_processed: orders.length,
    });

    console.log("[Vendus] Kitchen print successful");
    return { success: true };
  } catch (error) {
    // Kitchen printing failures should not block operations
    const errorMessage =
      error instanceof VendusApiError
        ? error.getUserMessage()
        : (error as Error).message;

    console.error("[Vendus] Kitchen print failed:", errorMessage);

    // Log failure but don't propagate error
    await supabase.from("vendus_sync_log").insert({
      operation: "kitchen_print",
      direction: "push",
      entity_type: "order",
      entity_id: sessionId,
      status: "error",
      error_message: errorMessage,
    });

    return {
      success: false,
      error: `Erro ao enviar para impressora: ${errorMessage}`,
    };
  }
}

/**
 * Send multiple orders to kitchen (batch)
 */
export async function sendOrdersToKitchen(
  sessionId: string,
  orderIds: string[],
  locationSlug: string,
): Promise<SendToKitchenResult> {
  // For simplicity, we send all orders in one kitchen ticket
  return sendOrderToKitchen({
    sessionId,
    orderIds,
    locationSlug,
  });
}

/**
 * Get available kitchen printers (if Vendus supports this)
 */
export async function getKitchenPrinters(locationSlug: string): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
  }>
> {
  const config = await getVendusConfig(locationSlug);

  if (!config) {
    return [];
  }

  const client = getVendusClient(config, locationSlug);

  try {
    const response = await client.get<{
      printers: Array<{ id: string; name: string; type: string }>;
    }>(`/stores/${config.storeId}/printers`);

    return response.printers || [];
  } catch (error) {
    console.error("[Vendus] Failed to fetch printers:", error);
    return [];
  }
}
