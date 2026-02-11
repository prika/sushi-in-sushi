import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";

/**
 * GET /api/admin/game-stats
 * Returns aggregated game analytics for the admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await createClient();

    // Run all queries in parallel
    const [
      sessionsResult,
      answersResult,
      prizesResult,
      ratingsResult,
      questionStatsResult,
      dailyResult,
    ] = await Promise.all([
      // Total game sessions + breakdown by status
      supabase
        .from("game_sessions")
        .select("id, status, session_id, round_number, created_at"),

      // Total answers + score distribution
      supabase
        .from("game_answers")
        .select("id, game_type, score_earned, question_id"),

      // Prizes distributed
      supabase
        .from("game_prizes")
        .select("id, prize_type, prize_value, redeemed, created_at"),

      // Product ratings from swipe game
      supabase
        .from("product_ratings")
        .select("product_id, rating, session_id"),

      // Question accuracy: count answers per question
      supabase
        .from("game_answers")
        .select("question_id, score_earned, game_type"),

      // Sessions by day (last 30 days)
      supabase
        .from("game_sessions")
        .select("created_at")
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ),
    ]);

    // Process sessions
    const sessions = sessionsResult.data ?? [];
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed"
    ).length;
    const abandonedSessions = sessions.filter(
      (s) => s.status === "abandoned"
    ).length;
    const activeSessions = sessions.filter(
      (s) => s.status === "active"
    ).length;
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    // Unique table sessions that played games
    const uniqueTableSessions = new Set(sessions.map((s) => s.session_id)).size;

    // Process answers
    const answers = answersResult.data ?? [];
    const totalAnswers = answers.length;
    const quizAnswers = answers.filter((a) => a.game_type === "quiz");
    const prefAnswers = answers.filter((a) => a.game_type === "preference");
    const avgScore =
      answers.length > 0
        ? Math.round(
            answers.reduce((sum, a) => sum + (a.score_earned ?? 0), 0) /
              answers.length
          )
        : 0;

    // Quiz accuracy (score_earned > 0 = correct)
    const quizCorrect = quizAnswers.filter(
      (a) => (a.score_earned ?? 0) > 0
    ).length;
    const quizAccuracy =
      quizAnswers.length > 0
        ? Math.round((quizCorrect / quizAnswers.length) * 100)
        : 0;

    // Process prizes
    const prizes = prizesResult.data ?? [];
    const totalPrizes = prizes.length;
    const redeemedPrizes = prizes.filter((p) => p.redeemed).length;
    const prizesByType: Record<string, number> = {};
    for (const p of prizes) {
      prizesByType[p.prize_type] = (prizesByType[p.prize_type] ?? 0) + 1;
    }

    // Process product ratings
    const ratings = ratingsResult.data ?? [];
    const totalRatings = ratings.length;

    // Aggregate ratings by product
    const productRatings: Record<
      string,
      { totalScore: number; count: number }
    > = {};
    for (const r of ratings) {
      const pid = String(r.product_id);
      if (!productRatings[pid]) {
        productRatings[pid] = { totalScore: 0, count: 0 };
      }
      productRatings[pid].totalScore += r.rating;
      productRatings[pid].count += 1;
    }

    // Top and bottom rated products
    const productRatingsList = Object.entries(productRatings)
      .map(([productId, data]) => ({
        productId,
        avgRating: Math.round((data.totalScore / data.count) * 10) / 10,
        voteCount: data.count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    const topRatedProducts = productRatingsList.slice(0, 5);
    const bottomRatedProducts = productRatingsList
      .filter((p) => p.voteCount >= 2)
      .slice(-5)
      .reverse();

    // Question stats (most answered, hardest)
    const questionAnswerMap: Record<
      string,
      { total: number; correct: number }
    > = {};
    for (const a of questionStatsResult.data ?? []) {
      const qid = a.question_id;
      if (!questionAnswerMap[qid]) {
        questionAnswerMap[qid] = { total: 0, correct: 0 };
      }
      questionAnswerMap[qid].total += 1;
      if ((a.score_earned ?? 0) > 0 && a.game_type === "quiz") {
        questionAnswerMap[qid].correct += 1;
      }
    }

    const questionStats = Object.entries(questionAnswerMap)
      .map(([questionId, data]) => ({
        questionId,
        totalAnswers: data.total,
        accuracy:
          data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const hardestQuestions = questionStats.filter((q) => q.totalAnswers >= 3).slice(0, 5);
    const easiestQuestions = questionStats
      .filter((q) => q.totalAnswers >= 3)
      .slice(-5)
      .reverse();

    // Daily activity (last 30 days)
    const dailyMap: Record<string, number> = {};
    for (const s of dailyResult.data ?? []) {
      const day = new Date(s.created_at).toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    }
    const dailyActivity = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      overview: {
        totalSessions,
        completedSessions,
        abandonedSessions,
        activeSessions,
        completionRate,
        uniqueTableSessions,
        totalAnswers,
        quizAnswers: quizAnswers.length,
        preferenceAnswers: prefAnswers.length,
        avgScore,
        quizAccuracy,
      },
      prizes: {
        totalPrizes,
        redeemedPrizes,
        prizesByType,
      },
      ratings: {
        totalRatings,
        topRatedProducts,
        bottomRatedProducts,
        allProductRatings: productRatingsList,
      },
      questions: {
        hardestQuestions,
        easiestQuestions,
      },
      dailyActivity,
    });
  } catch (error) {
    console.error("Error fetching game stats:", error);
    return NextResponse.json(
      { error: "Erro ao carregar estatísticas" },
      { status: 500 }
    );
  }
}
