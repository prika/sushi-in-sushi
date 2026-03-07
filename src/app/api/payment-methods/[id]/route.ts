import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabasePaymentMethodRepository } from "@/infrastructure/repositories/SupabasePaymentMethodRepository";
import {
  UpdatePaymentMethodUseCase,
  DeletePaymentMethodUseCase,
} from "@/application/use-cases/payment-methods";

function mapToSnakeCase(method: { id: number; name: string; slug: string; vendusId: string | null; isActive: boolean; sortOrder: number; createdAt: Date }) {
  return {
    id: method.id,
    name: method.name,
    slug: method.slug,
    vendus_id: method.vendusId,
    is_active: method.isActive,
    sort_order: method.sortOrder,
    created_at: method.createdAt.toISOString(),
  };
}

// PATCH - Update payment method (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir metodos de pagamento" },
        { status: auth ? 403 : 401 }
      );
    }

    const { id } = await params;
    const methodId = parseInt(id);
    if (isNaN(methodId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const repository = new SupabasePaymentMethodRepository(supabase);
    const useCase = new UpdatePaymentMethodUseCase(repository);

    const body = await request.json();

    const result = await useCase.execute({
      id: methodId,
      data: {
        name: body.name,
        slug: body.slug,
        vendusId: body.vendus_id ?? body.vendusId,
        isActive: body.is_active ?? body.isActive,
        sortOrder: body.sort_order ?? body.sortOrder,
      },
    });

    if (!result.success) {
      const status = result.code === "NOT_FOUND" ? 404 : result.code === "DUPLICATE_SLUG" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(mapToSnakeCase(result.data));
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar metodo de pagamento" },
      { status: 500 }
    );
  }
}

// DELETE - Remove payment method (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir metodos de pagamento" },
        { status: auth ? 403 : 401 }
      );
    }

    const { id } = await params;
    const methodId = parseInt(id);
    if (isNaN(methodId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const repository = new SupabasePaymentMethodRepository(supabase);
    const useCase = new DeletePaymentMethodUseCase(repository);

    const result = await useCase.execute(methodId);

    if (!result.success) {
      const status = result.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Erro ao remover metodo de pagamento" },
      { status: 500 }
    );
  }
}
