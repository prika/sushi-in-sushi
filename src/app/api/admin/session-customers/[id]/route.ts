import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/session-customers/[id]
 * Returns detailed session customer data with game history, prizes and orders.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // 1. Fetch session customer with session + table
    const { data: sc, error: scError } = await supabase
      .from("session_customers")
      .select(
        `
        *,
        sessions!inner(id, started_at, ended_at, status, is_rodizio, table_id,
          tables!inner(number, name, location)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (scError || !sc) {
      return NextResponse.json(
        { error: "Cliente de sessão não encontrado" },
        { status: 404 },
      );
    }

    // 2. Fetch game answers, prizes, and orders in parallel
    const [answersResult, prizesResult, ordersResult] = await Promise.all([
      supabase
        .from("game_answers")
        .select(
          `
          id, game_type, score_earned, answered_at, answer,
          game_questions(question_text, category, difficulty),
          products(name)
        `,
        )
        .eq("session_customer_id", id)
        .order("answered_at", { ascending: false })
        .limit(500),
      supabase
        .from("game_prizes")
        .select("id, prize_type, prize_value, prize_description, total_score, redeemed, redeemed_at, created_at")
        .eq("session_customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, product_id, quantity, unit_price, status, notes, created_at, products(name)")
        .eq("session_customer_id", id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const session = sc.sessions as any;
    const table = session?.tables;

    // 3. Map response
    const gameAnswers = (answersResult.data ?? []).map((a: any) => ({
      id: a.id,
      gameType: a.game_type,
      scoreEarned: a.score_earned,
      answeredAt: a.answered_at,
      questionText: a.game_questions?.question_text ?? null,
      questionCategory: a.game_questions?.category ?? null,
      productName: a.products?.name ?? null,
    }));

    const prizes = (prizesResult.data ?? []).map((p) => ({
      id: p.id,
      prizeType: p.prize_type,
      prizeValue: p.prize_value,
      prizeDescription: p.prize_description,
      totalScore: p.total_score,
      redeemed: p.redeemed,
      redeemedAt: p.redeemed_at,
      createdAt: p.created_at,
    }));

    const orders = (ordersResult.data ?? []).map((o: any) => ({
      id: o.id,
      productName: o.products?.name ?? `Produto #${o.product_id}`,
      quantity: o.quantity,
      unitPrice: o.unit_price,
      status: o.status,
      notes: o.notes,
      createdAt: o.created_at,
    }));

    return NextResponse.json({
      id: sc.id,
      sessionId: sc.session_id,
      displayName: sc.display_name,
      fullName: sc.full_name,
      email: sc.email,
      phone: sc.phone,
      birthDate: sc.birth_date,
      tier: sc.tier,
      isSessionHost: sc.is_session_host,
      marketingConsent: sc.marketing_consent,
      allergens: sc.allergens ?? [],
      customerId: sc.customer_id,
      createdAt: sc.created_at,
      updatedAt: sc.updated_at,
      // Session context
      tableNumber: table?.number ?? null,
      tableName: table?.name ?? null,
      tableLocation: table?.location ?? null,
      sessionStartedAt: session?.started_at ?? null,
      sessionEndedAt: session?.ended_at ?? null,
      sessionStatus: session?.status ?? null,
      isRodizio: session?.is_rodizio ?? false,
      // Game data
      gameAnswers,
      prizes,
      orders,
    });
  } catch (error) {
    console.error("Error in session-customer detail API:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
