'use client';

/**
 * useReservations - Hook para gestão de reservas
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseReservationRepository } from '@/infrastructure/repositories/SupabaseReservationRepository';
import { SupabaseRestaurantClosureRepository } from '@/infrastructure/repositories/SupabaseRestaurantClosureRepository';
import {
  Reservation,
  ReservationWithDetails,
  CreateReservationData,
  UpdateReservationData,
  ReservationFilter,
} from '@/domain/entities/Reservation';
import {
  GetAllReservationsUseCase,
  GetReservationByIdUseCase,
  CreateReservationUseCase,
  UpdateReservationUseCase,
  ConfirmReservationUseCase,
  CancelReservationUseCase,
  MarkReservationSeatedUseCase,
  MarkReservationNoShowUseCase,
  DeleteReservationUseCase,
} from '@/application/use-cases/reservations';

export interface UseReservationsOptions {
  filter?: ReservationFilter;
  autoLoad?: boolean;
}

export interface UseReservationsResult {
  reservations: ReservationWithDetails[];
  isLoading: boolean;
  error: string | null;
  getById: (id: string) => Promise<Reservation | null>;
  create: (data: CreateReservationData) => Promise<Reservation | null>;
  update: (id: string, data: UpdateReservationData) => Promise<Reservation | null>;
  confirm: (id: string, confirmedBy: string) => Promise<Reservation | null>;
  cancel: (id: string, reason?: string) => Promise<Reservation | null>;
  markSeated: (id: string, sessionId: string) => Promise<Reservation | null>;
  markNoShow: (id: string) => Promise<Reservation | null>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useReservations(options: UseReservationsOptions = {}): UseReservationsResult {
  const { filter, autoLoad = true } = options;

  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Create repositories and use-cases
  const reservationRepository = new SupabaseReservationRepository();
  const closureRepository = new SupabaseRestaurantClosureRepository();

  const getAllReservations = new GetAllReservationsUseCase(reservationRepository);
  const getReservationById = new GetReservationByIdUseCase(reservationRepository);
  const createReservation = new CreateReservationUseCase(reservationRepository, closureRepository);
  const updateReservation = new UpdateReservationUseCase(reservationRepository);
  const confirmReservation = new ConfirmReservationUseCase(reservationRepository);
  const cancelReservation = new CancelReservationUseCase(reservationRepository);
  const markSeatedUseCase = new MarkReservationSeatedUseCase(reservationRepository);
  const markNoShowUseCase = new MarkReservationNoShowUseCase(reservationRepository);
  const deleteReservation = new DeleteReservationUseCase(reservationRepository);

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllReservations.execute(filter);
      if (result.success) {
        setReservations(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar reservas');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const getById = useCallback(async (id: string): Promise<Reservation | null> => {
    const result = await getReservationById.execute(id);
    if (result.success) {
      return result.data;
    }
    setError(result.error);
    return null;
  }, []);

  const create = useCallback(async (data: CreateReservationData): Promise<Reservation | null> => {
    setError(null);
    const result = await createReservation.execute(data);
    if (result.success) {
      await fetchReservations();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchReservations]);

  const update = useCallback(async (id: string, data: UpdateReservationData): Promise<Reservation | null> => {
    setError(null);
    const result = await updateReservation.execute(id, data);
    if (result.success) {
      await fetchReservations();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchReservations]);

  const confirm = useCallback(async (id: string, confirmedBy: string): Promise<Reservation | null> => {
    setError(null);
    const result = await confirmReservation.execute(id, confirmedBy);
    if (result.success) {
      await fetchReservations();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchReservations]);

  const cancel = useCallback(async (id: string, reason?: string): Promise<Reservation | null> => {
    setError(null);
    const result = await cancelReservation.execute(id, reason);
    if (result.success) {
      await fetchReservations();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchReservations]);

  const markSeated = useCallback(async (id: string, sessionId: string): Promise<Reservation | null> => {
    setError(null);
    const result = await markSeatedUseCase.execute(id, sessionId);
    if (result.success) {
      await fetchReservations();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchReservations]);

  const markNoShow = useCallback(async (id: string): Promise<Reservation | null> => {
    setError(null);
    const result = await markNoShowUseCase.execute(id);
    if (result.success) {
      await fetchReservations();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchReservations]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    const result = await deleteReservation.execute(id);
    if (result.success) {
      await fetchReservations();
      return true;
    }
    setError(result.error);
    return false;
  }, [fetchReservations]);

  useEffect(() => {
    if (autoLoad) {
      fetchReservations();
    }
  }, [autoLoad, fetchReservations]);

  return {
    reservations,
    isLoading,
    error,
    getById,
    create,
    update,
    confirm,
    cancel,
    markSeated,
    markNoShow,
    remove,
    refresh: fetchReservations,
  };
}
