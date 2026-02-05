'use client';

/**
 * useStaffTimeOff - Hook para gestão de ausências de funcionários
 *
 * Extrai a lógica de negócio do StaffCalendar para seguir SOLID
 */

import { useState, useEffect, useCallback } from 'react';
import type { StaffTimeOffWithStaff, StaffTimeOffType, RestaurantClosure } from '@/types/database';

// =============================================
// TYPES
// =============================================

export interface StaffTimeOffFormData {
  staff_id: string;
  start_date: string;
  end_date: string;
  type: StaffTimeOffType;
  reason: string;
}

interface UseStaffTimeOffOptions {
  month: number;
  year: number;
}

interface UseStaffTimeOffReturn {
  timeOffs: StaffTimeOffWithStaff[];
  weeklyClosures: RestaurantClosure[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTimeOff: (data: StaffTimeOffFormData) => Promise<{ success: boolean; error?: string }>;
  deleteTimeOff: (id: number) => Promise<{ success: boolean; error?: string }>;
  getTimeOffsForDay: (day: number) => StaffTimeOffWithStaff[];
  isWeeklyClosureDay: (day: number) => boolean;
  getWeeklyClosureInfo: (day: number) => RestaurantClosure | undefined;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isDateInRange(date: Date, startDate: string, endDate: string): boolean {
  const d = formatDate(date);
  return d >= startDate && d <= endDate;
}

// =============================================
// HOOK
// =============================================

export function useStaffTimeOff(options: UseStaffTimeOffOptions): UseStaffTimeOffReturn {
  const { month, year } = options;

  const [timeOffs, setTimeOffs] = useState<StaffTimeOffWithStaff[]>([]);
  const [weeklyClosures, setWeeklyClosures] = useState<RestaurantClosure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch time off entries and weekly closures
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [timeOffResponse, closuresResponse] = await Promise.all([
        fetch(`/api/staff-time-off?month=${month + 1}&year=${year}`),
        fetch('/api/closures'),
      ]);

      if (!timeOffResponse.ok) {
        throw new Error('Erro ao carregar ausências');
      }

      const timeOffData = await timeOffResponse.json();
      setTimeOffs(timeOffData);

      if (closuresResponse.ok) {
        const closuresData = await closuresResponse.json();
        // Filter to only get recurring weekly closures
        setWeeklyClosures(closuresData.filter((c: RestaurantClosure) => c.is_recurring));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create new time off
  const createTimeOff = useCallback(
    async (data: StaffTimeOffFormData): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/staff-time-off', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const responseData = await response.json();
          return { success: false, error: responseData.error || 'Erro ao criar ausência' };
        }

        await fetchData();
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        return { success: false, error: message };
      }
    },
    [fetchData]
  );

  // Delete time off
  const deleteTimeOff = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/staff-time-off/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          return { success: false, error: 'Erro ao remover ausência' };
        }

        await fetchData();
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        return { success: false, error: message };
      }
    },
    [fetchData]
  );

  // Get time offs for a specific day
  const getTimeOffsForDay = useCallback(
    (day: number): StaffTimeOffWithStaff[] => {
      const date = new Date(year, month, day);
      return timeOffs.filter((to) => isDateInRange(date, to.start_date, to.end_date));
    },
    [timeOffs, year, month]
  );

  // Check if a day is a weekly closure day
  const isWeeklyClosureDay = useCallback(
    (day: number): boolean => {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      return weeklyClosures.some((c) => c.recurring_day_of_week === dayOfWeek);
    },
    [weeklyClosures, year, month]
  );

  // Get weekly closure info for a day
  const getWeeklyClosureInfo = useCallback(
    (day: number): RestaurantClosure | undefined => {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      return weeklyClosures.find((c) => c.recurring_day_of_week === dayOfWeek);
    },
    [weeklyClosures, year, month]
  );

  return {
    timeOffs,
    weeklyClosures,
    isLoading,
    error,
    refresh: fetchData,
    createTimeOff,
    deleteTimeOff,
    getTimeOffsForDay,
    isWeeklyClosureDay,
    getWeeklyClosureInfo,
  };
}
