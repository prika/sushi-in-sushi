import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const supabase = createAdminClient();

    const { data: payment } = await supabase
      .from("payments")
      .select("status, stripe_receipt_url, invoice_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      status: payment?.status || "not_found",
      receiptUrl: payment?.stripe_receipt_url || null,
      invoiceId: payment?.invoice_id || null,
    });
  } catch (error) {
    console.error("[Payments] Error fetching status:", error);
    return NextResponse.json(
      { error: "Erro ao obter estado do pagamento" },
      { status: 500 },
    );
  }
}
