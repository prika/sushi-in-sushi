import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/** Stats window: last N days for overview aggregates */
const STATS_DAYS = 90;
/** Upper bound per table to avoid unbounded result sets */
const SAFETY_LIMIT = 10_000;
const DAILY_DAYS = 30;

/**
 * GET /api/admin/game-stats
 * Returns aggregated game analytics for the admin dashboard.
 * All queries are bounded by date filter (last STATS_DAYS) and SAFETY_LIMIT.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = await createClient();

    const statsSince = new Date(
      Date.now() - STATS_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const dailySince = new Date(
      Date.now() - DAILY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Run all bounded queries in parallel
    const [
      sessionsResult,
      answersResult,
      prizesResult,
      ratingsResult,
      dailyResult,
    ] = await Promise.all([
      // Game sessions: date filter + limit (breakdown by status, unique table sessions)
      supabase
        .from("game_sessions")
        .select("id, status, session_id, round_number, created_at")
        .gte("created_at", statsSince)
        .limit(SAFETY_LIMIT),

      // Game answers: single query for totals + question stats (answered_at filter)
      supabase
        .from("game_answers")
        .select("id, game_type, score_earned, question_id")
        .gte("answered_at", statsSince)
        .limit(SAFETY_LIMIT),

      // Prizes: date filter + limit
      supabase
        .from("game_prizes")
        .select("id, prize_type, prize_value, redeemed, created_at")
        .gte("created_at", statsSince)
        .limit(SAFETY_LIMIT),

      // Product ratings: date filter + limit
      supabase
        .from("product_ratings")
        .select("product_id, rating, session_id")
        .gte("created_at", statsSince)
        .limit(SAFETY_LIMIT),

      // Sessions by day (last 30 days) - already bounded by date + implicit limit
      supabase
        .from("game_sessions")
        .select("created_at")
        .gte("created_at", dailySince)
        .limit(SAFETY_LIMIT),
    ]);

    // Fail fast if any query returned an error
    const queryErrors = [
      sessionsResult.error,
      answersResult.error,
      prizesResult.error,
      ratingsResult.error,
      dailyResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      console.error("Game stats query errors:", queryErrors);
      return NextResponse.json(
        { error: "Erro ao consultar dados de jogos" },
        { status: 500 },
      );
    }

    // Process sessions
    const sessions = sessionsResult.data ?? [];
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed",
    ).length;
    const abandonedSessions = sessions.filter(
      (s) => s.status === "abandoned",
    ).length;
    const activeSessions = sessions.filter((s) => s.status === "active").length;
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
              answers.length,
          )
        : 0;

    // Quiz accuracy (score_earned > 0 = correct)
    const quizCorrect = quizAnswers.filter(
      (a) => (a.score_earned ?? 0) > 0,
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

    // Question stats (most answered, hardest) - only quiz answers count for accuracy
    const quizAnswersForQuestions = (answersResult.data ?? []).filter(
      (a) => a.question_id != null && a.game_type === "quiz",
    );
    const questionAnswerMap: Record<
      string,
      { quizTotal: number; quizCorrect: number }
    > = {};
    for (const a of quizAnswersForQuestions) {
      const qid = a.question_id;
      if (qid == null) continue;
      const key = String(qid);
      if (!questionAnswerMap[key]) {
        questionAnswerMap[key] = { quizTotal: 0, quizCorrect: 0 };
      }
      questionAnswerMap[key].quizTotal += 1;
      if ((a.score_earned ?? 0) > 0) {
        questionAnswerMap[key].quizCorrect += 1;
      }
    }

    const questionStats = Object.entries(questionAnswerMap)
      .map(([questionId, data]) => ({
        questionId,
        totalAnswers: data.quizTotal,
        accuracy:
          data.quizTotal > 0
            ? Math.round((data.quizCorrect / data.quizTotal) * 100)
            : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const hardestQuestions = questionStats
      .filter((q) => q.totalAnswers >= 3)
      .slice(0, 5);
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
      meta: {
        statsSince,
        statsDays: STATS_DAYS,
        dailyDays: DAILY_DAYS,
      },
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
      { status: 500 },
    );
  }
}
