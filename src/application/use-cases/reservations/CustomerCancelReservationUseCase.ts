/**
 * CustomerCancelReservationUseCase - Cancelamento pelo cliente (self-service)
 *
 * Validações adicionais vs admin cancel:
 * - Email deve corresponder ao da reserva
 * - Deadline de 2 horas antes da reserva
 */

import { IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { Reservation } from '@/domain/entities/Reservation';
import { Result, Results } from '../Result';

export interface CustomerCancelInput {
  reservationId: string;
  verifiedEmail: string;
  reason: string;
}

export class CustomerCancelReservationUseCase {
  constructor(private reservationRepository: IReservationRepository) {}

  async execute(input: CustomerCancelInput): Promise<Result<Reservation>> {
    try {
      const existing = await this.reservationRepository.findById(input.reservationId);
      if (!existing) {
        return Results.error('Reserva não encontrada', 'NOT_FOUND');
      }

      if (existing.email.toLowerCase() !== input.verifiedEmail.toLowerCase()) {
        return Results.error('Reserva não pertence a este email', 'FORBIDDEN');
      }

      if (existing.status === 'cancelled') {
        return Results.error('Reserva já está cancelada', 'ALREADY_CANCELLED');
      }

      if (existing.status === 'completed' || existing.status === 'no_show') {
        return Results.error('Não é possível cancelar esta reserva', 'INVALID_STATUS');
      }

      // Enforce 2-hour deadline
      const reservationDateTime = new Date(`${existing.reservationDate}T${existing.reservationTime}`);
      const twoHoursBefore = new Date(reservationDateTime.getTime() - 2 * 60 * 60 * 1000);
      if (new Date() > twoHoursBefore) {
        return Results.error(
          'Cancelamento só é permitido até 2 horas antes da reserva. Por favor contacte o restaurante diretamente.',
          'DEADLINE_PASSED'
        );
      }

      const reservation = await this.reservationRepository.cancel(input.reservationId, input.reason, 'customer', 'site');
      return Results.success(reservation);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao cancelar reserva'
      );
    }
  }
}
