import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/reservation-cancel/verify
 * Verifies the 6-digit code and returns upcoming reservations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const token = (body.token || "").trim();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email e código são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Find valid token
    const { data: tokenRow, error: tokenError } = await (supabase as any)
      .from("reservation_cancel_tokens")
      .select("id, expires_at, verified_at")
      .eq("email", email)
      .eq("token", token)
      .is("verified_at", null)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) {
      console.error("Error verifying token:", tokenError);
      return NextResponse.json(
        { error: "Erro ao verificar código" },
        { status: 500 }
      );
    }

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Código inválido ou expirado" },
        { status: 400 }
      );
    }

    // Mark token as verified
    await (supabase as any)
      .from("reservation_cancel_tokens")
      .update({ verified_at: now })
      .eq("id", tokenRow.id);

    // Fetch upcoming reservations for this email
    const today = new Date().toISOString().split("T")[0];
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select("*")
      .eq("email", email)
      .in("status", ["pending", "confirmed"])
      .gte("reservation_date", today)
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    if (resError) {
      console.error("Error fetching reservations:", resError);
      return NextResponse.json(
        { error: "Erro ao obter reservas" },
        { status: 500 }
      );
    }

    // Map to snake_case format for frontend
    const mapped = (reservations || []).map((r: any) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone,
      reservation_date: r.reservation_date,
      reservation_time: r.reservation_time,
      party_size: r.party_size,
      location: r.location,
      is_rodizio: r.is_rodizio,
      status: r.status,
      occasion: r.occasion,
      special_requests: r.special_requests,
      tables_assigned: r.tables_assigned,
    }));

    return NextResponse.json({
      success: true,
      reservations: mapped,
    });
  } catch (error) {
    console.error("Error in verify:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
