'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardAnalytics } from '@/domain/entities/DashboardAnalytics';
import { DateRange } from '@/presentation/components/charts/DateRangePicker';

async function fetchDashboardAnalytics(
  dateRange: DateRange,
  location?: string
): Promise<DashboardAnalytics> {
  const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
  if (location) params.set('location', location);

  const res = await fetch(`/api/admin/dashboard-analytics?${params}`);
  if (!res.ok) {
    throw new Error('Erro ao carregar analytics');
  }
  return res.json();
}

export function useDashboardAnalytics(dateRange: DateRange, location?: string) {
  return useQuery<DashboardAnalytics>({
    queryKey: ['dashboard-analytics', dateRange.from, dateRange.to, location],
    queryFn: () => fetchDashboardAnalytics(dateRange, location),
    staleTime: 60_000,
    refetchInterval: dateRange.preset === 'today' ? 30_000 : false,
  });
}
