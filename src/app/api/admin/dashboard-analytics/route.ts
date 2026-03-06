import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAuth } from '@/lib/auth';
import { SupabaseDashboardAnalyticsRepository } from '@/infrastructure/repositories/SupabaseDashboardAnalyticsRepository';
import { GetDashboardAnalyticsUseCase } from '@/application/use-cases/dashboard-analytics/GetDashboardAnalyticsUseCase';
import { getPreviousPeriod } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard-analytics?from=ISO_DATE&to=ISO_DATE&location=SLUG
 * Returns aggregated dashboard analytics (admin only).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const location = searchParams.get('location') ?? undefined;

    if (!from || !to) {
      return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 });
    }

    if (isNaN(new Date(from).getTime()) || isNaN(new Date(to).getTime())) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    }

    const previous = getPreviousPeriod({ from, to, preset: 'custom' });

    const supabase = createAdminClient();
    const repository = new SupabaseDashboardAnalyticsRepository(supabase);
    const useCase = new GetDashboardAnalyticsUseCase(repository);

    const result = await useCase.execute({
      from: new Date(from),
      to: new Date(to),
      location,
      previousFrom: new Date(previous.from),
      previousTo: new Date(previous.to),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar analytics do dashboard' },
      { status: 500 }
    );
  }
}
