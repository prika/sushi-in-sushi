import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { SupabaseStaffRepository } from "@/infrastructure/repositories/SupabaseStaffRepository";
import {
  GetAllStaffUseCase,
  GetAllRolesUseCase,
} from "@/application/use-cases/staff";

export const dynamic = "force-dynamic";

// GET - List staff and roles (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem ver funcionários" },
        { status: 403 },
      );
    }

    const supabase = createAdminClient();
    const repository = new SupabaseStaffRepository(supabase);

    const { searchParams } = new URL(request.url);
    const includeRoles = searchParams.get("includeRoles") === "true";

    const getAllStaff = new GetAllStaffUseCase(repository);
    const result = await getAllStaff.execute();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const response: Record<string, unknown> = { staff: result.data };

    if (includeRoles) {
      const getAllRoles = new GetAllRolesUseCase(repository);
      const rolesResult = await getAllRoles.execute();
      if (rolesResult.success) {
        response.roles = rolesResult.data;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API /staff GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar funcionários" },
      { status: 500 },
    );
  }
}

// POST - Create staff with Supabase Auth (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar funcionários" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email, password, name, roleId, location, phone } = body;

    if (!email || !password || !name || !roleId) {
      return NextResponse.json(
        { error: "Email, password, nome e role são obrigatórios" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError || !authData.user) {
      const message = authError?.message || "Erro ao criar autenticação";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Step 2: Create staff record linked to auth user
    const repository = new SupabaseStaffRepository(supabase);

    try {
      const staff = await repository.create({
        email,
        name,
        password, // not used by repository anymore, but satisfies CreateStaffData type
        roleId,
        location: location || null,
        phone: phone || null,
        authUserId: authData.user.id,
      });

      return NextResponse.json(staff, { status: 201 });
    } catch (dbError) {
      // Rollback: delete the Supabase Auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }
  } catch (error) {
    console.error("[API /staff POST] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar funcionário",
      },
      { status: 500 },
    );
  }
}
