/**
 * ReservationSettings Entity - Configurações do sistema de reservas
 */

export interface ReservationSettings {
  id: number;
  dayBeforeReminderEnabled: boolean;
  dayBeforeReminderHours: number;
  sameDayReminderEnabled: boolean;
  sameDayReminderHours: number;
  rodizioWastePolicyEnabled: boolean;
  rodizioWasteFeePerPiece: number;
  waiterAlertMinutes: number;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface UpdateReservationSettingsData {
  dayBeforeReminderEnabled?: boolean;
  dayBeforeReminderHours?: number;
  sameDayReminderEnabled?: boolean;
  sameDayReminderHours?: number;
  rodizioWastePolicyEnabled?: boolean;
  rodizioWasteFeePerPiece?: number;
  waiterAlertMinutes?: number;
}
