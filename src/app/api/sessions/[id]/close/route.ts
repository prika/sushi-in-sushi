import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST - Close a session and free the table (bypasses RLS via admin client)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;

  try {
    const body = await request.json().catch(() => ({}));
    const { closeReason, cancelOrders } = body as {
      closeReason?: string;
      cancelOrders?: boolean;
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, table_id, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("[API /sessions/close] Session not found:", sessionId, sessionError);
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 }
      );
    }

    if (session.status === "closed") {
      return NextResponse.json(
        { error: "Sessão já está encerrada" },
        { status: 400 }
      );
    }

    // Close the session
    const { error: updateSessionError } = await supabase
      .from("sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateSessionError) {
      console.error("[API /sessions/close] Error closing session:", updateSessionError);
      return NextResponse.json(
        { error: "Erro ao encerrar sessão" },
        { status: 500 }
      );
    }

    // Free the table
    if (session.table_id) {
      const { error: tableError } = await supabase
        .from("tables")
        .update({
          status: "available" as const,
          current_session_id: null,
        })
        .eq("id", session.table_id);

      if (tableError) {
        console.error("[API /sessions/close] Error freeing table:", tableError);
      }
    }

    // Cancel non-delivered orders if requested
    let cancelledCount = 0;
    if (cancelOrders !== false) {
      const { data: cancelledOrders, error: cancelError } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("session_id", sessionId)
        .in("status", ["pending", "preparing", "ready"])
        .select("id");

      if (cancelError) {
        console.error("[API /sessions/close] Error cancelling orders:", cancelError);
      }
      cancelledCount = cancelledOrders?.length || 0;
    }

    // eslint-disable-next-line no-console
    console.log("[API /sessions/close] Success:", {
      sessionId,
      tableId: session.table_id,
      cancelledOrders: cancelledCount,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      tableId: session.table_id,
      cancelledOrders: cancelledCount,
      closeReason: closeReason || null,
    });
  } catch (error) {
    console.error("[API /sessions/close] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao encerrar sessão" },
      { status: 500 }
    );
  }
}
