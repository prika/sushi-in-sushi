import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseStaffRepository } from "@/infrastructure/repositories/SupabaseStaffRepository";
import { SupabaseTableRepository } from "@/infrastructure/repositories/SupabaseTableRepository";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import { AutoAssignWaiterUseCase } from "@/application/use-cases/sessions/AutoAssignWaiterUseCase";

export const dynamic = "force-dynamic";

/**
 * POST /api/tables/[id]/request-open
 * Called when a customer scans a QR code and submits their meal preferences.
 * Stores customer preferences (meal type, number of people) and sets customer_waiting_since
 * so the waiter sees the table as "waiting" with the customer's choices.
 * No auth required (customer-facing).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tableId } = await params;

    if (!tableId) {
      return NextResponse.json(
        { error: "ID da mesa obrigatorio" },
        { status: 400 },
      );
    }

    // Parse optional customer preferences from body
    let isRodizio: boolean | null = null;
    let numPeople: number | null = null;
    try {
      const body = await request.json();
      if (typeof body.isRodizio === "boolean") isRodizio = body.isRodizio;
      if (
        typeof body.numPeople === "number" &&
        body.numPeople >= 1 &&
        body.numPeople <= 20
      ) {
        numPeople = body.numPeople;
      }
    } catch {
      // No body or invalid JSON — preferences are optional
    }

    const supabase = createAdminClient();

    // Check table exists and is not occupied
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, status, customer_waiting_since")
      .eq("id", tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: "Mesa nao encontrada" },
        { status: 404 },
      );
    }

    if (table.status === "occupied") {
      return NextResponse.json(
        { success: true, already_open: true },
        { status: 200 },
      );
    }

    // Update: set waiting timestamp + customer preferences
    const updateData: Record<string, unknown> = {
      customer_waiting_since:
        table.customer_waiting_since || new Date().toISOString(),
      customer_requested_rodizio: isRodizio,
      customer_requested_num_people: numPeople,
    };

    await supabase.from("tables").update(updateData).eq("id", tableId);

    // Auto-assign waiter if first time waiting
    if (!table.customer_waiting_since) {
      try {
        const { data: tableData } = await supabase
          .from("tables")
          .select("location")
          .eq("id", tableId)
          .single();

        if (tableData?.location) {
          const staffRepository = new SupabaseStaffRepository(supabase);
          const tableRepository = new SupabaseTableRepository(supabase);
          const restaurantRepository = new SupabaseRestaurantRepository(
            supabase,
          );
          const autoAssign = new AutoAssignWaiterUseCase(
            staffRepository,
            tableRepository,
            restaurantRepository,
          );
          await autoAssign.execute({
            tableId,
            location: tableData.location,
          });
        }
      } catch {
        // Auto-assign failure never blocks the request
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /tables/request-open POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao solicitar abertura" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tables/[id]/request-open
 * Called by waiter to dismiss a waiting customer request.
 * Requires waiter/admin auth.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Nao autenticado" },
        { status: 401 },
      );
    }

    if (user.role !== "admin" && user.role !== "waiter") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const { id: tableId } = await params;

    const supabase = createAdminClient();

    await supabase
      .from("tables")
      .update({
        customer_waiting_since: null,
        customer_requested_rodizio: null,
        customer_requested_num_people: null,
      })
      .eq("id", tableId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /tables/request-open DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro ao dispensar pedido" },
      { status: 500 },
    );
  }
}
