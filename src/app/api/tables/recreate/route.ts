import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/SupabaseRestaurantRepository';
import { SupabaseTableRepository } from '@/infrastructure/repositories/SupabaseTableRepository';
import { CreateTablesForRestaurantUseCase } from '@/application/use-cases/restaurants';

/**
 * POST /api/tables/recreate
 * Creates or recreates tables for a restaurant using admin client (bypasses RLS).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { restaurantSlug, forceRecreate } = body;

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: 'restaurantSlug é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const restaurantRepo = new SupabaseRestaurantRepository(supabase);
    const tableRepo = new SupabaseTableRepository(supabase);
    const useCase = new CreateTablesForRestaurantUseCase(restaurantRepo, tableRepo);

    const result = await useCase.execute({
      restaurantSlug,
      forceRecreate: forceRecreate ?? false,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        tables: result.data.map(t => ({ id: t.id, number: t.number, name: t.name })),
        count: result.data.length,
      });
    } else {
      return NextResponse.json(
        { error: result.error, code: (result as any).code },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API /tables/recreate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar mesas' },
      { status: 500 }
    );
  }
}
