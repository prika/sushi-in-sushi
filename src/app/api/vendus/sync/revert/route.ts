import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/vendus/sync/revert
 * Revert a product sync by restoring products from the snapshot saved in vendus_sync_log.request_data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo do pedido invalido" },
        { status: 400 },
      );
    }

    const syncLogId = body.syncLogId as number | undefined;
    if (!syncLogId) {
      return NextResponse.json(
        { error: "syncLogId obrigatorio" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Fetch the sync log entry
    const { data: logEntry, error: logError } = await supabase
      .from("vendus_sync_log")
      .select("id, status, request_data, operation, direction")
      .eq("id", syncLogId)
      .single();

    if (logError || !logEntry) {
      return NextResponse.json(
        { error: "Sync log entry nao encontrado" },
        { status: 404 },
      );
    }

    if (logEntry.status === "reverted") {
      return NextResponse.json(
        { error: "Este sync ja foi revertido" },
        { status: 409 },
      );
    }

    const requestData = logEntry.request_data as { snapshot?: Record<string, unknown>[] } | null;
    if (!requestData?.snapshot || requestData.snapshot.length === 0) {
      return NextResponse.json(
        { error: "Sem dados de snapshot para reverter" },
        { status: 400 },
      );
    }

    const snapshot = requestData.snapshot;
    let restored = 0;
    let failed = 0;

    // Restore each product from the snapshot
    for (const product of snapshot) {
      const productId = product.id as string;
      if (!productId) continue;

      // Only restore vendus-related and sync-affected fields
      // Convert null → undefined for Supabase update compatibility
      const n = (v: unknown) => (v === null ? undefined : v);
      const updateData = {
        name: product.name as string,
        description: product.description as string | null,
        price: product.price as number,
        is_available: product.is_available as boolean,
        vendus_id: n(product.vendus_id) as string | undefined,
        vendus_ids: n(product.vendus_ids) as Record<string, string> | undefined,
        vendus_sync_status: n(product.vendus_sync_status) as string | undefined,
        vendus_synced_at: n(product.vendus_synced_at) as string | undefined,
        vendus_reference: n(product.vendus_reference) as string | undefined,
        vendus_tax_id: n(product.vendus_tax_id) as string | undefined,
        service_modes: n(product.service_modes) as string[] | undefined,
        service_prices: n(product.service_prices) as Record<string, number> | undefined,
        category_id: n(product.category_id) as string | undefined,
      };

      const { error: updateError } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId);

      if (updateError) {
        failed++;
        console.error(`[Revert] Failed to restore product ${productId}:`, updateError.message);
      } else {
        restored++;
      }
    }

    // Mark sync log as reverted
    await supabase
      .from("vendus_sync_log")
      .update({ status: "reverted" })
      .eq("id", syncLogId);

    return NextResponse.json({
      success: failed === 0,
      restored,
      failed,
      total: snapshot.length,
    });
  } catch (error) {
    console.error("Erro ao reverter sync:", error);
    return NextResponse.json(
      { error: "Erro ao reverter sync" },
      { status: 500 },
    );
  }
}
