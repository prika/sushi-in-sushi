'use client';

/**
 * useReservation - Hook para gestão de reservas
 *
 * Extrai a lógica de negócio do ReservationForm para seguir SOLID
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Location, ReservationOccasion } from '@/types/database';

// =============================================
// CONSTANTS
// =============================================

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

// =============================================
// TYPES
// =============================================

export interface ReservationFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  location: Location;
  is_rodizio: boolean;
  special_requests: string;
  occasion: ReservationOccasion | '';
  marketing_consent: boolean;
}

interface UseReservationOptions {
  date: string;
  location: Location;
}

interface UseReservationReturn {
  closureWarning: string | null;
  isCheckingClosure: boolean;
  availableTimeSlots: string[];
  createReservation: (data: ReservationFormData) => Promise<{ success: boolean; error?: string }>;
}

// =============================================
// HOOK
// =============================================

export function useReservation(options: UseReservationOptions): UseReservationReturn {
  const { date, location } = options;

  const [closureWarning, setClosureWarning] = useState<string | null>(null);
  const [isCheckingClosure, setIsCheckingClosure] = useState(false);

  // Check if restaurant is closed on selected date
  useEffect(() => {
    const checkClosure = async () => {
      if (!date || !location) {
        setClosureWarning(null);
        return;
      }

      setIsCheckingClosure(true);
      try {
        const response = await fetch(
          `/api/closures/check?date=${date}&location=${location}`
        );
        const data = await response.json();

        if (data.isClosed) {
          setClosureWarning(data.reason || 'O restaurante está fechado nesta data');
        } else {
          setClosureWarning(null);
        }
      } catch (err) {
        console.error('Error checking closure:', err);
        setClosureWarning(null);
      } finally {
        setIsCheckingClosure(false);
      }
    };

    checkClosure();
  }, [date, location]);

  // Filter time slots based on current time (for same-day reservations)
  const availableTimeSlots = useMemo(() => {
    if (!date) return TIME_SLOTS;

    const today = new Date().toISOString().split('T')[0];
    if (date !== today) return TIME_SLOTS;

    const now = new Date();
    const bufferMinutes = 30;

    return TIME_SLOTS.filter((slot) => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      const bufferTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
      return slotTime > bufferTime;
    });
  }, [date]);

  // Create reservation
  const createReservation = useCallback(
    async (data: ReservationFormData): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            occasion: data.occasion || null,
          }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          return { success: false, error: responseData.error || 'Erro ao criar reserva' };
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        return { success: false, error: message };
      }
    },
    []
  );

  return {
    closureWarning,
    isCheckingClosure,
    availableTimeSlots,
    createReservation,
  };
}

// Export constants for use in components
export { TIME_SLOTS };
