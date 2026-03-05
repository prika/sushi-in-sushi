'use client';

import { useCallback, useMemo } from 'react';
import { Calendar } from 'lucide-react';

export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
  preset: DatePreset;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (_range: DateRange) => void;
  className?: string;
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'custom', label: 'Personalizado' },
];

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const today = new Date();
  const to = toISODate(today);

  switch (preset) {
    case 'today':
      return { from: to, to, preset };
    case '7d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toISODate(from), to, preset };
    }
    case '30d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: toISODate(from), to, preset };
    }
    case '90d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 89);
      return { from: toISODate(from), to, preset };
    }
    default:
      return { from: to, to, preset: 'custom' };
  }
}

export function getPreviousPeriod(range: DateRange): { from: string; to: string } {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);

  return { from: toISODate(prevFrom), to: toISODate(prevTo) };
}

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const handlePreset = useCallback(
    (preset: DatePreset) => {
      if (preset === 'custom') {
        onChange({ ...value, preset: 'custom' });
      } else {
        onChange(getDateRangeFromPreset(preset));
      }
    },
    [onChange, value]
  );

  const periodLabel = useMemo(() => {
    const from = new Date(value.from);
    const to = new Date(value.to);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days === 1) return '1 dia';
    return `${days} dias`;
  }, [value.from, value.to]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-gray-400" />
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              value.preset === key
                ? 'bg-[#D4AF37] text-black'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.from}
            max={value.to}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={value.to}
            min={value.from}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>
      )}
      <span className="text-xs text-gray-400">{periodLabel}</span>
    </div>
  );
}
