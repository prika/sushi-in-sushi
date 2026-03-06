'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DateRange,
  DatePreset,
  getDateRangeFromPreset,
  getPreviousPeriod,
} from '@/presentation/components/charts/DateRangePicker';

export function useDateRange(initialPreset: DatePreset = '30d') {
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getDateRangeFromPreset(initialPreset)
  );

  const previousPeriod = useMemo(() => getPreviousPeriod(dateRange), [dateRange]);

  const setPreset = useCallback((preset: DatePreset) => {
    setDateRange(getDateRangeFromPreset(preset));
  }, []);

  return {
    dateRange,
    setDateRange,
    previousPeriod,
    setPreset,
  };
}
