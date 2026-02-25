import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST - Close a session and free the table atomically via DB function
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

    const { data, error } = await supabase.rpc(
      "close_session_transactional",
      {
        p_session_id: sessionId,
        p_cancel_orders: cancelOrders !== false,
        p_close_reason: closeReason?.trim() || null,
      }
    );

    if (error) {
      console.error("[API /sessions/close] RPC error:", error);
      return NextResponse.json(
        { error: "Erro ao encerrar sessão" },
        { status: 500 }
      );
    }

    const result = data as {
      success: boolean;
      error?: string;
      session_id?: string;
      table_id?: string;
      cancelled_orders?: number;
      close_reason?: string | null;
    };

    if (!result.success) {
      const status = result.error === "Sessão não encontrada" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // eslint-disable-next-line no-console
    console.log("[API /sessions/close] Success:", {
      sessionId,
      tableId: result.table_id,
      cancelledOrders: result.cancelled_orders,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      tableId: result.table_id,
      cancelledOrders: result.cancelled_orders ?? 0,
      closeReason: result.close_reason ?? null,
    });
  } catch (error) {
    console.error("[API /sessions/close] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao encerrar sessão" },
      { status: 500 }
    );
  }
}
