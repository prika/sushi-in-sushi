import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import { GetGameConfigUseCase } from "@/application/use-cases/games/GetGameConfigUseCase";
import type { GameConfig } from "@/domain/value-objects/GameConfig";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/mesa/games/config?restaurantId=... | ?restaurantSlug=...
 * Returns the restaurant's game configuration for use in game completion.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const restaurantSlug = searchParams.get("restaurantSlug");

    if (!restaurantId && !restaurantSlug) {
      return NextResponse.json(
        { error: "restaurantId ou restaurantSlug é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const restaurantRepo = new SupabaseRestaurantRepository(supabase);

    let config: GameConfig;
    if (restaurantSlug) {
      const getGameConfig = new GetGameConfigUseCase(restaurantRepo);
      const result = await getGameConfig.execute({ restaurantSlug });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      config = result.data;
    } else {
      const restaurant = await restaurantRepo.findById(restaurantId!);
      if (!restaurant) {
        return NextResponse.json(
          { error: "Restaurante não encontrado" },
          { status: 404 },
        );
      }
      config = {
        gamesEnabled: restaurant.gamesEnabled,
        gamesMode: restaurant.gamesMode,
        gamesPrizeType: restaurant.gamesPrizeType,
        gamesPrizeValue: restaurant.gamesPrizeValue,
        gamesPrizeProductId: restaurant.gamesPrizeProductId,
        gamesMinRoundsForPrize: restaurant.gamesMinRoundsForPrize,
        gamesQuestionsPerRound: restaurant.gamesQuestionsPerRound,
      };
    }

    return NextResponse.json(config);
  } catch (err) {
    console.error("Games config GET error:", err);
    return NextResponse.json(
      { error: "Erro ao obter configuração de jogos" },
      { status: 500 },
    );
  }
}
