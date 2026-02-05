import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseRestaurantClosureRepository } from "@/infrastructure/repositories/SupabaseRestaurantClosureRepository";
import { CheckClosureUseCase } from "@/application/use-cases/closures";

export const dynamic = "force-dynamic";

// GET - Check if a date is closed for a location
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const repository = new SupabaseRestaurantClosureRepository(supabase);
    const checkClosure = new CheckClosureUseCase(repository);

    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const location = searchParams.get("location");

    if (!date || !location) {
      return NextResponse.json(
        { error: "Data e localização são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await checkClosure.execute(date, location);

    if (!result.success) {
      return NextResponse.json({
        isClosed: false,
        reason: null,
        type: null,
      });
    }

    const closureResult = result.data;

    if (closureResult.isClosed && closureResult.closure) {
      return NextResponse.json({
        isClosed: true,
        reason: closureResult.reason || "Restaurante fechado",
        type: closureResult.closure.isRecurring ? "recurring" : "specific",
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
