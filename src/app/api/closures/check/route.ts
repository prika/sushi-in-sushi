import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper to get typed supabase query
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// GET - Check if a date is closed for a location
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const location = searchParams.get("location");

    if (!date || !location) {
      return NextResponse.json(
        { error: "Data e localização são obrigatórios" },
        { status: 400 }
      );
    }

    // Parse the date to get day of week
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay(); // 0=Sunday, 1=Monday, etc.

    // Check for specific date closure (for this location or all locations)
    const { data: specificClosure } = await extendedSupabase
      .from("restaurant_closures")
      .select("*")
      .eq("closure_date", date)
      .or(`location.eq.${location},location.is.null`)
      .or("is_recurring.eq.false,is_recurring.is.null")
      .limit(1)
      .single();

    if (specificClosure) {
      return NextResponse.json({
        isClosed: true,
        reason: (specificClosure as { reason: string | null }).reason || "Restaurante fechado",
        type: "specific",
      });
    }

    // Check for recurring weekly closure
    const { data: recurringClosure } = await extendedSupabase
      .from("restaurant_closures")
      .select("*")
      .eq("is_recurring", true)
      .eq("recurring_day_of_week", dayOfWeek)
      .or(`location.eq.${location},location.is.null`)
      .limit(1)
      .single();

    if (recurringClosure) {
      return NextResponse.json({
        isClosed: true,
        reason: (recurringClosure as { reason: string | null }).reason || "Dia de folga semanal",
        type: "recurring",
      });
    }

    return NextResponse.json({
      isClosed: false,
      reason: null,
      type: null,
    });
  } catch (error) {
    console.error("Error checking closure:", error);
    return NextResponse.json({
      isClosed: false,
      reason: null,
      type: null,
    });
  }
}
