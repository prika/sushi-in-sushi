'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_COLORS, CHART_DEFAULTS, formatCurrency } from './chartTheme';

interface BarSeries {
  key: string;
  name: string;
  color?: string;
  stackId?: string;
}

interface BarChartWidgetProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  formatY?: 'currency' | 'number';
  showLegend?: boolean;
  xTickFormatter?: (_value: string) => string;
}

export function BarChartWidget({
  data,
  xKey,
  bars,
  height = CHART_DEFAULTS.height,
  formatY = 'number',
  showLegend = false,
  xTickFormatter,
}: BarChartWidgetProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={CHART_DEFAULTS.margin}>
        <CartesianGrid
          strokeDasharray={CHART_DEFAULTS.gridStrokeDasharray}
          stroke={CHART_COLORS.grid}
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: CHART_DEFAULTS.fontSize, fill: CHART_COLORS.axis }}
          tickFormatter={xTickFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: CHART_DEFAULTS.fontSize, fill: CHART_COLORS.axis }}
          tickFormatter={formatY === 'currency' ? (v: number) => formatCurrency(v) : undefined}
          axisLine={false}
          tickLine={false}
          width={formatY === 'currency' ? 70 : 40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: CHART_COLORS.tooltip,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: 13,
          }}
          formatter={((value: number) =>
            formatY === 'currency' ? [formatCurrency(value), ''] : [value, '']
          ) as any}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color || CHART_COLORS.palette[i % CHART_COLORS.palette.length]}
            stackId={bar.stackId}
            radius={bar.stackId ? undefined : [4, 4, 0, 0]}
            animationDuration={CHART_DEFAULTS.animationDuration}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
