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

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const stats = await getProductSyncStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Erro ao obter estatisticas de sync:", error);
    return NextResponse.json(
      { error: "Erro ao obter estatisticas" },
      { status: 500 },
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

    if (!user) {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 401 },
      );
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo do pedido invalido" },
        { status: 400 },
      );
    }
    const locationSlug = body.locationSlug as string | undefined;
    const direction = (body.direction as string) || "both";
    const productIds = body.productIds as string[] | undefined;
    const pushAll = (body.pushAll as boolean) ?? false;
    const previewOnly = (body.previewOnly as boolean) ?? false;
    const defaultCategoryId = body.defaultCategoryId as string | undefined;

    if (!locationSlug) {
      return NextResponse.json(
        { error: "Localizacao obrigatoria" },
        { status: 400 },
      );
    }

    if (!["push", "pull", "both"].includes(direction)) {
      return NextResponse.json(
        { error: "Direcao invalida. Use: push, pull ou both" },
        { status: 400 },
      );
    }

    const result = await syncProducts({
      locationSlug,
      direction: direction as "push" | "pull" | "both",
      productIds,
      pushAll,
      previewOnly,
      defaultCategoryId,
      initiatedBy: user.id,
    });

    if (!previewOnly) {
      try {
        await logActivity(user.id, "vendus_product_sync", "product", undefined, {
          direction,
          locationSlug,
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsFailed: result.recordsFailed,
          success: result.success,
        });
      } catch (logError) {
        console.error("Erro ao registar atividade:", logError);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na sincronizacao de produtos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar produtos",
      },
      { status: 500 },
    );
  }
}
