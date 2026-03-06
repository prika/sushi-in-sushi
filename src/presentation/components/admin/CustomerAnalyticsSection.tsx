'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDateRange } from '@/presentation/hooks/useDateRange';
import {
  DateRangePicker,
  ChartCard,
  DonutChartWidget,
  AreaChartWidget,
  BarChartWidget,
  CHART_COLORS,
} from '@/presentation/components/charts';

const TIER_COLORS = [
  CHART_COLORS.tier1,
  CHART_COLORS.tier2,
  CHART_COLORS.tier3,
  CHART_COLORS.tier4,
  CHART_COLORS.tier5,
];

interface CustomerAnalyticsData {
  meta: { totalCustomers: number; consentRate: number };
  tierDistribution: { tier: number; label: string; count: number }[];
  acquisitionOverTime: { week: string; count: number }[];
  spendingDistribution: { bracket: string; count: number }[];
  visitFrequency: { visits: string; count: number }[];
}

export function CustomerAnalyticsSection() {
  const [expanded, setExpanded] = useState(false);
  const { dateRange, setDateRange } = useDateRange('90d');
  const [data, setData] = useState<CustomerAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    const fetchData = async () => {
      setIsLoading(true);
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
      try {
        const res = await fetch(`/api/admin/customer-analytics?${params}`);
        if (res.ok) setData(await res.json());
      } catch {
        // silent
      }
      setIsLoading(false);
    };
    fetchData();
  }, [expanded, dateRange.from, dateRange.to]);

  const tierDonut =
    data?.tierDistribution.map((d) => ({
      name: d.label,
      value: d.count,
      color: TIER_COLORS[d.tier - 1] || CHART_COLORS.axis,
    })) || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Analytics de Clientes</span>
          {data && !isLoading && (
            <span className="text-xs text-gray-400">
              {data.meta.totalCustomers} clientes · {data.meta.consentRate}% com marketing
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tier Distribution */}
            <ChartCard title="Distribuição por Tier">
              {isLoading ? (
                <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
              ) : (
                <DonutChartWidget
                  data={tierDonut}
                  height={200}
                  centerValue={String(data?.meta.totalCustomers || 0)}
                  centerLabel="clientes"
                />
              )}
            </ChartCard>

            {/* Acquisition over time */}
            <ChartCard title="Novos Clientes" subtitle="Aquisição semanal">
              {isLoading ? (
                <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
              ) : (
                <AreaChartWidget
                  data={data?.acquisitionOverTime || []}
                  xKey="week"
                  yKey="count"
                  height={200}
                  color={CHART_COLORS.delivered}
                  xTickFormatter={(w: string) => {
                    const d = new Date(w);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
              )}
            </ChartCard>

            {/* Spending distribution */}
            <ChartCard title="Distribuição de Gastos">
              {isLoading ? (
                <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
              ) : (
                <BarChartWidget
                  data={data?.spendingDistribution || []}
                  xKey="bracket"
                  bars={[{ key: 'count', name: 'Clientes', color: CHART_COLORS.gold }]}
                  height={200}
                />
              )}
            </ChartCard>
          </div>

          {/* Visit Frequency */}
          <ChartCard title="Frequência de Visitas" subtitle="Número de visitas por cliente">
            {isLoading ? (
              <div className="h-[220px] bg-gray-50 rounded animate-pulse" />
            ) : (
              <BarChartWidget
                data={data?.visitFrequency || []}
                xKey="visits"
                bars={[{ key: 'count', name: 'Clientes', color: CHART_COLORS.preparing }]}
                height={220}
                xTickFormatter={(v) => `${v} visitas`}
              />
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
