import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/locations
 * List restaurants with Vendus config (for admin Vendus pages)
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurants")
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
