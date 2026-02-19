import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { syncCategoriesToVendus } from "@/lib/vendus/categories";
import { logActivity } from "@/lib/auth/activity";

export const dynamic = "force-dynamic";

/**
 * POST /api/vendus/sync/categories
 * Export categories to Vendus
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { locationSlug } = body;

    if (!locationSlug) {
      return NextResponse.json(
        { error: "Localizacao obrigatoria" },
        { status: 400 },
      );
    }

    const result = await syncCategoriesToVendus(locationSlug, user.id);

    await logActivity(user.id, "vendus_category_sync", "category", undefined, {
      locationSlug,
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      recordsFailed: result.recordsFailed,
      success: result.success,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na sincronizacao de categorias:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao exportar categorias",
      },
      { status: 500 },
    );
  }
}
