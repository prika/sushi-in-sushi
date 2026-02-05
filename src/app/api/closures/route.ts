import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import type { RestaurantClosureInsert } from "@/types/database";

// Helper to get typed supabase query for tables not in generated types
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
}

// GET - List closures
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const { searchParams } = new URL(request.url);

    const location = searchParams.get("location");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeRecurring = searchParams.get("includeRecurring") !== "false";

    let query = extendedSupabase
      .from("restaurant_closures")
      .select("*")
      .order("closure_date", { ascending: true });

    if (location) {
      // Include closures for this location or all locations (NULL)
      query = query.or(`location.eq.${location},location.is.null`);
    }

    if (startDate) {
      query = query.gte("closure_date", startDate);
    }

    if (endDate) {
      query = query.lte("closure_date", endDate);
    }

    if (!includeRecurring) {
      query = query.or("is_recurring.eq.false,is_recurring.is.null");
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching closures:", error);
    return NextResponse.json(
      { error: "Erro ao carregar dias de folga" },
      { status: 500 }
    );
  }
}

// POST - Create new closure (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Only admins can create closures
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir dias de folga" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const body: RestaurantClosureInsert = await request.json();

    // Validate required fields
    if (!body.closure_date && !body.is_recurring) {
      return NextResponse.json(
        { error: "Data de fecho é obrigatória" },
        { status: 400 }
      );
    }

    if (body.is_recurring && (body.recurring_day_of_week === undefined || body.recurring_day_of_week === null)) {
      return NextResponse.json(
        { error: "Dia da semana é obrigatório para fechos recorrentes" },
        { status: 400 }
      );
    }

    // For recurring closures, set a placeholder date if not provided
    const closureData = {
      ...body,
      closure_date: body.is_recurring && !body.closure_date
        ? "1970-01-01" // Placeholder for recurring
        : body.closure_date,
      created_by: auth.id,
    };

    const { data, error } = await extendedSupabase
      .from("restaurant_closures")
      .insert(closureData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json(
          { error: "Já existe um fecho para esta data/localização" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating closure:", error);
    return NextResponse.json(
      { error: "Erro ao criar dia de folga" },
      { status: 500 }
    );
  }
}

// DELETE - Remove closure (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Only admins can delete closures
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir dias de folga" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const { error } = await extendedSupabase
      .from("restaurant_closures")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting closure:", error);
    return NextResponse.json(
      { error: "Erro ao remover dia de folga" },
      { status: 500 }
    );
  }
}
