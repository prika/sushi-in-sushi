'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { CHART_COLORS, CHART_DEFAULTS, formatCurrency } from './chartTheme';

interface AreaChartWidgetProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  formatY?: 'currency' | 'number';
  xTickFormatter?: (_value: string) => string;
}

export function AreaChartWidget({
  data,
  xKey,
  yKey,
  height = CHART_DEFAULTS.height,
  color = CHART_COLORS.gold,
  formatY = 'number',
  xTickFormatter,
}: AreaChartWidgetProps) {
  const gradientId = `gradient-${yKey}`;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={CHART_DEFAULTS.margin}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray={CHART_DEFAULTS.gridStrokeDasharray}
          stroke={CHART_COLORS.grid}
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
          labelFormatter={(xTickFormatter || ((l: string) => l)) as any}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          animationDuration={CHART_DEFAULTS.animationDuration}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
