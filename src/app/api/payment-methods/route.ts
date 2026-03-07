import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabasePaymentMethodRepository } from "@/infrastructure/repositories/SupabasePaymentMethodRepository";
import {
  GetAllPaymentMethodsUseCase,
  CreatePaymentMethodUseCase,
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

// GET - List payment methods
export async function GET() {
  try {
    const supabase = createAdminClient();
    const repository = new SupabasePaymentMethodRepository(supabase);
    const useCase = new GetAllPaymentMethodsUseCase(repository);

    const result = await useCase.execute();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data.map(mapToSnakeCase));
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Erro ao carregar metodos de pagamento" },
      { status: 500 }
    );
  }
}

// POST - Create payment method (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir metodos de pagamento" },
        { status: auth ? 403 : 401 }
      );
    }

    const supabase = createAdminClient();
    const repository = new SupabasePaymentMethodRepository(supabase);
    const useCase = new CreatePaymentMethodUseCase(repository);

    const body = await request.json();

    const result = await useCase.execute({
      name: body.name,
      slug: body.slug,
      vendusId: body.vendus_id ?? body.vendusId ?? null,
      isActive: body.is_active ?? body.isActive ?? true,
      sortOrder: body.sort_order ?? body.sortOrder ?? 0,
    });

    if (!result.success) {
      const status = result.code === "DUPLICATE_SLUG" ? 409 : result.code === "VALIDATION_ERROR" ? 400 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(mapToSnakeCase(result.data), { status: 201 });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Erro ao criar metodo de pagamento" },
      { status: 500 }
    );
  }
}
