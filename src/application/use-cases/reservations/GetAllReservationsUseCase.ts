/**
 * GetAllReservationsUseCase - Obtém todas as reservas
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { ReservationWithDetails, ReservationFilter } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class GetAllReservationsUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(filter?: ReservationFilter): Promise<Result<ReservationWithDetails[]>> {
    try {
      const reservations = await this.reservationRepository.findAll(filter);
      return Results.success(reservations);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar reservas'
      );
    }
  }
}
