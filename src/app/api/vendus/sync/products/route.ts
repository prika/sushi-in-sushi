import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { syncProducts, getProductSyncStats } from "@/lib/vendus";
import { logActivity } from "@/lib/auth/activity";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendus/sync/products
 * Get product sync statistics
 */
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const stats = await getProductSyncStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Erro ao obter estatisticas de sync:", error);
    return NextResponse.json(
      { error: "Erro ao obter estatisticas" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendus/sync/products
 * Trigger product synchronization
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { locationSlug, direction = "both", productIds } = body;

    if (!locationSlug) {
      return NextResponse.json(
        { error: "Localizacao obrigatoria" },
        { status: 400 }
      );
    }

    if (!["push", "pull", "both"].includes(direction)) {
      return NextResponse.json(
        { error: "Direcao invalida. Use: push, pull ou both" },
        { status: 400 }
      );
    }

    const result = await syncProducts({
      locationSlug,
      direction,
      productIds,
      initiatedBy: user.id,
    });

    await logActivity(user.id, "vendus_product_sync", "product", undefined, {
      direction,
      locationSlug,
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      recordsFailed: result.recordsFailed,
      success: result.success,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na sincronizacao de produtos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar produtos" },
      { status: 500 }
    );
  }
}
