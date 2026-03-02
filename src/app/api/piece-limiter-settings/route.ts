import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SupabaseReservationSettingsRepository } from "@/infrastructure/repositories/SupabaseReservationSettingsRepository";
import { GetReservationSettingsUseCase } from "@/application/use-cases/reservation-settings";

export const dynamic = "force-dynamic";

// GET - Public endpoint for piece limiter settings (no auth needed)
// Only exposes piece limiter + waste fee fields (no admin data)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const repository = new SupabaseReservationSettingsRepository(supabase);
    const useCase = new GetReservationSettingsUseCase(repository);
    const result = await useCase.execute();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      piece_limiter_enabled: result.data.pieceLimiterEnabled,
      piece_limiter_mode: result.data.pieceLimiterMode,
      piece_limiter_max_per_person: result.data.pieceLimiterMaxPerPerson,
      rodizio_waste_fee_per_piece: result.data.rodizioWasteFeePerPiece,
      rodizio_waste_policy_enabled: result.data.rodizioWastePolicyEnabled,
    });
  } catch (error) {
    console.error("[API /piece-limiter-settings GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao obter configurações" },
      { status: 500 }
    );
  }
}
