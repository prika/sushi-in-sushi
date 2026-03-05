'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from './chartTheme';

interface KpiCardProps {
  label: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'number' | 'percent';
  icon?: ReactNode;
  trendReversed?: boolean; // true for metrics where lower is better (e.g., delivery time)
  isLoading?: boolean;
}

function formatValue(value: number, format: 'currency' | 'number' | 'percent'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
}

function getTrend(current: number, previous: number, reversed: boolean) {
  if (previous === 0) return { pct: 0, direction: 'neutral' as const };
  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : ('neutral' as const);
  const isPositive = reversed ? direction === 'down' : direction === 'up';
  return { pct: Math.abs(pct), direction, isPositive };
}

export function KpiCard({
  label,
  value,
  previousValue,
  format = 'number',
  icon,
  trendReversed = false,
  isLoading = false,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-8 w-28 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const trend =
    previousValue !== undefined ? getTrend(value, previousValue, trendReversed) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{formatValue(value, format)}</div>
      {trend && trend.direction !== 'neutral' && (
        <div
          className={`flex items-center gap-1 mt-1 text-xs font-medium ${
            trend.isPositive ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {trend.direction === 'up' ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{trend.pct.toFixed(1)}%</span>
          <span className="text-gray-400 font-normal">vs período anterior</span>
        </div>
      )}
      {trend && trend.direction === 'neutral' && (
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <Minus className="h-3 w-3" />
          <span>Sem alteração</span>
        </div>
      )}
    </div>
  );
}
