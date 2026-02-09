import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseSessionRepository } from "@/infrastructure/repositories/SupabaseSessionRepository";
import { SupabaseTableRepository } from "@/infrastructure/repositories/SupabaseTableRepository";
import { SupabaseStaffRepository } from "@/infrastructure/repositories/SupabaseStaffRepository";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import { StartSessionUseCase } from "@/application/use-cases/sessions/StartSessionUseCase";
import { AutoAssignWaiterUseCase } from "@/application/use-cases/sessions/AutoAssignWaiterUseCase";

// POST - Start a new session (public - used by customer mesa page)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, isRodizio, numPeople, totalAmount } = body;

    if (!tableId) {
      return NextResponse.json(
        { error: "tableId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
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
          .single();

        if (existingSession) {
          let existingWaiterName: string | null = null;
          const { data: waiterData } = await (supabase as any)
            .from("waiter_assignments")
            .select("staff_name")
            .eq("table_id", tableId)
            .single();
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
        .single();

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
