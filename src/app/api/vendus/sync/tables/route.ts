import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { importTablesFromVendus, getTableMapping } from "@/lib/vendus";
import { logActivity } from "@/lib/auth/activity";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendus/sync/tables
 * Get table mapping for a location
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationSlug = searchParams.get("location") || "circunvalacao";

    const mapping = await getTableMapping(locationSlug);
    return NextResponse.json(mapping);
  } catch (error) {
    console.error("Erro ao obter mapeamento de mesas:", error);
    return NextResponse.json(
      { error: "Erro ao obter mapeamento" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendus/sync/tables
 * Trigger table import from Vendus
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { locationSlug } = body;

    if (!locationSlug) {
      return NextResponse.json(
        { error: "Localizacao obrigatoria" },
        { status: 400 }
      );
    }

    const result = await importTablesFromVendus({
      locationSlug,
      initiatedBy: user.id,
    });

    await logActivity(user.id, "vendus_table_import", "table", undefined, {
      locationSlug,
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      success: result.success,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na importacao de mesas:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao importar mesas" },
      { status: 500 }
    );
  }
}
