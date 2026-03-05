import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabaseStaffTimeOffRepository } from "@/infrastructure/repositories/SupabaseStaffTimeOffRepository";
import {
  UpdateStaffTimeOffUseCase,
  DeleteStaffTimeOffUseCase,
} from "@/application/use-cases/staff-time-off";
import type { UpdateStaffTimeOffData } from "@/domain/entities/StaffTimeOff";
import { sendTimeOffApprovalEmail } from "@/lib/email";

// PATCH - Update time off entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update time off entries
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir ausencias" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const repository = new SupabaseStaffTimeOffRepository(supabase);
    const updateStaffTimeOff = new UpdateStaffTimeOffUseCase(repository);

    const body = await request.json();

    // Build UpdateStaffTimeOffData from request body (supporting both camelCase and snake_case)
    const updateData: UpdateStaffTimeOffData = {};

    if (body.startDate !== undefined || body.start_date !== undefined) {
      updateData.startDate = body.startDate || body.start_date;
    }
    if (body.endDate !== undefined || body.end_date !== undefined) {
      updateData.endDate = body.endDate || body.end_date;
    }
    if (body.type !== undefined) {
      updateData.type = body.type;
    }
    if (body.reason !== undefined) {
      updateData.reason = body.reason;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
      // If status is being changed to approved, record the approver
      if (body.status === "approved") {
        updateData.approvedBy = auth.id;
      }
    }

    const result = await updateStaffTimeOff.execute({
      id: parseInt(id),
      data: updateData,
    });

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
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

    // Fetch the updated time off with staff details
    const updatedTimeOff = await repository.findById(result.data.id);

    if (!updatedTimeOff) {
      return NextResponse.json(
        { error: "Erro ao obter ausência atualizada" },
        { status: 500 }
      );
    }

    // Send approval email if status changed to approved
    if (body.status === "approved") {
      const { data: staffData } = await supabase
        .from("staff")
        .select("email")
        .eq("id", updatedTimeOff.staffId)
        .single();

      if (staffData?.email) {
        sendTimeOffApprovalEmail(
          staffData.email,
          updatedTimeOff.staff.name,
          updatedTimeOff.id,
          updatedTimeOff.type,
          updatedTimeOff.startDate,
          updatedTimeOff.endDate,
          updatedTimeOff.reason,
        ).catch((err) =>
          console.error("Failed to send time-off approval email:", err)
        );
      }
    }

    // Map to database format for backwards compatibility
    const data = {
      id: updatedTimeOff.id,
      staff_id: updatedTimeOff.staffId,
      start_date: updatedTimeOff.startDate,
      end_date: updatedTimeOff.endDate,
      type: updatedTimeOff.type,
      reason: updatedTimeOff.reason,
      status: updatedTimeOff.status,
      approved_by: updatedTimeOff.approvedBy,
      approved_at: updatedTimeOff.approvedAt?.toISOString() || null,
      created_at: updatedTimeOff.createdAt.toISOString(),
      updated_at: updatedTimeOff.updatedAt.toISOString(),
      staff: updatedTimeOff.staff,
      approver: updatedTimeOff.approver || null,
      staff_name: updatedTimeOff.staff.name,
      approved_by_name: updatedTimeOff.approver?.name || null,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH staff-time-off:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar ausencia" },
      { status: 500 }
    );
  }
}

// DELETE - Remove time off entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete time off entries
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir ausencias" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const repository = new SupabaseStaffTimeOffRepository(supabase);
    const deleteStaffTimeOff = new DeleteStaffTimeOffUseCase(repository);

    const result = await deleteStaffTimeOff.execute({ id: parseInt(id) });

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE staff-time-off:", error);
    return NextResponse.json(
      { error: "Erro ao remover ausencia" },
      { status: 500 }
    );
  }
}
