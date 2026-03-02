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
 * Called automatically when a customer scans a QR code and no session exists.
 * Sets customer_waiting_since so the waiter sees the table as "waiting" in their dashboard.
 * No auth required (customer-facing).
 */
export async function POST(
  _request: NextRequest,
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

    // Idempotent: only set if not already waiting
    if (!table.customer_waiting_since) {
      await supabase
        .from("tables")
        .update({ customer_waiting_since: new Date().toISOString() })
        .eq("id", tableId);

      // Auto-assign waiter if enabled for this restaurant
      try {
        const { data: tableData } = await supabase
          .from("tables")
          .select("location")
          .eq("id", tableId)
          .single();

        if (tableData?.location) {
          const staffRepository = new SupabaseStaffRepository(supabase);
          const tableRepository = new SupabaseTableRepository(supabase);
          const restaurantRepository = new SupabaseRestaurantRepository(supabase);
          const autoAssign = new AutoAssignWaiterUseCase(
            staffRepository,
            tableRepository,
            restaurantRepository,
          );
          await autoAssign.execute({ tableId, location: tableData.location });
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
      .update({ customer_waiting_since: null })
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
