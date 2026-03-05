/**
 * Vendus Invoice Management Service
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getVendusClient, VendusApiError } from "./client";
import { getVendusConfig, VENDUS_TAX_RATES, TAX_PERCENTAGES } from "./config";
import type { VendusRetryQueue } from "@/types/database";
import type {
  VendusInvoiceRequest,
  VendusInvoiceResponse,
  VendusInvoiceItem,
  CreateInvoiceOptions,
  CreateInvoiceResult,
  VoidInvoiceResult,
  GetPdfResult,
} from "./types";

// =============================================
// INVOICE CREATION
// =============================================

/**
 * Create an invoice in Vendus for a session
 */
export async function createInvoice(
  options: CreateInvoiceOptions,
): Promise<CreateInvoiceResult> {
  const {
    sessionId,
    locationSlug,
    paymentMethodId,
    paidAmount,
    customerNif,
    customerName,
    issuedBy,
  } = options;

  const config = await getVendusConfig(locationSlug);
  if (!config) {
    return {
      success: false,
      error: "Vendus nao configurado para esta localizacao",
    };
  }

  const client = getVendusClient(config, locationSlug);
  const supabase = createAdminClient();

  try {
    // Fetch session with orders
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(
        `
        *,
        orders (
          *,
          products:product_id (id, name, price, vendus_id, vendus_ids, vendus_tax_id)
        )
      `,
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Sessao nao encontrada" };
    }

    // Get payment method vendus_id
    const { data: paymentMethod } = await supabase
      .from("payment_methods")
      .select("vendus_id, slug")
      .eq("id", paymentMethodId)
      .single();

    // Get restaurant ID
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", locationSlug)
      .single();

    // Resolve the correct vendus_id per product based on session ordering_mode
    const orderingMode: string = session.ordering_mode || "dine_in";

    // Build invoice items from orders
    const items: VendusInvoiceItem[] = [];
    let subtotal = 0;

    type OrderProduct = {
      id: string;
      name: string;
      price: number;
      vendus_id: string | null;
      vendus_ids: Record<string, string> | null;
      vendus_tax_id: string | null;
    };
    for (const order of session.orders || []) {
      const product = order.products as OrderProduct | null;
      const taxId = product?.vendus_tax_id || VENDUS_TAX_RATES.NORMAL;
      const lineTotal = order.quantity * order.unit_price;
      subtotal += lineTotal;

      // Pick vendus_id for the session's ordering mode, fallback to legacy vendus_id
      const vendusProductId =
        product?.vendus_ids?.[orderingMode] ||
        product?.vendus_id ||
        order.product_id;

      items.push({
        product_id: vendusProductId,
        quantity: order.quantity,
        unit_price: order.unit_price,
        tax_id: taxId,
        description: product?.name || "Produto",
        notes: order.notes || undefined,
      });
    }

    // Calculate tax per item (handles mixed tax rates)
    let taxAmount = 0;
    for (const item of items) {
      const itemTaxRate = TAX_PERCENTAGES[item.tax_id] ?? 0;
      const itemSubtotal = item.unit_price * item.quantity;
      taxAmount += itemSubtotal * itemTaxRate;
    }
    const total = subtotal + taxAmount;

    // Validate that paidAmount covers the total
    if (paidAmount < total) {
      return {
        success: false,
        error: `Valor pago (${paidAmount.toFixed(2)}€) e inferior ao total (${total.toFixed(2)}€)`,
      };
    }

    // Determine document type:
    // FR (Fatura-Recibo) when customer NIF is provided
    // FS (Fatura Simplificada) for anonymous sales
    const documentType = customerNif ? "FR" : "FS";

    // Build invoice request
    const invoiceRequest: VendusInvoiceRequest = {
      document_type: documentType,
      register_id: config.registerId,
      items,
      payments: [
        {
          method_id: paymentMethod?.vendus_id || "1", // Default to cash
          amount: paidAmount,
        },
      ],
    };

    // Add customer if NIF provided
    if (customerNif) {
      invoiceRequest.customer = {
        nif: customerNif,
        name: customerName,
      };
    }

    console.info("[Vendus] Creating invoice for session:", sessionId);

    // Create invoice in Vendus
    const vendusResponse = await client.post<VendusInvoiceResponse>(
      "/documents",
      invoiceRequest as unknown as Record<string, unknown>,
    );

    console.info("[Vendus] Invoice created:", vendusResponse.document_number);

    // Save invoice locally
    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        session_id: sessionId,
        restaurant_id: restaurant?.id,
        vendus_id: String(vendusResponse.id),
        vendus_document_number: vendusResponse.document_number,
        vendus_document_type: documentType,
        vendus_series: vendusResponse.series,
        vendus_hash: vendusResponse.hash,
        subtotal,
        tax_amount: taxAmount,
        total,
        payment_method_id: paymentMethodId,
        paid_amount: paidAmount,
        change_amount: paidAmount > total ? paidAmount - total : 0,
        customer_nif: customerNif,
        customer_name: customerName,
        status: "issued",
        pdf_url: vendusResponse.pdf_url,
        issued_by: issuedBy,
        raw_response: JSON.parse(JSON.stringify(vendusResponse)),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Vendus] Error saving invoice locally:", insertError);
    }

    // Log the operation
    await supabase.from("vendus_sync_log").insert({
      operation: "invoice_create",
      direction: "push",
      entity_type: "invoice",
      entity_id: invoice?.id ?? null,
      vendus_id: String(vendusResponse.id),
      restaurant_id: restaurant?.id,
      status: "success",
      initiated_by: issuedBy,
    });

    return {
      success: true,
      invoiceId: invoice?.id,
      vendusId: String(vendusResponse.id),
      documentNumber: vendusResponse.document_number,
      pdfUrl: vendusResponse.pdf_url,
    };
  } catch (error) {
    const errorMessage =
      error instanceof VendusApiError
        ? error.getUserMessage()
        : (error as Error).message;

    console.error("[Vendus] Invoice creation failed:", errorMessage);

    // Log error
    const { data: errRestaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", locationSlug)
      .single();

    await supabase.from("vendus_sync_log").insert({
      operation: "invoice_create",
      direction: "push",
      entity_type: "invoice",
      entity_id: sessionId,
      restaurant_id: errRestaurant?.id,
      status: "error",
      error_message: errorMessage,
      initiated_by: issuedBy,
    });

    // Add to retry queue if it's a retryable error
    if (error instanceof VendusApiError && error.isRetryable()) {
      await addToRetryQueue({
        operation: "invoice_create",
        entityType: "invoice",
        entityId: sessionId,
        restaurantId: errRestaurant?.id,
        payload: options as unknown as Record<string, unknown>,
      });
    }

    return { success: false, error: errorMessage };
  }
}

