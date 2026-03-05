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

    // Atomic delete + insert via DB function (single transaction)
    // biome-ignore lint/suspicious/noExplicitAny: upsert_restaurant_hours not in generated types yet
    const { error: rpcError } = await (supabase as any).rpc("upsert_restaurant_hours", {
      p_slug: slug,
      p_hours: JSON.stringify(hours),
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}
