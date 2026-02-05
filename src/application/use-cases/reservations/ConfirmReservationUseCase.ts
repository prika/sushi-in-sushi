/**
 * ConfirmReservationUseCase - Confirma reserva
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class ConfirmReservationUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string, confirmedBy: string): Promise<Result<Reservation>> {
    try {
      const existing = await this.reservationRepository.findById(id);
      if (!existing) {
        return Results.error('Reserva não encontrada', 'NOT_FOUND');
      }

      if (existing.status !== 'pending') {
        return Results.error('Apenas reservas pendentes podem ser confirmadas', 'INVALID_STATUS');
      }

      const reservation = await this.reservationRepository.confirm(id, confirmedBy);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao confirmar reserva'
      );
    }
  }
}
