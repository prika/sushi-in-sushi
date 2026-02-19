import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseGamePrizeRepository } from "@/infrastructure/repositories/SupabaseGamePrizeRepository";
import { RedeemGamePrizeUseCase } from "@/application/use-cases/games/RedeemGamePrizeUseCase";

/**
 * POST /api/mesa/games/redeem
 * Body: { prizeId }
 * Marks a prize as redeemed (shown to staff)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prizeId } = body;

    if (!prizeId) {
      return NextResponse.json({ error: "prizeId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const prizeRepo = new SupabaseGamePrizeRepository(supabase);
    const useCase = new RedeemGamePrizeUseCase(prizeRepo);

    const result = await useCase.execute({ prizeId });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, prize: result.data });
  } catch (err) {
    console.error("Games redeem POST error:", err);
    return NextResponse.json({ error: "Erro ao resgatar prémio" }, { status: 500 });
  }
}
