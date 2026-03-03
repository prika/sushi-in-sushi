import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // biome-ignore lint/suspicious/noExplicitAny: restaurant_hours not in generated types yet
    const { data, error } = await (supabase as any)
      .from("restaurant_hours")
      .select("day_of_week, opens_at, closes_at")
      .eq("restaurant_slug", slug)
      .order("day_of_week")
      .order("opens_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    const { slug, hours } = await request.json();

    if (!slug || !Array.isArray(hours)) {
      return NextResponse.json({ error: "slug e hours obrigatórios" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Delete existing hours for this restaurant
    // biome-ignore lint/suspicious/noExplicitAny: restaurant_hours not in generated types yet
    const { error: deleteError } = await (supabase as any)
      .from("restaurant_hours")
      .delete()
      .eq("restaurant_slug", slug);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new hours (if any)
    if (hours.length > 0) {
      const rows = hours.map((h: { day_of_week: number; opens_at: string; closes_at: string }) => ({
        restaurant_slug: slug,
        day_of_week: h.day_of_week,
        opens_at: h.opens_at,
        closes_at: h.closes_at,
      }));

      // biome-ignore lint/suspicious/noExplicitAny: restaurant_hours not in generated types yet
      const { error: insertError } = await (supabase as any)
        .from("restaurant_hours")
        .insert(rows);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}
