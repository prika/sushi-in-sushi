import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseGameQuestionRepository } from "@/infrastructure/repositories/SupabaseGameQuestionRepository";
import { SupabaseGameSessionRepository } from "@/infrastructure/repositories/SupabaseGameSessionRepository";
import { SupabaseGameAnswerRepository } from "@/infrastructure/repositories/SupabaseGameAnswerRepository";
import { StartGameSessionUseCase } from "@/application/use-cases/games/StartGameSessionUseCase";
import { GetGameLeaderboardUseCase } from "@/application/use-cases/games/GetGameLeaderboardUseCase";

/**
 * GET /api/mesa/games?sessionId=xxx
 * Returns session leaderboard
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const answerRepo = new SupabaseGameAnswerRepository(supabase);
    const useCase = new GetGameLeaderboardUseCase(answerRepo);

    const result = await useCase.execute({ sessionId });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ leaderboard: result.data });
  } catch (err) {
    console.error("Games GET error:", err);
    return NextResponse.json({ error: "Erro ao obter leaderboard" }, { status: 500 });
  }
}

/**
 * POST /api/mesa/games
 * Body: { sessionId, questionsPerRound?, restaurantId? }
 * Starts a new game session and returns questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionsPerRound, restaurantId, gameType } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const questionRepo = new SupabaseGameQuestionRepository(supabase);
    const sessionRepo = new SupabaseGameSessionRepository(supabase);

    const useCase = new StartGameSessionUseCase(sessionRepo, questionRepo);
    const result = await useCase.execute({
      sessionId,
      gameType: gameType || undefined,
      questionsPerRound: questionsPerRound || 6,
      restaurantId: restaurantId || null,
    });

    if (!result.success) {
      console.error("Games POST use case error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("Games POST error:", err);
    return NextResponse.json({ error: "Erro ao iniciar jogo" }, { status: 500 });
  }
}
