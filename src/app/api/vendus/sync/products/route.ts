import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { syncProducts, getProductSyncStats, isVendusReadOnly } from "@/lib/vendus";
import { logActivity } from "@/lib/auth/activity";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/vendus/sync/products
 * Get products with vendus status and categories (for sync page)
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

    const supabase = createAdminClient();

    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products_with_vendus_status" as any)
        .select("*")
        .order("name"),
      supabase.from("categories").select("id, name").order("sort_order"),
    ]);

    return NextResponse.json({
      products: productsRes.data || [],
      categories: categoriesRes.data || [],
      stats: await getProductSyncStats(),
      isReadOnly: isVendusReadOnly(),
    });
  } catch (error) {
    console.error("Erro ao obter dados de sync:", error);
    return NextResponse.json(
      { error: "Erro ao obter dados de sync" },
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

    if (isVendusReadOnly() && (direction === "push" || direction === "both")) {
      return NextResponse.json(
        {
          error: "Vendus esta em modo de somente-leitura (VENDUS_READONLY=true). Operacoes de escrita estao desativadas.",
          readOnly: true,
        },
        { status: 403 },
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
