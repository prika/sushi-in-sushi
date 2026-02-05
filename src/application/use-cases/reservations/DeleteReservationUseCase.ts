/**
 * DeleteReservationUseCase - Remove reserva
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Result, Results } from '../Result';

export class DeleteReservationUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(id: string): Promise<Result<void>> {
    try {
      const existing = await this.reservationRepository.findById(id);
      if (!existing) {
        return Results.error('Reserva não encontrada', 'NOT_FOUND');
      }

      await this.reservationRepository.delete(id);
      return Results.success(undefined);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao remover reserva'
      );
    }
  }
}
