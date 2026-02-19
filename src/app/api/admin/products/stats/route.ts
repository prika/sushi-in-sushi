import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/products/stats
 * Returns order count (quantity summed) per product_id for "most chosen" metric.
 * Excludes cancelled orders.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: rows, error } = await supabase
      .from("orders")
      .select("product_id, quantity")
      .neq("status", "cancelled");

    if (error) {
      console.error("Products stats error:", error);
      return NextResponse.json(
        { error: "Erro ao obter estatísticas" },
        { status: 500 }
      );
    }

    const orderCountByProductId: Record<string, number> = {};
    for (const row of rows ?? []) {
      const id = String(row.product_id);
      orderCountByProductId[id] = (orderCountByProductId[id] ?? 0) + (row.quantity ?? 1);
    }

    return NextResponse.json({
      orderCountByProductId,
    });
  } catch (err) {
    console.error("Products stats error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
