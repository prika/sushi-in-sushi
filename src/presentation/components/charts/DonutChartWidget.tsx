'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { CHART_COLORS, CHART_DEFAULTS } from './chartTheme';

interface DonutChartWidgetProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

export function DonutChartWidget({
  data,
  height = CHART_DEFAULTS.height,
  centerLabel,
  centerValue,
  showLegend = true,
}: DonutChartWidgetProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        Sem dados para o período selecionado
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
            animationDuration={CHART_DEFAULTS.animationDuration}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.tooltip,
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 13,
            }}
          />
          {showLegend && (
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && (
            <span className="text-xl font-bold text-gray-900">{centerValue}</span>
          )}
          {centerLabel && <span className="text-xs text-gray-500">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
