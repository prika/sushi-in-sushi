import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/mesa/product-ratings?productId=123
 * Returns aggregate rating data (average + count) for products.
 * Public endpoint — no auth required.
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  const productIds = request.nextUrl.searchParams.get("productIds");

  const rawIds: string[] = [];
  if (productId) rawIds.push(productId);
  if (productIds) rawIds.push(...productIds.split(",").map((s) => s.trim()).filter(Boolean));

  // product_id is integer in DB
  const ids = rawIds.map(Number).filter((n) => !isNaN(n));

  if (rawIds.length === 0) {
    return NextResponse.json(
      { error: "productId or productIds required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_ratings")
      .select("product_id, rating")
      .in("product_id", ids);

    if (error) {
      console.error("Product ratings fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const agg: Record<string, { sum: number; count: number }> = {};
    for (const r of data ?? []) {
      const pid = String(r.product_id);
      if (!agg[pid]) agg[pid] = { sum: 0, count: 0 };
      agg[pid].sum += r.rating;
      agg[pid].count += 1;
    }

    const ratings: Record<string, { avgRating: number; count: number }> = {};
    for (const [pid, { sum, count }] of Object.entries(agg)) {
      ratings[pid] = {
        avgRating: Math.round((sum / count) * 10) / 10,
        count,
      };
    }

    return NextResponse.json({ ratings });
  } catch (err) {
    console.error("Product ratings API error:", err);
    return NextResponse.json(
      { error: "Erro ao obter avaliações" },
      { status: 500 },
    );
  }
}
