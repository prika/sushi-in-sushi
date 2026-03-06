'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { CHART_COLORS, CHART_DEFAULTS, formatCurrency } from './chartTheme';

interface HorizontalBarWidgetProps {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  height?: number;
  color?: string;
  formatValue?: 'currency' | 'number';
}

export function HorizontalBarWidget({
  data,
  nameKey,
  valueKey,
  height,
  color = CHART_COLORS.gold,
  formatValue = 'number',
}: HorizontalBarWidgetProps) {
  const computedHeight = height || Math.max(200, data.length * 40);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height: 200 }}
      >
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart data={data} layout="vertical" margin={{ ...CHART_DEFAULTS.margin, left: 10 }}>
        <CartesianGrid
          strokeDasharray={CHART_DEFAULTS.gridStrokeDasharray}
          stroke={CHART_COLORS.grid}
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: CHART_DEFAULTS.fontSize, fill: CHART_COLORS.axis }}
          tickFormatter={
            formatValue === 'currency' ? (v: number) => formatCurrency(v) : undefined
          }
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
          width={130}
          axisLine={false}
          tickLine={false}
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
            formatValue === 'currency' ? [formatCurrency(value), ''] : [value, '']
          ) as any}
        />
        <Bar
          dataKey={valueKey}
          fill={color}
          radius={[0, 4, 4, 0]}
          animationDuration={CHART_DEFAULTS.animationDuration}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
