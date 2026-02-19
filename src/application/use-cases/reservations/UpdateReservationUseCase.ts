/**
 * UpdateReservationUseCase - Atualiza reserva
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation, UpdateReservationData } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export class UpdateReservationUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string, data: UpdateReservationData): Promise<Result<Reservation>> {
    try {
      const existing = await this.reservationRepository.findById(id);
      if (!existing) {
        return Results.error('Reserva não encontrada', 'NOT_FOUND');
      }

      const reservation = await this.reservationRepository.update(id, data);
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar reserva'
      );
    }
  }
}
