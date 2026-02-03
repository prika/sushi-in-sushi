import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getInvoicePdf } from "@/lib/vendus";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendus/invoices/[id]/pdf
 * Get or redirect to invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da fatura obrigatorio" },
        { status: 400 }
      );
    }

    const result = await getInvoicePdf(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // Check if client wants redirect or JSON
    const acceptHeader = request.headers.get("accept") || "";
    const wantsJson = acceptHeader.includes("application/json");

    if (wantsJson) {
      return NextResponse.json({ pdfUrl: result.pdfUrl });
    }

    // Redirect to PDF URL
    if (result.pdfUrl) {
      return NextResponse.redirect(result.pdfUrl);
    }

    return NextResponse.json({ error: "PDF nao disponivel" }, { status: 404 });
  } catch (error) {
    console.error("Erro ao obter PDF:", error);
    return NextResponse.json(
      { error: "Erro ao obter PDF da fatura" },
      { status: 500 }
    );
  }
}
