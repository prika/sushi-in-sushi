import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReservationInsert } from "@/types/database";

// Helper to get typed supabase query for tables not in generated types
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// GET - List reservations (for admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const location = searchParams.get("location");
    const status = searchParams.get("status");

    let query = extendedSupabase
      .from("reservations_with_details")
      .select("*")
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    if (date) {
      query = query.eq("reservation_date", date);
    }
    if (location) {
      query = query.eq("location", location);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback to direct table query if view doesn't exist
      let fallbackQuery = extendedSupabase
        .from("reservations")
        .select("*")
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (date) {
        fallbackQuery = fallbackQuery.eq("reservation_date", date);
      }
      if (location) {
        fallbackQuery = fallbackQuery.eq("location", location);
      }
      if (status) {
        fallbackQuery = fallbackQuery.eq("status", status);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        throw fallbackError;
      }

      return NextResponse.json(fallbackData || []);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Erro ao carregar reservas" },
      { status: 500 }
    );
  }
}

// POST - Create new reservation (public)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);
    const body: ReservationInsert = await request.json();

    // Validate required fields
    const requiredFields = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "reservation_date",
      "reservation_time",
      "party_size",
      "location",
    ];

    for (const field of requiredFields) {
      if (!body[field as keyof ReservationInsert]) {
        return NextResponse.json(
          { error: `Campo obrigatório em falta: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate party size
    if (body.party_size < 1 || body.party_size > 20) {
      return NextResponse.json(
        { error: "Número de pessoas deve ser entre 1 e 20" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const reservationDate = new Date(body.reservation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reservationDate < today) {
      return NextResponse.json(
        { error: "Não é possível reservar para datas passadas" },
        { status: 400 }
      );
    }

    // Validate location
    if (!["circunvalacao", "boavista"].includes(body.location)) {
      return NextResponse.json(
        { error: "Localização inválida" },
        { status: 400 }
      );
    }

    // Create reservation
    const { data, error } = await extendedSupabase
      .from("reservations")
      .insert({
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email.toLowerCase().trim(),
        phone: body.phone.trim(),
        reservation_date: body.reservation_date,
        reservation_time: body.reservation_time,
        party_size: body.party_size,
        location: body.location,
        is_rodizio: body.is_rodizio ?? true,
        special_requests: body.special_requests?.trim() || null,
        occasion: body.occasion || null,
        marketing_consent: body.marketing_consent ?? false,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating reservation:", error);
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Erro ao criar reserva. Por favor tente novamente." },
      { status: 500 }
    );
  }
}
