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

    const syncLogId = body.syncLogId;
    if (!syncLogId || typeof syncLogId !== "number" || !Number.isInteger(syncLogId) || syncLogId <= 0) {
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

    // Atomically claim the revert to prevent concurrent executions
    const { data: claimedRows } = await supabase
      .from("vendus_sync_log")
      .update({ status: "reverting" })
      .eq("id", syncLogId)
      .in("status", ["completed", "failed"])
      .select("id");

    if (!claimedRows || claimedRows.length === 0) {
      return NextResponse.json(
        { error: "Este sync nao pode ser revertido (ja revertido ou em progresso)" },
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
      // Pass null directly so Supabase sends it to the DB (undefined is omitted)
      const updateData = {
        name: product.name,
        description: product.description ?? null,
        price: product.price,
        is_available: product.is_available,
        vendus_id: product.vendus_id ?? null,
        vendus_ids: product.vendus_ids ?? null,
        vendus_sync_status: product.vendus_sync_status ?? null,
        vendus_synced_at: product.vendus_synced_at ?? null,
        vendus_reference: product.vendus_reference ?? null,
        vendus_tax_id: product.vendus_tax_id ?? null,
        service_modes: product.service_modes ?? null,
        service_prices: product.service_prices ?? null,
        ...(product.category_id !== undefined ? { category_id: product.category_id ?? null } : {}),
      };

      const { error: updateError } = await supabase
        .from("products")
        .update(updateData as any)
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
