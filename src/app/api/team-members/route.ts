import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("staff")
      .select("id, name, public_position, photo_url, display_order")
      .eq("show_on_website", true)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to the format expected by public components
    const members = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      position: row.public_position || "",
      photoUrl: row.photo_url,
    }));

    return NextResponse.json(members);
  } catch (error) {
    console.error("[API /team-members GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar equipa" },
      { status: 500 },
    );
  }
}
