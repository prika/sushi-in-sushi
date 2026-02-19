import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createInvoice, getInvoices, voidInvoice } from "@/lib/vendus";
import { logActivity } from "@/lib/auth/activity";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendus/invoices
 * List invoices with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const invoices = await getInvoices({
      status,
      limit,
      offset,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Erro ao obter faturas:", error);
    return NextResponse.json(
      { error: "Erro ao obter faturas" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vendus/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // Allow admin and waiter to create invoices
    if (user.role !== "admin" && user.role !== "waiter") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      sessionId,
      locationSlug,
      paymentMethodId,
      paidAmount,
      customerNif,
      customerName,
    } = body;

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: "ID da sessao obrigatorio" },
        { status: 400 },
      );
    }

    if (!locationSlug) {
      return NextResponse.json(
        { error: "Localizacao obrigatoria" },
        { status: 400 },
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Metodo de pagamento obrigatorio" },
        { status: 400 },
      );
    }

    if (paidAmount === undefined || paidAmount === null) {
      return NextResponse.json(
        { error: "Valor pago obrigatorio" },
        { status: 400 },
      );
    }

    const result = await createInvoice({
      sessionId,
      locationSlug,
      paymentMethodId,
      paidAmount,
      customerNif,
      customerName,
      issuedBy: user.id,
    });

    if (result.success) {
      await logActivity(
        user.id,
        "invoice_created",
        "invoice",
        result.invoiceId,
        {
          vendusId: result.vendusId,
          documentNumber: result.documentNumber,
          sessionId,
        },
      );
    }

    return NextResponse.json(result, {
      status: result.success ? 201 : 400,
    });
  } catch (error) {
    console.error("Erro ao criar fatura:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao criar fatura",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/vendus/invoices
 * Void an invoice
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { invoiceId, reason } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "ID da fatura obrigatorio" },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Motivo da anulacao obrigatorio" },
        { status: 400 },
      );
    }

    const result = await voidInvoice(invoiceId, reason, user.id);

    if (result.success) {
      await logActivity(user.id, "invoice_voided", "invoice", invoiceId, {
        reason,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao anular fatura:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao anular fatura",
      },
      { status: 500 },
    );
  }
}
