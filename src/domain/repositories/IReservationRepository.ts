/**
 * IReservationRepository - Interface para repositório de reservas
 */

import {
  Reservation,
  ReservationWithDetails,
  CreateReservationData,
  UpdateReservationData,
  ReservationFilter,
} from '../entities/Reservation';

export interface IReservationRepository {
  findAll(filter?: ReservationFilter): Promise<ReservationWithDetails[]>;
  findById(id: string): Promise<Reservation | null>;
  findByDate(date: string, location?: string): Promise<ReservationWithDetails[]>;
  create(data: CreateReservationData): Promise<Reservation>;
  update(id: string, data: UpdateReservationData): Promise<Reservation>;
  delete(id: string): Promise<void>;
  confirm(id: string, confirmedBy: string): Promise<Reservation>;
  cancel(id: string, reason?: string, cancelledBy?: 'admin' | 'customer', cancellationSource?: 'site' | 'phone'): Promise<Reservation>;
  markAsSeated(id: string, sessionId: string): Promise<Reservation>;
  markAsNoShow(id: string): Promise<Reservation>;
  markAsCompleted(id: string): Promise<Reservation>;
  findUpcomingByEmail(email: string): Promise<Reservation[]>;
}
