import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/vendus/sync/reset
 * Reset vendus sync status for products (back to 'pending')
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

    const productIds = body.productIds as string[] | undefined;
    const resetAll = body.resetAll as boolean | undefined;
    const onlyErrors = body.onlyErrors as boolean | undefined;

    if (!resetAll && (!productIds || productIds.length === 0)) {
      return NextResponse.json(
        { error: "productIds ou resetAll obrigatorio" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Count matching rows first
    let countQuery = supabase.from("products").select("id", { count: "exact", head: true });
    if (productIds?.length) {
      countQuery = countQuery.in("id", productIds);
    } else if (onlyErrors) {
      countQuery = countQuery.eq("vendus_sync_status", "error");
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Apply the update
    let updateQuery = supabase
      .from("products")
      .update({
        vendus_sync_status: "pending",
        vendus_synced_at: null,
      });

    if (productIds?.length) {
      updateQuery = updateQuery.in("id", productIds);
    } else if (onlyErrors) {
      updateQuery = updateQuery.eq("vendus_sync_status", "error");
    }

    const { error: updateError } = await updateQuery;
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resetCount: count ?? 0,
    });
  } catch (error) {
    console.error("Erro ao resetar sync status:", error);
    return NextResponse.json(
      { error: "Erro ao resetar sync status" },
      { status: 500 },
    );
  }
}
