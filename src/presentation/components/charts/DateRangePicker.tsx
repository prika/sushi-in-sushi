'use client';

import { useCallback, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { getDateRangeFromPreset, getPreviousPeriod, type DatePreset, type DateRange } from '@/lib/date-range';

// Re-export for backwards compatibility
export { getDateRangeFromPreset, getPreviousPeriod };
export type { DatePreset, DateRange };

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
