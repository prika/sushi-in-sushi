/**
 * GetReservationByIdUseCase - Obtém reserva por ID
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class GetReservationByIdUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string): Promise<Result<Reservation | null>> {
    try {
      const reservation = await this.reservationRepository.findById(id);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao carregar reserva'
      );
    }
  }
}
