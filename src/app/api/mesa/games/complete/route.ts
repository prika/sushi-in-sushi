import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseGameSessionRepository } from "@/infrastructure/repositories/SupabaseGameSessionRepository";
import { SupabaseGameAnswerRepository } from "@/infrastructure/repositories/SupabaseGameAnswerRepository";
import { SupabaseGamePrizeRepository } from "@/infrastructure/repositories/SupabaseGamePrizeRepository";
import { CompleteGameSessionUseCase } from "@/application/use-cases/games/CompleteGameSessionUseCase";
import type { GameConfig } from "@/domain/value-objects/GameConfig";

/**
 * POST /api/mesa/games/complete
 * Body: { gameSessionId, sessionId, config }
 * Completes game session, returns leaderboard and optional prize
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameSessionId, sessionId, config } = body;

    if (!gameSessionId || !sessionId) {
      return NextResponse.json(
        { error: "gameSessionId e sessionId são obrigatórios" },
        { status: 400 }
      );
    }

    const gameConfig: GameConfig = {
      gamesEnabled: config?.gamesEnabled ?? true,
      gamesMode: config?.gamesMode ?? "selection",
      gamesPrizeType: config?.gamesPrizeType ?? "none",
      gamesPrizeValue: config?.gamesPrizeValue ?? null,
      gamesPrizeProductId: config?.gamesPrizeProductId ?? null,
      gamesMinRoundsForPrize: config?.gamesMinRoundsForPrize ?? 1,
      gamesQuestionsPerRound: config?.gamesQuestionsPerRound ?? 6,
    };

    const supabase = await createClient();
    const sessionRepo = new SupabaseGameSessionRepository(supabase);
    const answerRepo = new SupabaseGameAnswerRepository(supabase);
    const prizeRepo = new SupabaseGamePrizeRepository(supabase);

    const useCase = new CompleteGameSessionUseCase(
      sessionRepo,
      answerRepo,
      prizeRepo
    );

    const result = await useCase.execute({
      gameSessionId,
      sessionId,
      config: gameConfig,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("Games complete POST error:", err);
    return NextResponse.json({ error: "Erro ao completar jogo" }, { status: 500 });
  }
}
