import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { SupabaseSessionRepository } from '@/infrastructure/repositories/SupabaseSessionRepository';
import { UpdateSessionOrderingModeUseCase } from '@/application/use-cases/sessions/UpdateSessionOrderingModeUseCase';
import { isValidOrderingMode } from '@/domain/value-objects/OrderingMode';

/**
 * PATCH /api/sessions/[id]/ordering-mode
 * Updates the ordering mode of a session
 * Requires staff authentication (admin or waiter)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { orderingMode } = body;

    // Validate ordering mode
    if (!orderingMode || !isValidOrderingMode(orderingMode)) {
      return NextResponse.json(
        { error: 'Invalid ordering mode. Must be "client" or "waiter_only"' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current user from legacy auth
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verify user is staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, roles (name)')
      .eq('id', user.id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Utilizador não é staff' },
        { status: 403 }
      );
    }

    // Verify staff has permission (admin or waiter)
    const roleName = (staffData.roles as any)?.name;
    if (!['admin', 'waiter'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar modo de pedidos' },
        { status: 403 }
      );
    }

    // Create repositories and use case
    const sessionRepository = new SupabaseSessionRepository(supabase);

    const useCase = new UpdateSessionOrderingModeUseCase(
      sessionRepository
      // Note: Activity logging is handled internally by the use case if logger is provided
      // In API routes, we can skip this as the activity would need database logging anyway
    );

    // Execute use case
    const result = await useCase.execute({
      sessionId: params.id,
      orderingMode,
      staffId: user.id,
    });

    if (!result.success) {
      const statusCode = result.code === 'SESSION_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      session: result.data,
    });
  } catch (error) {
    console.error('[API /sessions/[id]/ordering-mode] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar modo de pedidos' },
      { status: 500 }
    );
  }
}
