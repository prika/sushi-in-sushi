import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import {
  UpdateRestaurantUseCase,
  DeleteRestaurantUseCase,
} from "@/application/use-cases/restaurants";

// PUT - Update restaurant (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar restaurantes" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantRepository(supabase);
    const useCase = new UpdateRestaurantUseCase(repository);

    const result = await useCase.execute({ id, data: body });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[API /restaurants PUT] Error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar restaurante" },
      { status: 500 },
    );
  }
}

// DELETE - Delete restaurant (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem apagar restaurantes" },
        { status: 403 },
      );
    }

    const { id } = await params;

    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantRepository(supabase);
    const useCase = new DeleteRestaurantUseCase(repository);

    const result = await useCase.execute(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /restaurants DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro ao apagar restaurante" },
      { status: 500 },
    );
  }
}
