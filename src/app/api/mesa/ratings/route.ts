import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/mesa/ratings?sessionId=xxx&sessionCustomerId=xxx
 * Returns table leader (most-loved product this session) and user's rating count.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const sessionCustomerId = request.nextUrl.searchParams.get("sessionCustomerId") ?? undefined;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: ratings, error } = await supabase
      .from("product_ratings")
      .select("product_id, rating, session_customer_id, order_id")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Ratings fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = ratings ?? [];

    // Table leader: product with highest total rating (sum of ratings)
    const byProduct: Record<number, { sum: number; count: number }> = {};
    for (const r of list) {
      const id = r.product_id as number;
      if (!byProduct[id]) byProduct[id] = { sum: 0, count: 0 };
      byProduct[id].sum += r.rating ?? 0;
      byProduct[id].count += 1;
    }
    const leaderEntry = Object.entries(byProduct).sort(
      (a, b) => b[1].sum - a[1].sum
    )[0];
    const tableLeader = leaderEntry
      ? { productId: leaderEntry[0], totalScore: leaderEntry[1].sum, voteCount: leaderEntry[1].count }
      : null;

    // User's ratings: only for identified session_customer (so drink reward is per person)
    const userRatings = sessionCustomerId
      ? list.filter((r) => r.session_customer_id === sessionCustomerId)
      : [];
    const userRatingCount = userRatings.length;
    const userRatedProductIds = userRatings.map((r) => Number(r.product_id));
    const userRatedOrderIds = userRatings
      .map((r) => r.order_id)
      .filter((id): id is string => id !== null);

    const totalRatingsAtTable = list.length;

    return NextResponse.json({
      tableLeader,
      userRatingCount,
      userRatedProductIds,
      userRatedOrderIds,
      totalRatingsAtTable,
    });
  } catch (err) {
    console.error("Ratings API error:", err);
    return NextResponse.json({ error: "Erro ao obter avaliações" }, { status: 500 });
  }
}

/**
 * POST /api/mesa/ratings
 * Body: { sessionId, sessionCustomerId?, productId, orderId?, rating 1-5 }
 * When orderId is provided, uses per-order-item uniqueness.
 * When orderId is absent, falls back to per-product uniqueness (legacy).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, sessionCustomerId, productId, orderId, rating } = body;

    if (!sessionId || productId == null || rating == null) {
      return NextResponse.json(
        { error: "sessionId, productId e rating são obrigatórios" },
        { status: 400 }
      );
    }
    const r = Number(rating);
    if (r < 1 || r > 5 || !Number.isInteger(r)) {
      return NextResponse.json({ error: "rating deve ser 1 a 5" }, { status: 400 });
    }

    const supabase = await createClient();

    const row = {
      session_id: sessionId as string,
      product_id: Number(productId),
      rating: r,
      session_customer_id: (sessionCustomerId as string) || null,
      order_id: (orderId as string) || null,
    };

    let result: { data: { id?: string } | null; error: { message: string } | null };

    if (orderId) {
      // Per-order-item rating: use order_id unique constraint
      if (sessionCustomerId) {
        result = await supabase
          .from("product_ratings")
          .upsert(row, {
            onConflict: "session_id,session_customer_id,order_id",
          })
          .select("id")
          .single();
      } else {
        result = await supabase.from("product_ratings").insert(row).select("id").single();
      }
    } else {
      // Legacy per-product rating
      if (sessionCustomerId) {
        result = await supabase
          .from("product_ratings")
          .upsert(row, {
            onConflict: "session_id,session_customer_id,product_id",
          })
          .select("id")
          .single();
      } else {
        result = await supabase.from("product_ratings").insert(row).select("id").single();
      }
    }

    const { data, error } = result;
    if (error) {
      console.error("Rating submit error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("Ratings POST error:", err);
    return NextResponse.json({ error: "Erro ao guardar avaliação" }, { status: 500 });
  }
}
