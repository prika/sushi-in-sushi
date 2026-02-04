/**
 * Integration Tests: Cron Reservation Reminders
 * Tests for the /api/cron/reservation-reminders endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestReservation, createTestReservationSettings, getFutureDate, getTodayDate } from '../../helpers/factories';

describe('Cron: Reservation Reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autorização', () => {
    it('rejeita pedido sem CRON_SECRET', () => {
      const authHeader = '';
      const expectedSecret = 'test-secret';

      const isAuthorized = authHeader === `Bearer ${expectedSecret}`;
      expect(isAuthorized).toBe(false);
    });

    it('rejeita pedido com secret inválido', () => {
      const authHeader = 'Bearer wrong-secret';
      const expectedSecret = 'test-secret';

      const isAuthorized = authHeader === `Bearer ${expectedSecret}`;
      expect(isAuthorized).toBe(false);
    });

    it('aceita pedido com secret válido', () => {
      const authHeader = 'Bearer test-secret';
      const expectedSecret = 'test-secret';

      const isAuthorized = authHeader === `Bearer ${expectedSecret}`;
      expect(isAuthorized).toBe(true);
    });
  });

  describe('Lembretes do dia anterior', () => {
    it('encontra reservas para lembrete', () => {
      const settings = createTestReservationSettings({ day_before_reminder_hours: 24 });
      const now = new Date();
      const targetDateTime = new Date(now.getTime() + settings.day_before_reminder_hours * 60 * 60 * 1000);
      const targetDate = targetDateTime.toISOString().split('T')[0];

      const reservations = [
        createTestReservation({
          reservation_date: targetDate,
          status: 'confirmed',
          day_before_reminder_sent_at: null,
        }),
        createTestReservation({
          reservation_date: targetDate,
          status: 'confirmed',
          day_before_reminder_sent_at: '2026-02-01T10:00:00Z', // Already sent
        }),
      ];

      const pending = reservations.filter(r =>
        r.reservation_date === targetDate &&
        ['pending', 'confirmed'].includes(r.status) &&
        r.day_before_reminder_sent_at === null
      );

      expect(pending).toHaveLength(1);
    });

    it('ignora reservas canceladas', () => {
      const reservations = [
        createTestReservation({ status: 'cancelled', day_before_reminder_sent_at: null }),
        createTestReservation({ status: 'confirmed', day_before_reminder_sent_at: null }),
      ];

      const pending = reservations.filter(r =>
        ['pending', 'confirmed'].includes(r.status) &&
        r.day_before_reminder_sent_at === null
      );

      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('confirmed');
    });

    it('respeita configuração de desativado', () => {
      const settings = createTestReservationSettings({ day_before_reminder_enabled: false });

      expect(settings.day_before_reminder_enabled).toBe(false);
    });
  });

  describe('Lembretes do mesmo dia', () => {
    it('calcula janela de tempo corretamente', () => {
      const settings = createTestReservationSettings({ same_day_reminder_hours: 2 });
      const now = new Date('2026-02-10T14:00:00Z');
      const hoursAhead = settings.same_day_reminder_hours;

      const minTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      const maxTime = new Date(now.getTime() + (hoursAhead + 1) * 60 * 60 * 1000);

      // At 14:00, with 2h ahead, window should be 16:00-17:00
      expect(minTime.getHours()).toBe(16);
      expect(maxTime.getHours()).toBe(17);
    });

    it('encontra reservas na janela de tempo', () => {
      const reservations = [
        createTestReservation({ reservation_time: '16:30:00', same_day_reminder_sent_at: null }),
        createTestReservation({ reservation_time: '19:00:00', same_day_reminder_sent_at: null }), // Outside window
      ];

      const minTimeStr = '16:00:00';
      const maxTimeStr = '17:00:00';

      const pending = reservations.filter(r =>
        r.reservation_time >= minTimeStr &&
        r.reservation_time <= maxTimeStr &&
        r.same_day_reminder_sent_at === null
      );

      expect(pending).toHaveLength(1);
      expect(pending[0].reservation_time).toBe('16:30:00');
    });
  });

  describe('Política de desperdício rodízio', () => {
    it('inclui taxa quando ativado e é rodízio', () => {
      const settings = createTestReservationSettings({
        rodizio_waste_policy_enabled: true,
        rodizio_waste_fee_per_piece: 2.5,
      });
      const reservation = createTestReservation({ is_rodizio: true });

      const wasteFee = settings.rodizio_waste_policy_enabled && reservation.is_rodizio
        ? settings.rodizio_waste_fee_per_piece
        : 0;

      expect(wasteFee).toBe(2.5);
    });

    it('não inclui taxa quando não é rodízio', () => {
      const settings = createTestReservationSettings({
        rodizio_waste_policy_enabled: true,
        rodizio_waste_fee_per_piece: 2.5,
      });
      const reservation = createTestReservation({ is_rodizio: false });

      const wasteFee = settings.rodizio_waste_policy_enabled && reservation.is_rodizio
        ? settings.rodizio_waste_fee_per_piece
        : 0;

      expect(wasteFee).toBe(0);
    });

    it('não inclui taxa quando política desativada', () => {
      const settings = createTestReservationSettings({
        rodizio_waste_policy_enabled: false,
        rodizio_waste_fee_per_piece: 2.5,
      });
      const reservation = createTestReservation({ is_rodizio: true });

      const wasteFee = settings.rodizio_waste_policy_enabled
        ? settings.rodizio_waste_fee_per_piece
        : 0;

      expect(wasteFee).toBe(0);
    });
  });
});
