'use client';

import { useState, useEffect } from 'react';
import { useDateRange } from '@/hooks/useDateRange';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  DateRangePicker,
  KpiCard,
  ChartCard,
  BarChartWidget,
  DonutChartWidget,
  HorizontalBarWidget,
  CHART_COLORS,
  CHART_DEFAULTS,
  formatCurrency,
} from '@/components/charts';
import { DollarSign, ShoppingBag, Star, Receipt } from 'lucide-react';

interface ProductAnalyticsData {
  meta: { from: string; to: string; totalRevenue: number; totalOrders: number; avgRating: number };
  topByRevenue: { productId: string; name: string; revenue: number; category: string }[];
  topByQuantity: { productId: string; name: string; quantity: number; category: string }[];
  categoryRevenue: { category: string; revenue: number; percentage: number }[];
  ratingsDistribution: { rating: number; count: number }[];
  revenueByCategoryOverTime: Record<string, number | string>[];
  categoryNames: string[];
  ratedVsOrdered: { productId: string; name: string; avgRating: number; totalOrdered: number; revenue: number }[];
}

const RATING_COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'];

export function ProductAnalytics() {
  const { dateRange, setDateRange } = useDateRange('30d');
  const [data, setData] = useState<ProductAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(false);
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
      try {
        const res = await fetch(`/api/admin/product-analytics?${params}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [dateRange.from, dateRange.to]);

  const categoryDonut =
    data?.categoryRevenue.map((d, i) => ({
      name: d.category,
      value: d.revenue,
      color: CHART_COLORS.palette[i % CHART_COLORS.palette.length],
    })) || [];

  const ratingsData =
    data?.ratingsDistribution.map((d) => ({
      ...d,
      fill: RATING_COLORS[d.rating - 1],
    })) || [];

  const avgTicket =
    data?.meta.totalOrders ? data.meta.totalRevenue / data.meta.totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          Erro ao carregar dados de produtos. Tente recarregar a página.
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita Total" value={data?.meta.totalRevenue ?? 0} format="currency" icon={<DollarSign className="h-4 w-4" />} isLoading={isLoading} />
        <KpiCard label="Total Pedidos" value={data?.meta.totalOrders ?? 0} icon={<ShoppingBag className="h-4 w-4" />} isLoading={isLoading} />
        <KpiCard label="Valor Médio" value={avgTicket} format="currency" icon={<Receipt className="h-4 w-4" />} isLoading={isLoading} />
        <KpiCard label="Rating Médio" value={data?.meta.avgRating ?? 0} icon={<Star className="h-4 w-4" />} isLoading={isLoading} />
      </div>

      {/* Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top 10 por Receita" subtitle="Produtos com maior faturação">
          {isLoading ? (
            <div className="h-[400px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <HorizontalBarWidget
              data={data?.topByRevenue || []}
              nameKey="name"
              valueKey="revenue"
              formatValue="currency"
              color={CHART_COLORS.gold}
            />
          )}
        </ChartCard>

        <ChartCard title="Top 10 por Quantidade" subtitle="Produtos mais pedidos">
          {isLoading ? (
            <div className="h-[400px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <HorizontalBarWidget
              data={data?.topByQuantity || []}
              nameKey="name"
              valueKey="quantity"
              color={CHART_COLORS.preparing}
            />
          )}
        </ChartCard>
      </div>

      {/* Category + Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Receita por Categoria" subtitle="Distribuição da faturação">
          {isLoading ? (
            <div className="h-[300px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <DonutChartWidget
              data={categoryDonut}
              centerValue={formatCurrency(data?.meta.totalRevenue ?? 0)}
              centerLabel="total"
            />
          )}
        </ChartCard>

        <ChartCard title="Distribuição de Ratings" subtitle="Avaliações de 1 a 5 estrelas">
          {isLoading ? (
            <div className="h-[300px] bg-gray-50 rounded animate-pulse" />
          ) : (
            <BarChartWidget
              data={ratingsData}
              xKey="rating"
              bars={[{ key: 'count', name: 'Avaliações', color: CHART_COLORS.gold }]}
              xTickFormatter={(r) => `${'★'.repeat(Number(r))}`}
            />
          )}
        </ChartCard>
      </div>

      {/* Revenue by category over time */}
      <ChartCard title="Receita por Categoria ao Longo do Tempo" subtitle="Evolução semanal por categoria">
        {isLoading ? (
          <div className="h-[350px] bg-gray-50 rounded animate-pulse" />
        ) : !data?.revenueByCategoryOverTime.length ? (
          <div className="h-[350px] flex items-center justify-center text-gray-400 text-sm">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data.revenueByCategoryOverTime} margin={CHART_DEFAULTS.margin}>
              <CartesianGrid strokeDasharray={CHART_DEFAULTS.gridStrokeDasharray} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickFormatter={(w: string) => {
                  const d = new Date(w);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickFormatter={(v: number) => formatCurrency(v)}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.tooltip,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
                formatter={((value: number) => [formatCurrency(value), '']) as any}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.categoryNames.map((cat, i) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stackId="1"
                  stroke={CHART_COLORS.palette[i % CHART_COLORS.palette.length]}
                  fill={CHART_COLORS.palette[i % CHART_COLORS.palette.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Scatter: Rating vs Orders */}
      <ChartCard title="Rating vs Quantidade" subtitle="Bolha maior = mais receita. Canto superior direito = produtos estrela">
        {isLoading ? (
          <div className="h-[350px] bg-gray-50 rounded animate-pulse" />
        ) : !data?.ratedVsOrdered.length ? (
          <div className="h-[350px] flex items-center justify-center text-gray-400 text-sm">
            Sem dados de ratings para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ ...CHART_DEFAULTS.margin, bottom: 20 }}>
              <CartesianGrid strokeDasharray={CHART_DEFAULTS.gridStrokeDasharray} stroke={CHART_COLORS.grid} />
              <XAxis
                type="number"
                dataKey="totalOrdered"
                name="Pedidos"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Quantidade Pedida', position: 'bottom', fontSize: 11, fill: CHART_COLORS.axis }}
              />
              <YAxis
                type="number"
                dataKey="avgRating"
                name="Rating"
                domain={[0, 5]}
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Rating Médio', angle: -90, position: 'insideLeft', fontSize: 11, fill: CHART_COLORS.axis }}
              />
              <ZAxis type="number" dataKey="revenue" range={[50, 400]} name="Receita" />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.tooltip,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
                formatter={((value: number, name: string) => {
                  if (name === 'Receita') return [formatCurrency(value), name];
                  return [value, name];
                }) as any}
                labelFormatter={((_: unknown, payload: any) => {
                  if (payload?.[0]?.payload?.name) return payload[0].payload.name;
                  return '';
                }) as any}
              />
              <Scatter
                data={data.ratedVsOrdered}
                fill={CHART_COLORS.gold}
                fillOpacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
