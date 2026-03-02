import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendus/sync/orphans
 * List products with no vendus_id and empty/null vendus_ids (orphans)
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, category_id, vendus_id, vendus_ids")
      .is("vendus_id", null)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter: exclude products that have entries in vendus_ids JSONB
    const orphans = (data ?? []).filter(
      (p: { vendus_ids: Record<string, string> | null }) =>
        !p.vendus_ids || Object.keys(p.vendus_ids).length === 0,
    );

    return NextResponse.json({
      count: orphans.length,
      products: orphans,
    });
  } catch (error) {
    console.error("Erro ao listar produtos orfaos:", error);
    return NextResponse.json(
      { error: "Erro ao listar produtos orfaos" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/vendus/sync/orphans
 * Delete orphan products by IDs (from GET preview)
 * Cascades: orders → product_ingredients → products
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo do pedido invalido" },
        { status: 400 },
      );
    }

    const productIds = body.productIds as string[] | undefined;
    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds obrigatorio (obtidos via GET)" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Cascade: first remove orders referencing these products
    const { error: ordersError } = await supabase
      .from("orders")
      .delete()
      .in("product_id", productIds);

    if (ordersError) {
      return NextResponse.json({ error: `Erro ao remover orders: ${ordersError.message}` }, { status: 500 });
    }

    // Then remove product_ingredients references
    const { error: piError } = await supabase
      .from("product_ingredients")
      .delete()
      .in("product_id", productIds);

    if (piError) {
      return NextResponse.json({ error: `Erro ao remover product_ingredients: ${piError.message}` }, { status: 500 });
    }

    // Finally delete the products (safety: only those without vendus_id)
    const { error, count } = await supabase
      .from("products")
      .delete({ count: "exact" })
      .in("id", productIds)
      .is("vendus_id", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: count ?? 0 });
  } catch (error) {
    console.error("Erro ao apagar produtos orfaos:", error);
    return NextResponse.json(
      { error: "Erro ao apagar produtos orfaos" },
      { status: 500 },
    );
  }
}
