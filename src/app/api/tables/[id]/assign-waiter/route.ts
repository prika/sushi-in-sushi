import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/tables/[id]/assign-waiter
 * Allows a waiter to manually take control of a table
 *
 * Security:
 * - Only authenticated waiters can assign themselves
 * - Waiter must be from the same location as the table
 * - Admin can assign any waiter to any table
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tableId = params.id;
    const supabase = await createClient();

    // 1. Get current user from legacy auth
    const user = await getAuthUser();

    // DEBUG: Log authentication status
    console.info('[assign-waiter POST] Auth status:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      cookieHeader: request.headers.get('cookie')?.substring(0, 100)
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Get staff profile with role
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, name, location, role_id, roles (name)')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Utilizador não é staff ativo' },
        { status: 403 }
      );
    }

    const roleName = (staffData.roles as any)?.name;

    // 3. Verify user is waiter or admin
    if (!['admin', 'waiter'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Sem permissão para atribuir mesas' },
        { status: 403 }
      );
    }

    // 4. Get table details
    const { data: tableData, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError || !tableData) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      );
    }

    // 5. Verify table is active
    if (!(tableData as any).is_active) {
      return NextResponse.json(
        { error: 'Mesa não está ativa' },
        { status: 400 }
      );
    }

    // 6. For waiters (not admins), verify location match
    if (roleName === 'waiter') {
      if (!staffData.location) {
        return NextResponse.json(
          { error: 'Garçon não tem localização atribuída' },
          { status: 400 }
        );
      }

      if (staffData.location !== tableData.location) {
        return NextResponse.json(
          {
            error: `Não pode comandar mesas de ${tableData.location}. Você está atribuído a ${staffData.location}.`,
            code: 'LOCATION_MISMATCH'
          },
          { status: 403 }
        );
      }
    }

    // 7. Check if waiter is already assigned
    const { data: existingAssignment } = await supabase
      .from('waiter_tables')
      .select('id, staff:staff!inner(name)')
      .eq('table_id', tableId)
      .eq('staff_id', user.id)
      .single();

    if (existingAssignment) {
      return NextResponse.json({
        success: true,
        message: 'Já está atribuído a esta mesa',
        assignment: existingAssignment,
        alreadyAssigned: true,
      });
    }

    // 8. Check if another waiter is assigned
    const { data: otherAssignment } = await supabase
      .from('waiter_tables')
      .select('id, staff:staff!inner(name)')
      .eq('table_id', tableId)
      .neq('staff_id', user.id)
      .single();

    if (otherAssignment) {
      const otherWaiterName = (otherAssignment.staff as any)?.name || 'outro garçon';

      // Admin can override, waiter cannot
      if (roleName !== 'admin') {
        return NextResponse.json(
          {
            error: `Mesa já está atribuída a ${otherWaiterName}`,
            code: 'ALREADY_ASSIGNED',
            assignedTo: otherWaiterName,
          },
          { status: 409 }
        );
      }

      // Admin: Remove previous assignment
      await supabase
        .from('waiter_tables')
        .delete()
        .eq('id', otherAssignment.id);
    }

    // 9. Create assignment
    const { data: newAssignment, error: assignError } = await supabase
      .from('waiter_tables')
      .insert({
        staff_id: user.id,
        table_id: tableId,
      })
      .select('id')
      .single();

    if (assignError) {
      console.error('Error creating assignment:', assignError);
      return NextResponse.json(
        { error: 'Erro ao atribuir mesa' },
        { status: 500 }
      );
    }

    // 10. Log activity (optional, fire and forget)
    fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        action: 'table_assigned',
        entityType: 'table',
        entityId: tableId,
        details: {
          tableNumber: tableData.number,
          location: tableData.location,
          assignedBy: roleName === 'admin' ? 'admin' : 'self',
        },
      }),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Mesa #${tableData.number} comandada com sucesso!`,
      assignment: newAssignment,
      waiterName: staffData.name,
    });
  } catch (error) {
    console.error('[API /tables/[id]/assign-waiter] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atribuir mesa' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tables/[id]/assign-waiter
 * Allows removing waiter assignment from a table
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tableId = params.id;
    const supabase = await createClient();

    // 1. Get current user from legacy auth
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Get staff profile with role
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, role_id, roles (name)')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Utilizador não é staff ativo' },
        { status: 403 }
      );
    }

    const _roleName = (staffData.roles as any)?.name;

    // 3. Delete assignment
    const { error: deleteError } = await supabase
      .from('waiter_tables')
      .delete()
      .eq('table_id', tableId)
      .eq('staff_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao remover atribuição' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Atribuição removida com sucesso',
    });
  } catch (error) {
    console.error('[API /tables/[id]/assign-waiter DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover atribuição' },
      { status: 500 }
    );
  }
}
