/**
 * GetReservationSettingsUseCase - Obtém configurações de reservas
 */

import { IReservationSettingsRepository } from '@/domain/repositories/IReservationSettingsRepository';
import { ReservationSettings } from '@/domain/entities/ReservationSettings';
import { Result, Results } from '../Result';

export class GetReservationSettingsUseCase {
  constructor(private reservationSettingsRepository: IReservationSettingsRepository) {}

  async execute(): Promise<Result<ReservationSettings>> {
    try {
      const settings = await this.reservationSettingsRepository.get();
      return Results.success(settings);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao obter configurações'
      );
    }
  }
}