// =============================================
// INVOICE VOID
// =============================================

/**
 * Void an invoice (create credit note)
 */
export async function voidInvoice(
  invoiceId: string,
  reason: string,
  voidedBy: string,
): Promise<VoidInvoiceResult> {
  const supabase = createAdminClient();

  // Get invoice details
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, restaurants:restaurant_id(slug)")
    .eq("id", invoiceId)
    .single();

  if (!invoice || !invoice.vendus_id) {
    return {
      success: false,
      error: "Fatura nao encontrada ou nao sincronizada",
    };
  }

  const locationSlug =
    (invoice.restaurants as { slug: string } | null)?.slug;

  if (!locationSlug) {
    return { success: false, error: "Localizacao da fatura em falta" };
  }

  const config = await getVendusConfig(locationSlug);

  if (!config) {
    return { success: false, error: "Vendus nao configurado" };
  }

  const client = getVendusClient(config, locationSlug);

  try {
    console.info("[Vendus] Voiding invoice:", invoice.vendus_document_number);

    await client.post(`/documents/${invoice.vendus_id}/void`, { reason });

    await supabase
      .from("invoices")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        void_reason: reason,
      })
      .eq("id", invoiceId);

    // Log the operation
    await supabase.from("vendus_sync_log").insert({
      operation: "invoice_void",
      direction: "push",
      entity_type: "invoice",
      entity_id: invoiceId,
      vendus_id: invoice.vendus_id,
      status: "success",
      initiated_by: voidedBy,
    });

    console.info("[Vendus] Invoice voided successfully");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof VendusApiError
        ? error.getUserMessage()
        : (error as Error).message;

    console.error("[Vendus] Invoice void failed:", errorMessage);

    return { success: false, error: errorMessage };
  }
}

// =============================================
// PDF RETRIEVAL
// =============================================

/**
 * Get PDF URL for an invoice
 */
