import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/locations
 * List locations (for admin dropdowns, etc.)
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("locations")
      .select(
        "id, name, slug, vendus_enabled, vendus_store_id, vendus_register_id",
      )
      .eq("is_active", true)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erro ao obter localizacoes:", error);
    return NextResponse.json(
      { error: "Erro ao obter localizacoes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/locations
 * Create a new location (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Nao autorizado" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, slug, vendus_enabled, vendus_store_id, vendus_register_id } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: "Nome e slug obrigatorios" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", slug.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Slug ja existe" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        is_active: true,
        vendus_enabled: vendus_enabled ?? false,
        vendus_store_id: vendus_store_id || null,
        vendus_register_id: vendus_register_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao criar localizacao:", error);
    return NextResponse.json({ error: "Erro ao criar localizacao" }, { status: 500 });
  }
}
