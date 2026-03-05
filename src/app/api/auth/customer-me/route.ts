import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .select(
        "id, name, email, phone, birth_date, points, total_spent, visit_count, marketing_consent",
      )
      .eq("auth_user_id", user.id)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: "Perfil de cliente não encontrado." },
        { status: 404 },
      );
    }

    // Fetch recent reservations for this customer
    const { data: reservations } = await supabase
      .from("reservations")
      .select("id, reservation_date, reservation_time, party_size, status, location")
      .eq("customer_id", customer.id)
      .order("reservation_date", { ascending: false })
      .limit(5);

    return NextResponse.json({
      ...customer,
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("customer-me GET error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const allowed = ["name", "phone", "birth_date"] as const;
    const updates: Record<string, string | null> = {};
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key] || null;
      }
    }

    if (updates.name === null) {
      return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("customers")
      .update(updates)
      .eq("auth_user_id", user.id)
      .select(
        "id, name, email, phone, birth_date, points, total_spent, visit_count, marketing_consent",
      )
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("customer-me PATCH error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
