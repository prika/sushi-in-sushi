import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // biome-ignore lint/suspicious/noExplicitAny: site_settings not in generated types yet
    const { data, error } = await (supabase as any)
      .from("site_settings")
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
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Only allow known fields
    const allowed = [
      "brand_name", "description", "price_range",
      "facebook_url", "instagram_url",
      "google_reviews_url", "tripadvisor_url", "thefork_url", "zomato_url",
      "google_maps_url", "gtm_id",
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    const supabase = createAdminClient();

    // biome-ignore lint/suspicious/noExplicitAny: site_settings not in generated types yet
    const { data, error } = await (supabase as any)
      .from("site_settings")
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
