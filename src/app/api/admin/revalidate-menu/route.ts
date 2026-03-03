import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/revalidate-menu
 * Forces an immediate refresh of the restaurant menu schema cache.
 * The schema is normally cached for 24h; this allows manual refresh after menu changes.
 */
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    revalidateTag("restaurant-menu-schema");

    return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}
