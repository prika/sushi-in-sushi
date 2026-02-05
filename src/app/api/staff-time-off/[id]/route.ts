import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import type { StaffTimeOffUpdate } from "@/types/database";

// Helper to get typed supabase query for tables not in generated types
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

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
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const body: StaffTimeOffUpdate = await request.json();

    // Validate dates if both provided
    if (body.start_date && body.end_date) {
      if (new Date(body.end_date) < new Date(body.start_date)) {
        return NextResponse.json(
          { error: "Data de fim deve ser igual ou posterior a data de inicio" },
          { status: 400 }
        );
      }
    }

    // Update the entry
    const updateData: Record<string, unknown> = { ...body };

    // If status is being changed to approved, record the approver
    if (body.status === "approved") {
      updateData.approved_by = auth.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await extendedSupabase
      .from("staff_time_off")
      .update(updateData)
      .eq("id", parseInt(id))
      .select(`
        *,
        staff:staff_id(id, name, email),
        approver:approved_by(id, name)
      `)
      .single();

    if (error) {
      console.error("Error updating time off:", error);
      throw error;
    }

    const transformedData = {
      ...data,
      staff_name: (data as { staff: { name: string } | null }).staff?.name || "Unknown",
      staff_email: (data as { staff: { email: string } | null }).staff?.email || "",
      approved_by_name: (data as { approver: { name: string } | null }).approver?.name || null,
    };

    return NextResponse.json(transformedData);
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
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const { error } = await extendedSupabase
      .from("staff_time_off")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      console.error("Error deleting time off:", error);
      throw error;
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
