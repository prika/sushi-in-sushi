import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const sessionCustomerId = request.nextUrl.searchParams.get("sessionCustomerId");
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionCustomerId || !sessionId) {
    return NextResponse.json({ totalPoints: 0 });
  }

  const supabase = createAdminClient();

  // Sum score_earned from game_answers for this session customer in this session's game sessions
  const { data, error } = await supabase
    .from("game_answers")
    .select("score_earned, game_session:game_sessions!inner(session_id)")
    .eq("session_customer_id", sessionCustomerId)
    .eq("game_session.session_id", sessionId);

  if (error) {
    console.error("[game-points] Error:", error);
    return NextResponse.json({ totalPoints: 0 });
  }

  const totalPoints = (data || []).reduce(
    (sum: number, row: { score_earned: number }) => sum + (row.score_earned || 0),
    0,
  );

  return NextResponse.json({ totalPoints });
}
