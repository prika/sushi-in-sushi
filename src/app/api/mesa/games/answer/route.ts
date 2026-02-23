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
      orderId,
    } = body;

    if (
      !gameSessionId ||
      !gameType ||
      answer === null ||
      (!questionId && productId === null)
    ) {
      return NextResponse.json(
        {
          error:
            "gameSessionId, gameType, answer e (questionId ou productId) são obrigatórios",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const answerRepo = new SupabaseGameAnswerRepository(supabase);
    const useCase = new SubmitGameAnswerUseCase(answerRepo);

    const result = await useCase.execute({
      gameSessionId,
      sessionCustomerId: sessionCustomerId || null,
      questionId: questionId || null,
      productId: productId !== null ? Number(productId) : null,
      gameType,
      answer,
      questionPoints: questionPoints || 10,
      correctAnswerIndex: correctAnswerIndex ?? null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // For tinder game type, also write to product_ratings for backwards compatibility
    if (gameType === "tinder" && sessionId && productId !== null) {
      if (answer === null || typeof answer !== "object") {
        return NextResponse.json(
          { error: "Para o jogo tinder, answer deve ser um objeto com rating" },
          { status: 400 },
        );
      }
      const rawRating = answer.rating;
      const rating =
        typeof rawRating === "number" && Number.isFinite(rawRating)
          ? rawRating
          : Number(rawRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "answer.rating deve ser um número entre 1 e 5" },
          { status: 400 },
        );
      }
      const row = {
        session_id: sessionId as string,
        product_id: Number(productId),
        rating,
        session_customer_id: (sessionCustomerId as string) || null,
        order_id: (orderId as string) || null,
      };

      let ratingError: { message?: string } | null = null;

      // Partial unique indexes (with WHERE clauses) can't be used with upsert onConflict.
      // Use INSERT + UPDATE fallback for all cases.
      const insertResult = await supabase.from("product_ratings").insert(row);

      if (insertResult.error?.code === "23505") {
        // Duplicate - update the existing rating instead
        let updateQuery = supabase
          .from("product_ratings")
          .update({ rating })
          .eq("session_id", sessionId)
          .eq("product_id", Number(productId));

        if (sessionCustomerId) {
          updateQuery = updateQuery.eq("session_customer_id", sessionCustomerId);
        } else {
          updateQuery = updateQuery.is("session_customer_id", null);
        }

        if (orderId) {
          updateQuery = updateQuery.eq("order_id", orderId);
        } else {
          updateQuery = updateQuery.is("order_id", null);
        }

        const updateResult = await updateQuery;
        ratingError = updateResult.error;
      } else {
        ratingError = insertResult.error;
      }

      if (ratingError) {
        console.error("product_ratings write error:", ratingError);
        return NextResponse.json(
          { error: "Erro ao guardar avaliação do produto" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      answer: result.data,
      scoreEarned: result.data.scoreEarned,
    });
  } catch (err) {
    console.error("Games answer POST error:", err);
    return NextResponse.json(
      { error: "Erro ao submeter resposta" },
      { status: 500 },
    );
  }
}
