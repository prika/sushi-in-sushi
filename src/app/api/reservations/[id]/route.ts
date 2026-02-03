import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import type { ReservationUpdate, Reservation } from "@/types/database";
import { sendReservationConfirmedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Helper to get typed supabase query for tables not in generated types
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// GET - Get single reservation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const { data, error } = await extendedSupabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Reserva não encontrada" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Erro ao carregar reserva" },
      { status: 500 }
    );
  }
}

// PATCH - Update reservation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const body: ReservationUpdate = await request.json();

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;

      // Set confirmed_at and confirmed_by when confirming
      if (body.status === "confirmed") {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = user.id;
      }

      // Set cancelled_at when cancelling
      if (body.status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        if (body.cancellation_reason) {
          updateData.cancellation_reason = body.cancellation_reason;
        }
      }

      // Set seated_at when completing (seated)
      if (body.status === "completed") {
        updateData.seated_at = new Date().toISOString();
      }
    }

    if (body.table_id !== undefined) {
      updateData.table_id = body.table_id;
    }

    if (body.special_requests !== undefined) {
      updateData.special_requests = body.special_requests;
    }

    if (body.session_id !== undefined) {
      updateData.session_id = body.session_id;
    }

    const { data, error } = await extendedSupabase
      .from("reservations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Reserva não encontrada" },
          { status: 404 }
        );
      }
      throw error;
    }

    // Send confirmation email if status changed to confirmed
    if (body.status === "confirmed" && data) {
      sendReservationConfirmedEmail(data as Reservation).catch((emailError) => {
        console.error("Error sending confirmation email:", emailError);
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar reserva" },
      { status: 500 }
    );
  }
}

// DELETE - Delete reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const { error } = await extendedSupabase.from("reservations").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar reserva" },
      { status: 500 }
    );
  }
}
