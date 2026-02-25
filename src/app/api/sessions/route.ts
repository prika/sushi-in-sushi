import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseSessionRepository } from "@/infrastructure/repositories/SupabaseSessionRepository";
import { SupabaseTableRepository } from "@/infrastructure/repositories/SupabaseTableRepository";
import { SupabaseStaffRepository } from "@/infrastructure/repositories/SupabaseStaffRepository";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import { StartSessionUseCase } from "@/application/use-cases/sessions/StartSessionUseCase";
import { AutoAssignWaiterUseCase } from "@/application/use-cases/sessions/AutoAssignWaiterUseCase";

// GET - Check for active session on a table (public - used by customer mesa page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableNumber = searchParams.get("tableNumber");
    const location = searchParams.get("location") || "circunvalacao";

    if (!tableNumber) {
      return NextResponse.json(
        { error: "tableNumber é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find table by number and location
    const { data: tableData } = await supabase
      .from("tables")
      .select("id")
      .eq("number", parseInt(tableNumber))
      .eq("location", location)
      .maybeSingle();

    if (!tableData) {
      return NextResponse.json({ tableId: null, session: null });
    }

    // Fetch active session
    const { data: activeSession } = await supabase
      .from("sessions")
      .select("*")
      .eq("table_id", tableData.id)
      .in("status", ["active", "pending_payment"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch waiter name
    let waiterName: string | null = null;
    const { data: waiterData } = await (supabase as ReturnType<typeof createAdminClient>)
      .from("waiter_assignments" as any)
      .select("staff_name")
      .eq("table_id", tableData.id)
      .maybeSingle();
    if (waiterData) {
      waiterName = (waiterData as any).staff_name;
    }

    // Fetch restaurant settings
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("id, order_cooldown_minutes, games_mode")
      .eq("slug", location)
      .maybeSingle();

    return NextResponse.json({
      tableId: tableData.id,
      session: activeSession,
      waiterName,
      restaurant: restaurantData,
    });
  } catch (error) {
    console.error("[API /sessions GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao verificar sessão" },
      { status: 500 }
    );
  }
}

// POST - Start a new session (staff-only - waiters and admins)
export async function POST(request: NextRequest) {
  try {
    // Only authenticated staff (waiter/admin) can create sessions
    const user = await getAuthUser();
    if (!user || !['admin', 'waiter'].includes(user.role)) {
      return NextResponse.json(
        { error: "Apenas empregados podem iniciar sessões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tableId, isRodizio, numPeople, totalAmount, orderingMode } = body;

    if (!tableId) {
      return NextResponse.json(
        { error: "tableId é obrigatório" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS - this is a public endpoint for customers
    const supabase = createAdminClient();
    const sessionRepository = new SupabaseSessionRepository(supabase);
    const tableRepository = new SupabaseTableRepository(supabase);
    const staffRepository = new SupabaseStaffRepository(supabase);
    const restaurantRepository = new SupabaseRestaurantRepository(supabase);

    const autoAssignWaiter = new AutoAssignWaiterUseCase(
      staffRepository,
      tableRepository,
      restaurantRepository,
    );

    const startSession = new StartSessionUseCase(
      sessionRepository,
      tableRepository,
      autoAssignWaiter,
    );

    const result = await startSession.execute({
      tableId,
      isRodizio: isRodizio ?? false,
      numPeople: numPeople ?? 1,
      orderingMode: orderingMode ?? 'client', // Defaults to 'client' mode
    });

    if (!result.success) {
      // If table is already occupied, return the existing active session
      if (result.code === "TABLE_OCCUPIED") {
        const { data: existingSession } = await supabase
          .from("sessions")
          .select("*")
          .eq("table_id", tableId)
          .in("status", ["active", "pending_payment"])
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSession) {
          let existingWaiterName: string | null = null;
          const { data: waiterData } = await (supabase as any)
            .from("waiter_assignments")
            .select("staff_name")
            .eq("table_id", tableId)
            .maybeSingle();
          if (waiterData) {
            existingWaiterName = waiterData.staff_name;
          }

          return NextResponse.json({
            session: existingSession,
            waiterName: existingWaiterName,
            recovered: true,
          });
        }
      }

      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    // Update total_amount for rodizio sessions
    if (totalAmount && totalAmount > 0 && result.data) {
      await supabase
        .from("sessions")
        .update({ total_amount: totalAmount })
        .eq("id", result.data.id);
    }

    // Fetch the assigned waiter name (if auto-assigned)
    let waiterName: string | null = null;
    if (result.data) {
      const { data: waiterData } = await (supabase as any)
        .from("waiter_assignments")
        .select("staff_name")
        .eq("table_id", tableId)
        .maybeSingle();

      if (waiterData) {
        waiterName = waiterData.staff_name;
      }
    }

    return NextResponse.json({
      session: result.data,
      waiterName,
    });
  } catch (error) {
    console.error("[API /sessions] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar sessão" },
      { status: 500 }
    );
  }
}
