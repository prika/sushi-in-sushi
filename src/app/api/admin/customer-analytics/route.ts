import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customer-analytics?from=ISO_DATE&to=ISO_DATE
 * Returns aggregated customer analytics (admin only).
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

    if (!from || !to) {
      return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, visit_count, total_spent, points, email, phone, birth_date, marketing_consent, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = customers || [];

    // Compute tier dynamically based on profile + behavior
    const computeTier = (c: typeof rows[0]): number => {
      const hasEmail = !!c.email;
      const hasPhone = !!c.phone;
      const hasBirthDate = !!c.birth_date;
      const visits = c.visit_count || 0;
      const spent = c.total_spent || 0;
      const fullProfile = hasEmail && hasPhone && hasBirthDate;

      if (fullProfile && visits >= 10 && spent >= 500) return 5;
      if (fullProfile && visits >= 3) return 4;
      if ((hasEmail || hasPhone) && visits >= 1) return 3;
      if (hasEmail || hasPhone) return 2;
      return 1;
    }

    // 1. Tier distribution
    const tierMap = new Map<number, number>();
    for (const c of rows) {
      const tier = computeTier(c);
      tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
    }
    const tierLabels: Record<number, string> = {
      1: 'Novo', 2: 'Identificado', 3: 'Cliente', 4: 'Regular', 5: 'VIP',
    };
    const tierDistribution = Array.from(tierMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([tier, count]) => ({ tier, label: tierLabels[tier] || `Tier ${tier}`, count }));

    // 2. Acquisition over time (weekly, within date range)
    const weekMap = new Map<string, number>();
    for (const c of rows) {
      const d = new Date(c.created_at);
      if (d < new Date(from) || d > new Date(to + 'T23:59:59')) continue;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const weekKey = weekStart.toISOString().split('T')[0];
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }
    const acquisitionOverTime = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    // 3. Spending distribution (histogram)
    const brackets = [0, 50, 100, 200, 500, 1000, Infinity];
    const bracketLabels = ['€0-50', '€50-100', '€100-200', '€200-500', '€500-1000', '€1000+'];
    const spendingCounts = new Array(bracketLabels.length).fill(0);
    for (const c of rows) {
      const spent = c.total_spent || 0;
      for (let i = 0; i < brackets.length - 1; i++) {
        if (spent >= brackets[i] && spent < brackets[i + 1]) {
          spendingCounts[i]++;
          break;
        }
      }
    }
    const spendingDistribution = bracketLabels.map((label, i) => ({
      bracket: label,
      count: spendingCounts[i],
    }));

    // 4. Visit frequency distribution
    const visitMap = new Map<string, number>();
    for (const c of rows) {
      const visits = c.visit_count || 0;
      let label: string;
      if (visits === 0) label = '0';
      else if (visits === 1) label = '1';
      else if (visits <= 3) label = '2-3';
      else if (visits <= 5) label = '4-5';
      else if (visits <= 10) label = '6-10';
      else label = '10+';
      visitMap.set(label, (visitMap.get(label) || 0) + 1);
    }
    const visitOrder = ['0', '1', '2-3', '4-5', '6-10', '10+'];
    const visitFrequency = visitOrder
      .filter((label) => visitMap.has(label))
      .map((label) => ({ visits: label, count: visitMap.get(label) || 0 }));

    // 5. Marketing consent rate
    const withConsent = rows.filter((c) => c.marketing_consent).length;
    const consentRate = rows.length > 0 ? Math.round((withConsent / rows.length) * 100) : 0;

    return NextResponse.json({
      meta: { totalCustomers: rows.length, consentRate },
      tierDistribution,
      acquisitionOverTime,
      spendingDistribution,
      visitFrequency,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar analytics de clientes' },
      { status: 500 }
    );
  }
}
