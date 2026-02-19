/**
 * MarkReservationSeatedUseCase - Marca reserva como sentada (check-in)
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class MarkReservationSeatedUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string, sessionId: string): Promise<Result<Reservation>> {
    try {
      const existing = await this.reservationRepository.findById(id);
      if (!existing) {
        return Results.error('Reserva não encontrada', 'NOT_FOUND');
      }

      if (existing.status === 'cancelled') {
        return Results.error('Reserva está cancelada', 'INVALID_STATUS');
      }

      if (existing.status === 'completed') {
        return Results.error('Reserva já foi concluída', 'ALREADY_COMPLETED');
      }

      const reservation = await this.reservationRepository.markAsSeated(id, sessionId);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao fazer check-in da reserva'
      );
    }
  }
}
