'use client';

import { useState, useEffect } from 'react';
import { useLocations } from '@/presentation/hooks/useLocations';
import { useDateRange } from '@/presentation/hooks/useDateRange';
import {
  DateRangePicker,
  KpiCard,
  ChartCard,
  AreaChartWidget,
  BarChartWidget,
  DonutChartWidget,
  CHART_COLORS,
} from '@/presentation/components/charts';
import {
  CalendarDays,
  CheckCircle2,
  UserX,
  Users,
  MapPin,
} from 'lucide-react';

const STATUS_LABELS: Record<string, { name: string; color: string }> = {
  pending: { name: 'Pendente', color: CHART_COLORS.pending },
  confirmed: { name: 'Confirmada', color: CHART_COLORS.confirmed },
  cancelled: { name: 'Cancelada', color: CHART_COLORS.cancelled },
  completed: { name: 'Concluída', color: CHART_COLORS.completed },
  no_show: { name: 'Não Compareceu', color: CHART_COLORS.noShow },
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface AnalyticsData {
  meta: { from: string; to: string; totalCount: number };
  volumeByDate: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  noShowTrend: { week: string; rate: number; total: number }[];
  partySizeDistribution: { size: number; count: number }[];
  timeSlotHeatmap: { dayOfWeek: number; hour: number; count: number }[];
  locationComparison: { location: string; total: number; confirmed: number; cancelled: number; noShow: number; completed: number }[];
  funnel: { stage: string; count: number; dropOff: number }[];
}

export function ReservationAnalytics() {
  const { dateRange, setDateRange } = useDateRange('90d');
  const [location, setLocation] = useState('');
  const { locations } = useLocations();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
      if (location) params.set('location', location);

      try {
        const res = await fetch(`/api/admin/reservation-analytics?${params}`);
        if (res.ok) setData(await res.json());
      } catch {
        // silent
      }
      setIsLoading(false);
    };
    fetchData();
  }, [dateRange.from, dateRange.to, location]);

  const totalConfirmed = data?.statusDistribution.find((s) => s.status === 'confirmed')?.count || 0;
  const totalNoShow = data?.statusDistribution.find((s) => s.status === 'no_show')?.count || 0;
  const noShowRate = data?.meta.totalCount ? (totalNoShow / data.meta.totalCount) * 100 : 0;
  const avgPartySize =
    data?.partySizeDistribution && data.partySizeDistribution.length > 0
      ? data.partySizeDistribution.reduce((sum, d) => sum + d.size * d.count, 0) /
        data.partySizeDistribution.reduce((sum, d) => sum + d.count, 0)
      : 0;

  // Status donut
  const statusDonut =
    data?.statusDistribution.map((d) => ({
      name: STATUS_LABELS[d.status]?.name || d.status,
      value: d.count,
      color: STATUS_LABELS[d.status]?.color || CHART_COLORS.axis,
    })) || [];

  // Heatmap data
  const heatmapMax = Math.max(1, ...(data?.timeSlotHeatmap.map((d) => d.count) || [1]));
  const heatmapHours = data?.timeSlotHeatmap
    ? Array.from(new Set(data.timeSlotHeatmap.map((d) => d.hour))).sort((a, b) => a - b)
    : [];

  const formatDateShort = (val: string) => {
    const d = new Date(val);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const formatWeek = (val: string) => {
    const d = new Date(val);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Todos os locais</option>
            {locations.map((loc) => (
              <option key={loc.slug} value={loc.slug}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Reservas" value={data?.meta.totalCount ?? 0} icon={<CalendarDays className="h-4 w-4" />} isLoading={isLoading} />
        <KpiCard label="Confirmadas" value={totalConfirmed} icon={<CheckCircle2 className="h-4 w-4" />} isLoading={isLoading} />
        <KpiCard label="Taxa No-Show" value={noShowRate} format="percent" icon={<UserX className="h-4 w-4" />} trendReversed isLoading={isLoading} />
        <KpiCard label="Grupo Médio" value={Math.round(avgPartySize * 10) / 10} icon={<Users className="h-4 w-4" />} isLoading={isLoading} />
      </div>

      {/* Volume + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Volume de Reservas" subtitle="Reservas por dia">
          {isLoading ? (
            <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <AreaChartWidget
              data={data?.volumeByDate || []}
              xKey="date"
              yKey="count"
              height={280}
              xTickFormatter={formatDateShort}
            />
          )}
        </ChartCard>

        <ChartCard title="Distribuição por Estado">
          {isLoading ? (
            <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <DonutChartWidget
              data={statusDonut}
              height={280}
              centerValue={String(data?.meta.totalCount || 0)}
              centerLabel="total"
            />
          )}
        </ChartCard>
      </div>

      {/* No-show trend + Party size */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tendência No-Shows" subtitle="Taxa semanal de não comparências">
          {isLoading ? (
            <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <AreaChartWidget
              data={data?.noShowTrend || []}
              xKey="week"
              yKey="rate"
              height={280}
              color={CHART_COLORS.cancelled}
              xTickFormatter={formatWeek}
            />
          )}
        </ChartCard>

        <ChartCard title="Tamanho do Grupo" subtitle="Distribuição do nº de pessoas">
          {isLoading ? (
            <div className="h-[280px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <BarChartWidget
              data={data?.partySizeDistribution || []}
              xKey="size"
              bars={[{ key: 'count', name: 'Reservas', color: CHART_COLORS.gold }]}
              height={280}
              xTickFormatter={(s) => `${s}p`}
            />
          )}
        </ChartCard>
      </div>

      {/* Heatmap */}
      <ChartCard title="Horários Populares" subtitle="Reservas por dia da semana e hora">
        {isLoading ? (
          <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
        ) : heatmapHours.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            Sem dados para o período selecionado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
              {/* Header row */}
              <div />
              {DAY_LABELS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 pb-1">
                  {day}
                </div>
              ))}
              {/* Data rows */}
              {heatmapHours.map((hour) => (
                <div key={hour} className="contents">
                  <div className="text-xs text-gray-500 text-right pr-2 py-1">{hour}:00</div>
                  {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                    const entry = data?.timeSlotHeatmap.find(
                      (d) => d.dayOfWeek === dow && d.hour === hour
                    );
                    const count = entry?.count || 0;
                    const opacity = count > 0 ? Math.max(0.15, count / heatmapMax) : 0;
                    return (
                      <div
                        key={dow}
                        className="rounded h-8 flex items-center justify-center text-xs"
                        style={{
                          backgroundColor: count > 0 ? `rgba(212, 175, 55, ${opacity})` : '#F9FAFB',
                        }}
                        title={`${DAY_LABELS[dow]} ${hour}:00 — ${count} reservas`}
                      >
                        {count > 0 && <span className="text-gray-700 font-medium">{count}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      {/* Location Comparison + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data && data.locationComparison.length > 1 && (
          <ChartCard title="Comparação por Local">
            <BarChartWidget
              data={data.locationComparison.map((d) => ({
                name: d.location,
                Confirmadas: d.confirmed,
                Concluídas: d.completed,
                Canceladas: d.cancelled,
                'Não Compareceu': d.noShow,
              }))}
              xKey="name"
              bars={[
                { key: 'Confirmadas', name: 'Confirmadas', color: CHART_COLORS.confirmed, stackId: 's' },
                { key: 'Concluídas', name: 'Concluídas', color: CHART_COLORS.completed, stackId: 's' },
                { key: 'Canceladas', name: 'Canceladas', color: CHART_COLORS.cancelled, stackId: 's' },
                { key: 'Não Compareceu', name: 'Não Compareceu', color: CHART_COLORS.noShow, stackId: 's' },
              ]}
              showLegend
              height={280}
            />
          </ChartCard>
        )}

        <ChartCard title="Funil de Conversão" subtitle="Criadas → Confirmadas → Concluídas">
          {isLoading ? (
            <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <div className="space-y-3 py-4">
              {data?.funnel.map((stage, i) => {
                const maxCount = data.funnel[0]?.count || 1;
                const widthPct = Math.max(20, (stage.count / maxCount) * 100);
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                      <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-3 transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: CHART_COLORS.palette[i] || CHART_COLORS.gold,
                        }}
                      >
                        {stage.dropOff > 0 && (
                          <span className="text-xs text-white/80 font-medium">
                            -{stage.dropOff}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