export async function getInvoicePdf(invoiceId: string): Promise<GetPdfResult> {
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("pdf_url, vendus_id, restaurants:restaurant_id(slug)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return { success: false, error: "Fatura nao encontrada" };
  }

  // Return cached URL if available
  if (invoice.pdf_url) {
    return { success: true, pdfUrl: invoice.pdf_url };
  }

  // Fetch PDF from Vendus if not cached
  const locationSlug =
    (invoice.restaurants as { slug: string } | null)?.slug;

  if (!locationSlug || !invoice.vendus_id) {
    return { success: false, error: "Nao foi possivel obter o PDF" };
  }

  const config = await getVendusConfig(locationSlug);

  if (!config) {
    return { success: false, error: "Nao foi possivel obter o PDF" };
  }

  const client = getVendusClient(config, locationSlug);

  try {
    const response = await client.get<{ pdf_url: string }>(
      `/documents/${invoice.vendus_id}/pdf`,
    );

    // Cache the PDF URL
    await supabase
      .from("invoices")
      .update({
        pdf_url: response.pdf_url,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return { success: true, pdfUrl: response.pdf_url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof VendusApiError
          ? error.getUserMessage()
          : "Erro ao obter PDF",
    };
  }
}

// =============================================
// INVOICE QUERIES
// =============================================

/**
 * Get invoices with details
 */
export async function getInvoices(options?: {
  locationSlug?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = createAdminClient();

  let query = supabase
    .from("invoices_with_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.locationSlug) {
    query = query.eq("location_slug", options.locationSlug);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const limit = Math.min(Math.max(options?.limit || 50, 1), 100);
  const offset = Math.max(options?.offset || 0, 0);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("[Vendus] Error fetching invoices:", error);
    return [];
  }

  return data || [];
}

/**
 * Get invoice by session ID
 */
export async function getInvoiceBySession(sessionId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("invoices_with_details")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  return data;
}

// =============================================
// RETRY QUEUE
// =============================================

/**
 * Add failed operation to retry queue
 */
async function addToRetryQueue(params: {
  operation: string;
  entityType: string;
  entityId: string;
  restaurantId?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminClient();

  // Check for existing pending retry to prevent duplicates
  const { data: existing } = await supabase
    .from("vendus_retry_queue")
    .select("id")
    .eq("operation", params.operation)
    .eq("entity_id", params.entityId)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (existing && existing.length > 0) {
    console.info(
      "[Vendus] Retry already queued for:",
      params.operation,
      params.entityId,
    );
    return;
  }

  await supabase.from("vendus_retry_queue").insert({
    operation: params.operation,
    entity_type: params.entityType,
    entity_id: params.entityId,
    restaurant_id: params.restaurantId ?? null,
    payload: JSON.parse(JSON.stringify(params.payload)),
    next_retry_at: new Date(Date.now() + 60000).toISOString(),
  });

  console.info(
    "[Vendus] Added to retry queue:",
    params.operation,
    params.entityId,
  );
}

/**
 * Process retry queue
 */
export async function processRetryQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = createAdminClient();
  const stats = { processed: 0, succeeded: 0, failed: 0 };

  // Get pending items ready for retry
  const { data } = await supabase
    .from("vendus_retry_queue")
    .select("*")
    .eq("status", "pending")
    .lt("next_retry_at", new Date().toISOString())
    .lt("attempts", 5)
    .limit(10);

  const items = (data ?? []) as VendusRetryQueue[];
  if (items.length === 0) {
    return stats;
  }

  for (const item of items) {
    stats.processed++;

    // Mark as processing
    await supabase
      .from("vendus_retry_queue")
      .update({ status: "processing", attempts: item.attempts + 1 })
      .eq("id", item.id);

    try {
      // Re-execute the operation based on type
      if (item.operation === "invoice_create") {
        const result = await createInvoice(
          item.payload as unknown as CreateInvoiceOptions,
        );
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Mark as completed
      await supabase
        .from("vendus_retry_queue")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", item.id);

      stats.succeeded++;
      console.info("[Vendus] Retry succeeded:", item.operation, item.entity_id);
    } catch (error) {
      // Calculate next retry time with exponential backoff
      const nextRetry = new Date(
        Date.now() + Math.pow(2, item.attempts) * 60000,
      );

      await supabase
        .from("vendus_retry_queue")
        .update({
          status: item.attempts >= 4 ? "failed" : "pending",
          last_error:
            error instanceof Error ? error.message : "Erro desconhecido",
          next_retry_at: nextRetry.toISOString(),
        })
        .eq("id", item.id);

      stats.failed++;
      console.error("[Vendus] Retry failed:", item.operation, item.entity_id);
    }
  }

  return stats;
}
