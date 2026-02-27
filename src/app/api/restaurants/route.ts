import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseRestaurantRepository } from "@/infrastructure/repositories/SupabaseRestaurantRepository";
import {
  GetAllRestaurantsUseCase,
  CreateRestaurantUseCase,
} from "@/application/use-cases/restaurants";
import type { RestaurantFilter } from "@/domain/entities/Restaurant";

export const dynamic = "force-dynamic";

// GET - List restaurants
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantRepository(supabase);
    const useCase = new GetAllRestaurantsUseCase(repository);

    const { searchParams } = new URL(request.url);
    const filter: RestaurantFilter = {};

    const isActive = searchParams.get("isActive");
    if (isActive !== null) {
      filter.isActive = isActive === "true";
    }

    const slug = searchParams.get("slug");
    if (slug) {
      filter.slug = slug;
    }

    const result = await useCase.execute({ filter });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[API /restaurants GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar restaurantes" },
      { status: 500 },
    );
  }
}

// POST - Create restaurant (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar restaurantes" },
        { status: 403 },
      );
    }

    const body = await request.json();

    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantRepository(supabase);
    const useCase = new CreateRestaurantUseCase(repository);

    const result = await useCase.execute(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("[API /restaurants POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao criar restaurante" },
      { status: 500 },
    );
  }
}
