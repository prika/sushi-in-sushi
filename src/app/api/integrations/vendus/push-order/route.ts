import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupabaseOrderRepositoryOptimized as SupabaseOrderRepository } from "@/infrastructure/repositories/SupabaseOrderRepository.optimized";
import { SupabaseProductRepository } from "@/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseSessionRepository } from "@/infrastructure/repositories/SupabaseSessionRepository";
import { VendusIntegrationService } from "@/infrastructure/services/VendusIntegrationService";
import { PushOrderToVendusUseCase } from "@/application/use-cases/integrations/vendus/PushOrderToVendusUseCase";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const sessionId: string | undefined = body.sessionId ?? body.session_id;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const orderRepository = new SupabaseOrderRepository(supabase);
    const productRepository = new SupabaseProductRepository(supabase);
    const sessionRepository = new SupabaseSessionRepository(supabase);

    const vendusService = new VendusIntegrationService({
      apiKey: process.env.VENDUS_API_KEY ?? "",
      baseUrl: process.env.VENDUS_API_URL ?? "",
    });

    const useCase = new PushOrderToVendusUseCase(
      orderRepository,
      productRepository,
      sessionRepository,
      vendusService,
    );

    const result = await useCase.execute({ sessionId });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 },
      );
    }

    return NextResponse.json({
      documentId: result.data.documentId,
      documentNumber: result.data.documentNumber,
    });
  } catch (error) {
    console.error("Error in POST /api/integrations/vendus/push-order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

