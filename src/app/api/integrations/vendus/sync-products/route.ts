import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseProductRepository } from "@/infrastructure/repositories/SupabaseProductRepository";
import { VendusIntegrationService } from "@/infrastructure/services/VendusIntegrationService";
import { SyncVendusProductsUseCase } from "@/application/use-cases/integrations/vendus/SyncVendusProductsUseCase";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun =
      typeof body.dryRun === "boolean" ? body.dryRun : body.dry_run === true;

    const supabase = await createClient();
    const productRepository = new SupabaseProductRepository(supabase);

    const vendusService = new VendusIntegrationService({
      apiKey: process.env.VENDUS_API_KEY ?? "",
      baseUrl: process.env.VENDUS_API_URL ?? "",
    });

    const useCase = new SyncVendusProductsUseCase(
      productRepository,
      vendusService,
    );

    const result = await useCase.execute({ dryRun });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({
      dryRun,
      summary: result.data,
    });
  } catch (error) {
    console.error("Error in POST /api/integrations/vendus/sync-products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

