/**
 * IReservationSettingsRepository - Interface para repositório de configurações de reservas
 */

import {
  ReservationSettings,
  UpdateReservationSettingsData,
} from '../entities/ReservationSettings';

export interface IReservationSettingsRepository {
  get(): Promise<ReservationSettings>;
  update(data: UpdateReservationSettingsData, updatedBy: string): Promise<ReservationSettings>;
}
