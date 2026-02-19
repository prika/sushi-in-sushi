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

    if (user.role !== "admin" && user.role !== "waiter") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
    const limit = isNaN(limitParam) ? 50 : limitParam;
    const offset = isNaN(offsetParam) ? 0 : offsetParam;

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

    if (user.role !== "admin" && user.role !== "waiter") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo do pedido invalido" },
        { status: 400 },
      );
    }

    const {
      sessionId,
      locationSlug,
      paymentMethodId,
      paidAmount,
      customerNif,
      customerName,
    } = body;

    // Validate required fields
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "ID da sessao obrigatorio" },
        { status: 400 },
      );
    }

    if (!locationSlug || typeof locationSlug !== "string") {
      return NextResponse.json(
        { error: "Localizacao obrigatoria" },
        { status: 400 },
      );
    }

    if (typeof paymentMethodId !== "number" || paymentMethodId <= 0) {
      return NextResponse.json(
        { error: "Metodo de pagamento invalido" },
        { status: 400 },
      );
    }

    if (typeof paidAmount !== "number" || paidAmount < 0) {
      return NextResponse.json(
        { error: "Valor pago invalido" },
        { status: 400 },
      );
    }

    const result = await createInvoice({
      sessionId,
      locationSlug,
      paymentMethodId,
      paidAmount,
      customerNif: customerNif as string | undefined,
      customerName: customerName as string | undefined,
      issuedBy: user.id,
    });

    if (result.success) {
      try {
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
      } catch (logError) {
        console.error("Erro ao registar atividade:", logError);
      }
    }

    return NextResponse.json(result, {
      status: result.success ? 201 : 400,
    });
  } catch (error) {
    console.error("Erro ao criar fatura:", error);
    return NextResponse.json(
      { error: "Erro ao criar fatura" },
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

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo do pedido invalido" },
        { status: 400 },
      );
    }

    const { invoiceId, reason } = body;

    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json(
        { error: "ID da fatura obrigatorio" },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "Motivo da anulacao obrigatorio" },
        { status: 400 },
      );
    }

    const result = await voidInvoice(invoiceId, reason, user.id);

    if (result.success) {
      try {
        await logActivity(user.id, "invoice_voided", "invoice", invoiceId, {
          reason,
        });
      } catch (logError) {
        console.error("Erro ao registar atividade:", logError);
      }
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Erro ao anular fatura:", error);
    return NextResponse.json(
      { error: "Erro ao anular fatura" },
      { status: 500 },
    );
  }
}
