/**
 * CancelReservationUseCase - Cancela reserva
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class CancelReservationUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string, reason?: string): Promise<Result<Reservation>> {
    try {
      const existing = await this.reservationRepository.findById(id);
      if (!existing) {
        return Results.error('Reserva não encontrada', 'NOT_FOUND');
      }

      if (existing.status === 'cancelled') {
        return Results.error('Reserva já está cancelada', 'ALREADY_CANCELLED');
      }

      if (existing.status === 'completed') {
        return Results.error('Não é possível cancelar reserva concluída', 'INVALID_STATUS');
      }

      const reservation = await this.reservationRepository.cancel(id, reason);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao cancelar reserva'
      );
    }
  }
}
