import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseStaffRepository } from "@/infrastructure/repositories/SupabaseStaffRepository";
import {
  UpdateStaffUseCase,
  DeleteStaffUseCase,
} from "@/application/use-cases/staff";

// GET - Get staff by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const repository = new SupabaseStaffRepository(supabase);
    const staff = await repository.findById(id);

    if (!staff) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const includeTables = searchParams.get("includeTables") === "true";
    const includeKitchenZones = searchParams.get("includeKitchenZones") === "true";

    const extra: Record<string, unknown> = {};

    if (includeTables) {
      extra.assignedTables = await repository.getAssignedTables(id);
    }
    if (includeKitchenZones) {
      extra.assignedKitchenZones = await repository.getAssignedKitchenZones(id);
    }

    if (Object.keys(extra).length > 0) {
      return NextResponse.json({ ...staff, ...extra });
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("[API /staff/[id] GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar funcionário" },
      { status: 500 },
    );
  }
}

// PUT - Update staff (admin only)
// Handles Supabase Auth password/email updates
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar funcionários" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = createAdminClient();
    const repository = new SupabaseStaffRepository(supabase);

    // Get current staff record to find auth_user_id
    const existing = await repository.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 },
      );
    }

    // Update Supabase Auth user if password or email changed
    if (existing.authUserId && (body.password || body.email)) {
      const authUpdate: Record<string, string> = {};
      if (body.password) authUpdate.password = body.password;
      if (body.email && body.email !== existing.email)
        authUpdate.email = body.email;

      if (Object.keys(authUpdate).length > 0) {
        const { error: authError } =
          await supabase.auth.admin.updateUserById(
            existing.authUserId,
            authUpdate,
          );

        if (authError) {
          return NextResponse.json(
            { error: authError.message },
            { status: 400 },
          );
        }
      }
    }

    // If staff has no auth_user_id and password is provided, create Supabase Auth user
    if (!existing.authUserId && body.password && existing.email) {
      const emailForAuth = body.email || existing.email;
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: emailForAuth,
          password: body.password,
          email_confirm: true,
          user_metadata: { name: body.name || existing.name },
        });

      if (!authError && authData.user) {
        // Link the newly created auth user
        await supabase
          .from("staff")
          .update({ auth_user_id: authData.user.id })
          .eq("id", id);
      }
    }

    // Handle table assignments if provided
    if (Array.isArray(body.tableIds)) {
      await repository.assignTables(id, body.tableIds);
    }

    // Handle kitchen zone assignments if provided
    if (Array.isArray(body.kitchenZoneIds)) {
      await repository.assignKitchenZones(id, body.kitchenZoneIds);
    }

    // Update staff record (password is excluded by repository)
    // Only call update if there are actual staff fields to update
    const { tableIds: _tableIds, kitchenZoneIds: _kitchenZoneIds, password: _password, ...staffFields } = body;
    const hasStaffUpdates = Object.keys(staffFields).length > 0;

    if (hasStaffUpdates) {
      const useCase = new UpdateStaffUseCase(repository);
      const result = await useCase.execute(id, staffFields);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: 400 },
        );
      }

      return NextResponse.json(result.data);
    }

    // If only tableIds or password were updated, return the existing record
    const updated = await repository.findById(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API /staff/[id] PUT] Error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar funcionário" },
      { status: 500 },
    );
  }
}

// DELETE - Delete staff (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem apagar funcionários" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const repository = new SupabaseStaffRepository(supabase);

    // Get auth_user_id before deleting
    const existing = await repository.findById(id);
    const authUserId = existing?.authUserId;

    const useCase = new DeleteStaffUseCase(repository);
    const result = await useCase.execute(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    // Delete Supabase Auth user if it existed
    if (authUserId) {
      await supabase.auth.admin.deleteUser(authUserId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /staff/[id] DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro ao apagar funcionário" },
      { status: 500 },
    );
  }
}
