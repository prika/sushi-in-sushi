/**
 * GetUpcomingReservationsByEmailUseCase - Busca reservas futuras por email
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class GetUpcomingReservationsByEmailUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(email: string): Promise<Result<Reservation[]>> {
    try {
      const reservations = await this.reservationRepository.findUpcomingByEmail(email);
      return Results.success(reservations);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter reservas'
      );
    }
  }
}
