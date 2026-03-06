import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // biome-ignore lint/suspicious/noExplicitAny: business_strategy not in generated types yet
    const { data, error } = await (supabase as any)
      .from("business_strategy")
      .select("*")
      .eq("id", 1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? null);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();

    const allowed = [
      "objectives",
      "target_audience",
      "competitive_edge",
      "communication_tone",
      "age_range_min",
      "age_range_max",
      "key_dates",
      "marketing_budget_monthly",
      "active_channels",
      "competitors",
      "cuisine_types",
      "capacity_lunch",
      "capacity_dinner",
      "avg_price_min",
      "avg_price_max",
    ];

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    const supabase = createAdminClient();

    // biome-ignore lint/suspicious/noExplicitAny: business_strategy not in generated types yet
    const { data, error } = await (supabase as any)
      .from("business_strategy")
      .upsert({ id: 1, ...updateData }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}
