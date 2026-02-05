/**
 * Reservation Entity - Representa uma reserva
 */

import { Location } from '../value-objects/Location';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type ReservationOccasion = 'birthday' | 'anniversary' | 'business' | 'other';

export interface Reservation {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  location: Location;
  tableId: number | null;
  isRodizio: boolean;
  specialRequests: string | null;
  occasion: ReservationOccasion | null;
  status: ReservationStatus;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  sessionId: string | null;
  seatedAt: Date | null;
  marketingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReservationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  location: Location;
  isRodizio?: boolean;
  specialRequests?: string | null;
  occasion?: ReservationOccasion | null;
  marketingConsent?: boolean;
}

export interface UpdateReservationData {
  status?: ReservationStatus;
  tableId?: number | null;
  confirmedBy?: string;
  cancellationReason?: string;
  sessionId?: string;
}

export interface ReservationFilter {
  location?: Location;
  status?: ReservationStatus;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReservationWithDetails extends Reservation {
  tableNumber: number | null;
  tableName: string | null;
  confirmedByName: string | null;
  customerName: string;
  statusLabel: string;
}
