import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/tables/close-all
 * Closes all active sessions and frees all tables for a given restaurant location.
 * Requires admin auth.
 *
 * Body: { location: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem fechar todas as mesas" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { location } = body;

    if (!location) {
      return NextResponse.json(
        { error: "Localização obrigatória" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Find all tables for this location that are occupied or reserved
    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("id, status")
      .eq("location", location)
      .in("status", ["occupied", "reserved"]);

    if (tablesError) {
      return NextResponse.json(
        { error: "Erro ao buscar mesas" },
        { status: 500 },
      );
    }

    if (!tables || tables.length === 0) {
      return NextResponse.json({ success: true, closed: 0 });
    }

    const tableIds = tables.map((t) => t.id);

    // Find all active/pending_payment sessions for these tables
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id")
      .in("table_id", tableIds)
      .in("status", ["active", "pending_payment"]);

    // Close each session using the RPC
    let closedCount = 0;
    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        await supabase.rpc("close_session_and_free_table", {
          session_id_param: session.id,
        });
        closedCount++;
      }
    }

    // Remove waiter assignments for all affected tables
    await supabase
      .from("waiter_tables")
      .delete()
      .in("table_id", tableIds);

    // Also reset any tables that are occupied/reserved but might not have sessions
    await supabase
      .from("tables")
      .update({ status: "available", current_session_id: null, customer_waiting_since: null })
      .in("id", tableIds);

    return NextResponse.json({ success: true, closed: closedCount });
  } catch (error) {
    console.error("[API /tables/close-all POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao fechar mesas" },
      { status: 500 },
    );
  }
}
