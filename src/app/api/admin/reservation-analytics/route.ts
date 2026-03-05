import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SAFETY_LIMIT = 10_000;

/**
 * GET /api/admin/reservation-analytics?from=ISO_DATE&to=ISO_DATE&location=SLUG
 * Returns aggregated reservation analytics (admin only).
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

    const supabase = createAdminClient();

    let query = supabase
      .from('reservations')
      .select('id, reservation_date, reservation_time, party_size, status, location, created_at')
      .gte('reservation_date', from)
      .lte('reservation_date', to)
      .order('reservation_date', { ascending: true })
      .limit(SAFETY_LIMIT);

    if (location) {
      query = query.eq('location', location);
    }

    const { data: reservations, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = reservations || [];

    // 1. Volume by date
    const volumeMap = new Map<string, number>();
    for (const r of rows) {
      volumeMap.set(r.reservation_date, (volumeMap.get(r.reservation_date) || 0) + 1);
    }
    // Fill gaps
    const volumeByDate: { date: string; count: number }[] = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      volumeByDate.push({ date: dateStr, count: volumeMap.get(dateStr) || 0 });
      current.setDate(current.getDate() + 1);
    }

    // 2. Status distribution
    const statusMap = new Map<string, number>();
    for (const r of rows) {
      statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
    }
    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // 3. No-show trend (weekly)
    const weekMap = new Map<string, { total: number; noShow: number }>();
    for (const r of rows) {
      const d = new Date(r.reservation_date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
      const weekKey = weekStart.toISOString().split('T')[0];
      const entry = weekMap.get(weekKey) || { total: 0, noShow: 0 };
      entry.total++;
      if (r.status === 'no_show') entry.noShow++;
      weekMap.set(weekKey, entry);
    }
    const noShowTrend = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        rate: data.total > 0 ? (data.noShow / data.total) * 100 : 0,
        total: data.total,
      }));

    // 4. Party size distribution
    const sizeMap = new Map<number, number>();
    for (const r of rows) {
      const size = Math.min(r.party_size, 10);
      sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
    }
    const partySizeDistribution = Array.from(sizeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([size, count]) => ({ size, count }));

    // 5. Time slot heatmap (hour x dayOfWeek)
    const heatmap = new Map<string, number>();
    for (const r of rows) {
      if (!r.reservation_time) continue;
      const hour = parseInt(r.reservation_time.split(':')[0], 10);
      const dayOfWeek = new Date(r.reservation_date).getDay(); // 0=Sun..6=Sat
      const key = `${dayOfWeek}-${hour}`;
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }
    const timeSlotHeatmap = Array.from(heatmap.entries()).map(([key, count]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return { dayOfWeek, hour, count };
    });

    // 6. Location comparison
    const locMap = new Map<string, { total: number; confirmed: number; cancelled: number; noShow: number; completed: number }>();
    for (const r of rows) {
      const entry = locMap.get(r.location) || { total: 0, confirmed: 0, cancelled: 0, noShow: 0, completed: 0 };
      entry.total++;
      if (r.status === 'confirmed') entry.confirmed++;
      if (r.status === 'cancelled') entry.cancelled++;
      if (r.status === 'no_show') entry.noShow++;
      if (r.status === 'completed') entry.completed++;
      locMap.set(r.location, entry);
    }
    const locationComparison = Array.from(locMap.entries()).map(([loc, data]) => ({
      location: loc,
      ...data,
    }));

    // 7. Conversion funnel
    const totalCreated = rows.length;
    const totalConfirmed = rows.filter((r) => ['confirmed', 'completed', 'no_show'].includes(r.status)).length;
    const totalCompleted = rows.filter((r) => r.status === 'completed').length;
    const funnel = [
      { stage: 'Criadas', count: totalCreated, dropOff: 0 },
      { stage: 'Confirmadas', count: totalConfirmed, dropOff: totalCreated > 0 ? Math.round(((totalCreated - totalConfirmed) / totalCreated) * 100) : 0 },
      { stage: 'Concluídas', count: totalCompleted, dropOff: totalConfirmed > 0 ? Math.round(((totalConfirmed - totalCompleted) / totalConfirmed) * 100) : 0 },
    ];

    return NextResponse.json({
      meta: { from, to, totalCount: rows.length },
      volumeByDate,
      statusDistribution,
      noShowTrend,
      partySizeDistribution,
      timeSlotHeatmap,
      locationComparison,
      funnel,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('Reservation analytics error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar analytics de reservas' },
      { status: 500 }
    );
  }
}
