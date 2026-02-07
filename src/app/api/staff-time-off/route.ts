import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabaseStaffTimeOffRepository } from "@/infrastructure/repositories/SupabaseStaffTimeOffRepository";
import {
  GetAllStaffTimeOffUseCase,
  CreateStaffTimeOffUseCase,
} from "@/application/use-cases/staff-time-off";
import type { StaffTimeOffFilter, CreateStaffTimeOffData } from "@/domain/entities/StaffTimeOff";

// GET - List staff time off entries
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const repository = new SupabaseStaffTimeOffRepository(supabase);
    const getAllStaffTimeOff = new GetAllStaffTimeOffUseCase(repository);

    const { searchParams } = new URL(request.url);

    const staffIdParam = searchParams.get("staff_id");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");

    const filter: StaffTimeOffFilter = {};

    if (staffIdParam) {
      filter.staffId = staffIdParam;
    }
    if (statusParam) {
      filter.status = statusParam as StaffTimeOffFilter['status'];
    }
    if (typeParam) {
      filter.type = typeParam as StaffTimeOffFilter['type'];
    }
    if (monthParam && yearParam) {
      filter.month = parseInt(monthParam) - 1; // JS months are 0-indexed
      filter.year = parseInt(yearParam);
    }

    const result = await getAllStaffTimeOff.execute({ filter });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Map to database format for backwards compatibility
    const data = result.data.map((timeOff) => ({
      id: timeOff.id,
      staff_id: timeOff.staffId,
      start_date: timeOff.startDate,
      end_date: timeOff.endDate,
      type: timeOff.type,
      reason: timeOff.reason,
      status: timeOff.status,
      approved_by: timeOff.approvedBy,
      approved_at: timeOff.approvedAt?.toISOString() || null,
      created_at: timeOff.createdAt.toISOString(),
      updated_at: timeOff.updatedAt.toISOString(),
      staff: timeOff.staff,
      approver: timeOff.approver || null,
      staff_name: timeOff.staff.name,
      staff_email: timeOff.staff.name, // Note: email not available in entity
      approved_by_name: timeOff.approver?.name || null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET staff-time-off:", error);
    return NextResponse.json(
      { error: "Erro ao carregar ausencias" },
      { status: 500 }
    );
  }
}

// POST - Create new time off entry
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create time off entries
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir ausencias" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const repository = new SupabaseStaffTimeOffRepository(supabase);
    const createStaffTimeOff = new CreateStaffTimeOffUseCase(repository);

    const body = await request.json();

    // Build CreateStaffTimeOffData from request body (supporting both camelCase and snake_case)
    const timeOffData: CreateStaffTimeOffData = {
      staffId: body.staffId || body.staff_id,
      startDate: body.startDate || body.start_date,
      endDate: body.endDate || body.end_date,
      type: body.type || "vacation",
      reason: body.reason || null,
    };

    const result = await createStaffTimeOff.execute(timeOffData);

    if (!result.success) {
      if (result.code === 'OVERLAP') {
        return NextResponse.json(
          { error: result.error },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Fetch the created time off with staff details
    const createdTimeOff = await repository.findById(result.data.id);

    if (!createdTimeOff) {
      return NextResponse.json(
        { error: "Erro ao obter ausência criada" },
        { status: 500 }
      );
    }

    // Map to database format for backwards compatibility
    const data = {
      id: createdTimeOff.id,
      staff_id: createdTimeOff.staffId,
      start_date: createdTimeOff.startDate,
      end_date: createdTimeOff.endDate,
      type: createdTimeOff.type,
      reason: createdTimeOff.reason,
      status: createdTimeOff.status,
      approved_by: createdTimeOff.approvedBy,
      approved_at: createdTimeOff.approvedAt?.toISOString() || null,
      created_at: createdTimeOff.createdAt.toISOString(),
      updated_at: createdTimeOff.updatedAt.toISOString(),
      staff: createdTimeOff.staff,
      approver: createdTimeOff.approver || null,
      staff_name: createdTimeOff.staff.name,
      approved_by_name: createdTimeOff.approver?.name || null,
    };

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST staff-time-off:", error);
    return NextResponse.json(
      { error: "Erro ao criar ausencia" },
      { status: 500 }
    );
  }
}
