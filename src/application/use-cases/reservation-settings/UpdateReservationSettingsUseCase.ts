/**
 * UpdateReservationSettingsUseCase - Atualiza configurações de reservas
 */

import { IReservationSettingsRepository } from '@/domain/repositories/IReservationSettingsRepository';
import { ReservationSettings, UpdateReservationSettingsData } from '@/domain/entities/ReservationSettings';
import { Result, Results } from '../Result';

interface UpdateReservationSettingsInput {
  data: UpdateReservationSettingsData;
  updatedBy: string;
}

export class UpdateReservationSettingsUseCase {
  constructor(private reservationSettingsRepository: IReservationSettingsRepository) {}

  async execute(input: UpdateReservationSettingsInput): Promise<Result<ReservationSettings>> {
    try {
      // Validar horas (1-168 horas = 1 semana)
      if (input.data.dayBeforeReminderHours !== undefined) {
        if (input.data.dayBeforeReminderHours < 1 || input.data.dayBeforeReminderHours > 168) {
          return Results.error(
            'Horas de lembrete do dia anterior devem estar entre 1 e 168',
            'INVALID_HOURS'
          );
        }
      }

      if (input.data.sameDayReminderHours !== undefined) {
        if (input.data.sameDayReminderHours < 1 || input.data.sameDayReminderHours > 168) {
          return Results.error(
            'Horas de lembrete do mesmo dia devem estar entre 1 e 168',
            'INVALID_HOURS'
          );
        }
      }

      // Validar taxa de desperdício
      if (input.data.rodizioWasteFeePerPiece !== undefined) {
        if (input.data.rodizioWasteFeePerPiece < 0) {
          return Results.error('Taxa de desperdício não pode ser negativa', 'INVALID_FEE');
        }
      }

      const settings = await this.reservationSettingsRepository.update(
        input.data,
        input.updatedBy
      );

      return Results.success(settings);
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao atualizar configurações'
      );
    }
  }
}
