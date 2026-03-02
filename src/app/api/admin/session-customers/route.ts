import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

/**
 * GET /api/admin/session-customers
 * Returns session customers with game stats for the admin Clientes page.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const limit = Math.min(
      Number(searchParams.get("limit")) || DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const offset = Number(searchParams.get("offset")) || 0;

    // 1. Fetch session customers with session + table info
    let query = supabase
      .from("session_customers")
      .select(
        `
        id, session_id, display_name, full_name, email, phone, birth_date,
        tier, is_session_host, marketing_consent, allergens, customer_id,
        created_at, updated_at,
        sessions!inner(id, started_at, status, is_rodizio, table_id,
          tables!inner(number, name, location)
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    const { data: sessionCustomers, error: scError, count } = await query;

    if (scError) {
      console.error("Error fetching session customers:", scError);
      return NextResponse.json(
        { error: "Erro ao carregar clientes de sessão" },
        { status: 500 },
      );
    }

    if (!sessionCustomers || sessionCustomers.length === 0) {
      return NextResponse.json({ data: [], total: count ?? 0 });
    }

    // 2. Collect IDs for batch game queries
    const scIds = sessionCustomers.map((sc) => sc.id);

    // 3. Batch queries for game data
    const [answersResult, prizesResult] = await Promise.all([
      supabase
        .from("game_answers")
        .select("session_customer_id, game_session_id, score_earned")
        .in("session_customer_id", scIds),
      supabase
        .from("game_prizes")
        .select("session_customer_id, redeemed")
        .in("session_customer_id", scIds),
    ]);

    // 4. Aggregate game answers per session customer
    const gameStats: Record<
      string,
      { gamesPlayed: Set<string>; totalScore: number; answersCount: number }
    > = {};
    for (const a of answersResult.data ?? []) {
      const id = a.session_customer_id;
      if (!id) continue;
      if (!gameStats[id]) {
        gameStats[id] = { gamesPlayed: new Set(), totalScore: 0, answersCount: 0 };
      }
      gameStats[id].gamesPlayed.add(a.game_session_id);
      gameStats[id].totalScore += a.score_earned ?? 0;
      gameStats[id].answersCount += 1;
    }

    // 5. Aggregate prizes per session customer
    const prizeStats: Record<
      string,
      { prizesCount: number; prizesRedeemed: number }
    > = {};
    for (const p of prizesResult.data ?? []) {
      const id = p.session_customer_id;
      if (!id) continue;
      if (!prizeStats[id]) {
        prizeStats[id] = { prizesCount: 0, prizesRedeemed: 0 };
      }
      prizeStats[id].prizesCount += 1;
      if (p.redeemed) prizeStats[id].prizesRedeemed += 1;
    }

    // 6. Map to response
    const data = sessionCustomers.map((sc) => {
      const session = sc.sessions as any;
      const table = session?.tables;
      const gs = gameStats[sc.id];
      const ps = prizeStats[sc.id];

      return {
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
        // Session context
        tableNumber: table?.number ?? null,
        tableName: table?.name ?? null,
        tableLocation: table?.location ?? null,
        sessionStartedAt: session?.started_at ?? null,
        sessionStatus: session?.status ?? null,
        isRodizio: session?.is_rodizio ?? false,
        // Game stats
        gamesPlayed: gs?.gamesPlayed.size ?? 0,
        totalScore: gs?.totalScore ?? 0,
        answersCount: gs?.answersCount ?? 0,
        prizesCount: ps?.prizesCount ?? 0,
        prizesRedeemed: ps?.prizesRedeemed ?? 0,
      };
    });

    return NextResponse.json({ data, total: count ?? 0 });
  } catch (error) {
    console.error("Error in session-customers API:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
