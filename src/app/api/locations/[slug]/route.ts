import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/locations/[slug]
 * Update location (Vendus config)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { vendus_enabled, vendus_store_id, vendus_register_id } = body;

    const updateData: Record<string, unknown> = {};
    if (typeof vendus_enabled === "boolean")
      updateData.vendus_enabled = vendus_enabled;
    if (typeof vendus_store_id === "string")
      updateData.vendus_store_id = vendus_store_id || null;
    if (typeof vendus_register_id === "string")
      updateData.vendus_register_id = vendus_register_id || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("locations")
      .update(updateData)
      .eq("slug", slug)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao atualizar localizacao:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar localizacao" },
      { status: 500 },
    );
  }
}
