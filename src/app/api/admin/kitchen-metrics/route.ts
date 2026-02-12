import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabaseKitchenMetricsRepository } from "@/infrastructure/repositories/SupabaseKitchenMetricsRepository";
import { GetKitchenMetricsUseCase } from "@/application/use-cases/kitchen-metrics/GetKitchenMetricsUseCase";

/**
 * GET /api/admin/kitchen-metrics?location=SLUG&from=DATE&to=DATE
 * Returns per-staff kitchen performance metrics (admin only).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const location = searchParams.get("location") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const supabase = await createClient();
    const repository = new SupabaseKitchenMetricsRepository(supabase);
    const useCase = new GetKitchenMetricsUseCase(repository);

    const result = await useCase.execute({
      location,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ metrics: result.data });
  } catch (error) {
    console.error("Kitchen metrics error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar métricas da cozinha" },
      { status: 500 },
    );
  }
}
