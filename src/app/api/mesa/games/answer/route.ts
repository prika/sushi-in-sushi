import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseGameAnswerRepository } from "@/infrastructure/repositories/SupabaseGameAnswerRepository";
import { SubmitGameAnswerUseCase } from "@/application/use-cases/games/SubmitGameAnswerUseCase";

/**
 * POST /api/mesa/games/answer
 * Body: { gameSessionId, sessionCustomerId?, questionId, gameType, answer, questionPoints?, correctAnswerIndex? }
 * Also writes to product_ratings for tinder game type
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameSessionId,
      sessionCustomerId,
      questionId,
      gameType,
      answer,
      questionPoints,
      correctAnswerIndex,
      // For tinder: also write to product_ratings
      sessionId,
      productId,
    } = body;

    if (!gameSessionId || !gameType || answer == null || (!questionId && productId == null)) {
      return NextResponse.json(
        { error: "gameSessionId, gameType, answer e (questionId ou productId) são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const answerRepo = new SupabaseGameAnswerRepository(supabase);
    const useCase = new SubmitGameAnswerUseCase(answerRepo);

    const result = await useCase.execute({
      gameSessionId,
      sessionCustomerId: sessionCustomerId || null,
      questionId: questionId || null,
      productId: productId != null ? Number(productId) : null,
      gameType,
      answer,
      questionPoints: questionPoints || 10,
      correctAnswerIndex: correctAnswerIndex ?? null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // For tinder game type, also write to product_ratings for backwards compatibility
    if (gameType === "tinder" && sessionId && productId != null) {
      const rating = answer.rating as number;
      if (rating >= 1 && rating <= 5) {
        const row = {
          session_id: sessionId as string,
          product_id: Number(productId),
          rating: rating as number,
          session_customer_id: (sessionCustomerId as string) || null,
        };

        if (sessionCustomerId) {
          await supabase
            .from("product_ratings")
            .upsert(row, { onConflict: "session_id,session_customer_id,product_id" });
        } else {
          await supabase.from("product_ratings").insert(row);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      answer: result.data,
      scoreEarned: result.data.scoreEarned,
    });
  } catch (err) {
    console.error("Games answer POST error:", err);
    return NextResponse.json({ error: "Erro ao submeter resposta" }, { status: 500 });
  }
}
