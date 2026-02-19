/**
 * MarkReservationNoShowUseCase - Marca reserva como no-show
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class MarkReservationNoShowUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string): Promise<Result<Reservation>> {
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

      const reservation = await this.reservationRepository.markAsNoShow(id);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao marcar no-show'
      );
    }
  }
}
