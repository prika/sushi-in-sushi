import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SupabaseCustomerRepository } from "@/infrastructure/repositories/SupabaseCustomerRepository";
import { TransferSessionDataUseCase } from "@/application/use-cases/customers/TransferSessionDataUseCase";

// POST - Close a session and free the table atomically via DB function
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { closeReason, cancelOrders, totalSpent } = body as {
      closeReason?: string;
      cancelOrders?: boolean;
      totalSpent?: number;
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      "close_session_transactional",
      {
        p_session_id: sessionId,
        p_cancel_orders: cancelOrders !== false,
        p_close_reason: closeReason?.trim() || null,
      }
    );

    if (error) {
      console.error("[API /sessions/close] RPC error:", error);
      return NextResponse.json(
        { error: "Erro ao encerrar sessão" },
        { status: 500 }
      );
    }

    const result = data as {
      success: boolean;
      error?: string;
      session_id?: string;
      table_id?: string;
      cancelled_orders?: number;
      close_reason?: string | null;
    };

    if (!result.success) {
      const status = result.error === "Sessão não encontrada" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Remove waiter assignment from the closed table
    if (result.table_id) {
      await supabase
        .from("waiter_tables")
        .delete()
        .eq("table_id", result.table_id);
    }

    // Transfer session data (games, ratings, allergens, companions) to customer profiles
    try {
      const { data: sessionCustomers } = await supabase
        .from("session_customers")
        .select("id, customer_id, email, allergens")
        .eq("session_id", sessionId);

      if (sessionCustomers && sessionCustomers.length > 0) {
        const customerRepository = new SupabaseCustomerRepository(supabase);
        const transferData = new TransferSessionDataUseCase(customerRepository);
        const spent = totalSpent && totalSpent > 0 ? totalSpent : 0;

        // Collect session_customer IDs for batch queries
        const scIds = sessionCustomers.map((sc) => sc.id);

        // Batch-query game, prize, and rating data in parallel
        const [answersResult, prizesResult, ratingsResult] = await Promise.all([
          supabase
            .from("game_answers")
            .select("session_customer_id, game_session_id, score_earned")
            .in("session_customer_id", scIds),
          supabase
            .from("game_prizes")
            .select("session_customer_id, redeemed")
            .in("session_customer_id", scIds),
          supabase
            .from("product_ratings")
            .select("session_customer_id, rating")
            .in("session_customer_id", scIds),
        ]);

        // Aggregate per session_customer
        const gameStats: Record<string, { gamesPlayed: Set<string>; totalScore: number }> = {};
        for (const a of answersResult.data ?? []) {
          const id = a.session_customer_id;
          if (!id) continue;
          if (!gameStats[id]) gameStats[id] = { gamesPlayed: new Set(), totalScore: 0 };
          gameStats[id].gamesPlayed.add(a.game_session_id);
          gameStats[id].totalScore += a.score_earned ?? 0;
        }

        const prizeStats: Record<string, { won: number; redeemed: number }> = {};
        for (const p of prizesResult.data ?? []) {
          const id = p.session_customer_id;
          if (!id) continue;
          if (!prizeStats[id]) prizeStats[id] = { won: 0, redeemed: 0 };
          prizeStats[id].won += 1;
          if (p.redeemed) prizeStats[id].redeemed += 1;
        }

        const ratingStats: Record<string, { count: number; sum: number }> = {};
        for (const r of ratingsResult.data ?? []) {
          const id = r.session_customer_id;
          if (!id) continue;
          if (!ratingStats[id]) ratingStats[id] = { count: 0, sum: 0 };
          ratingStats[id].count += 1;
          ratingStats[id].sum += r.rating;
        }

        // Resolve customer_ids for companion tracking
        const resolvedCustomerIds: Map<string, string> = new Map(); // scId -> customerId
        for (const sc of sessionCustomers) {
          if (sc.customer_id) {
            resolvedCustomerIds.set(sc.id, sc.customer_id);
          } else if (sc.email) {
            try {
              const found = await customerRepository.findByEmail(sc.email);
              if (found) resolvedCustomerIds.set(sc.id, found.id);
            } catch {
              // skip
            }
          }
        }
        const allCustomerIds = Array.from(resolvedCustomerIds.values());

        // Transfer data for each session_customer
        for (const sc of sessionCustomers) {
          try {
            const customerId = resolvedCustomerIds.get(sc.id);
            if (!customerId) continue;

            const gs = gameStats[sc.id];
            const ps = prizeStats[sc.id];
            const rs = ratingStats[sc.id];

            // Companions = all other customer_ids in same session
            const companionIds = allCustomerIds.filter((cid) => cid !== customerId);

            await transferData.execute({
              customerId,
              totalSpent: spent,
              sessionStats: {
                gamesPlayed: gs?.gamesPlayed.size ?? 0,
                totalScore: gs?.totalScore ?? 0,
                prizesWon: ps?.won ?? 0,
                prizesRedeemed: ps?.redeemed ?? 0,
                ratingsGiven: rs?.count ?? 0,
                ratingsSum: rs?.sum ?? 0,
                allergens: sc.allergens ?? [],
              },
              companionCustomerIds: companionIds,
            });
          } catch {
            // Don't block session close for individual transfer failures
          }
        }
      }
    } catch (transferError) {
      console.error("[API /sessions/close] Session data transfer failed:", transferError);
    }

    // eslint-disable-next-line no-console
    console.log("[API /sessions/close] Success:", {
      sessionId,
      tableId: result.table_id,
      cancelledOrders: result.cancelled_orders,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      tableId: result.table_id,
      cancelledOrders: result.cancelled_orders ?? 0,
      closeReason: result.close_reason ?? null,
    });
  } catch (error) {
    console.error("[API /sessions/close] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao encerrar sessão" },
      { status: 500 }
    );
  }
}
