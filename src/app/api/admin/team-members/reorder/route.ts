import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds deve ser um array não vazio" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("staff")
        .update({ display_order: i + 1 })
        .eq("id", orderedIds[i]);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /admin/team-members/reorder POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao reordenar equipa" },
      { status: 500 },
    );
  }
}
