import { describe, it, expect, vi } from 'vitest';

// Set env before import so LOGO_URL is populated
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sushinsushi.pt');

import type { Reservation } from '@/types/database';
import {
  getCustomerConfirmationEmail,
  getRestaurantNotificationEmail,
  getReservationConfirmedEmail,
  getFarewellEmail,
  getDayBeforeReminderEmail,
  getSameDayReminderEmail,
  getCancellationEmail,
} from '@/lib/email/templates';

const mockReservation: Reservation = {
  id: 'res-1',
  first_name: 'Joao',
  last_name: 'Silva',
  email: 'joao@test.com',
  phone: '+351912345678',
  reservation_date: '2026-03-01',
  reservation_time: '19:30',
  party_size: 4,
  location: 'circunvalacao',
  status: 'pending',
  is_rodizio: false,
  special_requests: null,
  occasion: null,
  marketing_consent: false,
  table_id: null,
  confirmed_by: null,
  confirmed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  session_id: null,
  seated_at: null,
  customer_email_id: null,
  customer_email_sent_at: null,
  customer_email_delivered_at: null,
  customer_email_opened_at: null,
  customer_email_status: null,
  confirmation_email_id: null,
  confirmation_email_sent_at: null,
  confirmation_email_delivered_at: null,
  confirmation_email_opened_at: null,
  confirmation_email_status: null,
  day_before_reminder_id: null,
  day_before_reminder_sent_at: null,
  day_before_reminder_delivered_at: null,
  day_before_reminder_opened_at: null,
  day_before_reminder_status: null,
  same_day_reminder_id: null,
  same_day_reminder_sent_at: null,
  same_day_reminder_delivered_at: null,
  same_day_reminder_opened_at: null,
  same_day_reminder_status: null,
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-20T10:00:00Z',
};

const boavistaReservation: Reservation = {
  ...mockReservation,
  id: 'res-2',
  location: 'boavista',
};

const rodizioReservation: Reservation = {
  ...mockReservation,
  id: 'res-3',
  is_rodizio: true,
};

const reservationWithOccasion: Reservation = {
  ...mockReservation,
  id: 'res-4',
  occasion: 'birthday',
};

describe('Email Templates', () => {
  // =========================================================================
  // getCustomerConfirmationEmail
  // =========================================================================
  describe('getCustomerConfirmationEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getCustomerConfirmationEmail(mockReservation);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
    });

    it('should include the date in the subject', () => {
      const result = getCustomerConfirmationEmail(mockReservation);

      // The subject uses formatDate which produces a Portuguese locale date
      expect(result.subject).toContain('Reserva Recebida');
      expect(result.subject).toContain('2026');
    });

    it('should include the customer first_name in html', () => {
      const result = getCustomerConfirmationEmail(mockReservation);

      expect(result.html).toContain('Joao');
    });

    it('should include the location name in html', () => {
      const result = getCustomerConfirmationEmail(mockReservation);

      expect(result.html).toContain('Circunvala');
    });

    it('should include party_size in html', () => {
      const result = getCustomerConfirmationEmail(mockReservation);

      expect(result.html).toContain('4 pessoas');
    });
  });

  // =========================================================================
  // getRestaurantNotificationEmail
  // =========================================================================
  describe('getRestaurantNotificationEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getRestaurantNotificationEmail(mockReservation);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should include customer name and time in subject', () => {
      const result = getRestaurantNotificationEmail(mockReservation);

      expect(result.subject).toContain('Joao');
      expect(result.subject).toContain('Silva');
      expect(result.subject).toContain('19:30');
    });

    it('should include customer email and phone in html', () => {
      const result = getRestaurantNotificationEmail(mockReservation);

      expect(result.html).toContain('joao@test.com');
      expect(result.html).toContain('+351912345678');
    });

    it('should include party_size in html', () => {
      const result = getRestaurantNotificationEmail(mockReservation);

      expect(result.html).toContain('4');
    });

    it('should include occasion label when occasion is set', () => {
      const result = getRestaurantNotificationEmail(reservationWithOccasion);

      expect(result.html).toContain('Anivers');
    });
  });

  // =========================================================================
  // getReservationConfirmedEmail
  // =========================================================================
  describe('getReservationConfirmedEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getReservationConfirmedEmail(mockReservation);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should include "Confirmada" in the subject', () => {
      const result = getReservationConfirmedEmail(mockReservation);

      expect(result.subject).toContain('Confirmada');
    });

    it('should include customer first_name in html', () => {
      const result = getReservationConfirmedEmail(mockReservation);

      expect(result.html).toContain('Joao');
    });

    it('should include the reservation date in html', () => {
      const result = getReservationConfirmedEmail(mockReservation);

      expect(result.html).toContain('2026');
    });
  });

  // =========================================================================
  // getFarewellEmail
  // =========================================================================
  describe('getFarewellEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getFarewellEmail(mockReservation);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should include "Obrigado" in the subject', () => {
      const result = getFarewellEmail(mockReservation);

      expect(result.subject).toContain('Obrigado');
    });

    it('should include customer first_name in html', () => {
      const result = getFarewellEmail(mockReservation);

      expect(result.html).toContain('Joao');
    });
  });

  // =========================================================================
  // getDayBeforeReminderEmail
  // =========================================================================
  describe('getDayBeforeReminderEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getDayBeforeReminderEmail(mockReservation);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should include "Lembrete" in the subject', () => {
      const result = getDayBeforeReminderEmail(mockReservation);

      expect(result.subject).toContain('Lembrete');
    });

    it('should include the reservation date in the subject', () => {
      const result = getDayBeforeReminderEmail(mockReservation);

      expect(result.subject).toContain('2026');
    });

    it('should include customer first_name in html', () => {
      const result = getDayBeforeReminderEmail(mockReservation);

      expect(result.html).toContain('Joao');
    });

    it('should include waste fee info when reservation is rodizio', () => {
      const result = getDayBeforeReminderEmail(rodizioReservation);

      // Default waste fee is 2.50, displayed as "2,50" in Portuguese format
      expect(result.html).toContain('2,50');
      expect(result.html).toContain('Anti-Desperd');
    });

    it('should not include waste fee info when reservation is not rodizio', () => {
      const result = getDayBeforeReminderEmail(mockReservation);

      expect(result.html).not.toContain('Anti-Desperd');
    });
  });

  // =========================================================================
  // getSameDayReminderEmail
  // =========================================================================
  describe('getSameDayReminderEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getSameDayReminderEmail(mockReservation);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should reference urgency in the subject', () => {
      const result = getSameDayReminderEmail(mockReservation);

      // Subject: "Daqui a 2 horas! A sua reserva no Sushi in Sushi"
      expect(result.subject).toContain('2 horas');
    });

    it('should include customer first_name in html', () => {
      const result = getSameDayReminderEmail(mockReservation);

      expect(result.html).toContain('Joao');
    });

    it('should include waste fee info when reservation is rodizio', () => {
      const result = getSameDayReminderEmail(rodizioReservation, 3.00);

      // Custom waste fee 3.00 displayed as "3,00"
      expect(result.html).toContain('3,00');
      expect(result.html).toContain('Anti-Desperd');
    });
  });

  // =========================================================================
  // getCancellationEmail
  // =========================================================================
  describe('getCancellationEmail', () => {
    it('should return an object with subject and html properties', () => {
      const result = getCancellationEmail(mockReservation, 'Restaurante sem disponibilidade');

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
    });

    it('should include "Cancelada" in the subject', () => {
      const result = getCancellationEmail(mockReservation, 'Motivo qualquer');

      expect(result.subject).toContain('Cancelada');
    });

    it('should include the cancellation reason in html', () => {
      const reason = 'Restaurante sem disponibilidade';
      const result = getCancellationEmail(mockReservation, reason);

      expect(result.html).toContain(reason);
    });

    it('should include customer first_name in html', () => {
      const result = getCancellationEmail(mockReservation, 'Motivo');

      expect(result.html).toContain('Joao');
    });

    it('should include the reservation date in html', () => {
      const result = getCancellationEmail(mockReservation, 'Motivo');

      expect(result.html).toContain('2026');
    });
  });

  // =========================================================================
  // Cross-cutting tests
  // =========================================================================
  describe('Location handling', () => {
    it('should use Boavista address info for boavista location', () => {
      const result = getCustomerConfirmationEmail(boavistaReservation);

      expect(result.html).toContain('Boavista');
      expect(result.html).toContain('Avenida da Boavista');
    });

    it('should use Circunvalacao address info for circunvalacao location', () => {
      const result = getCustomerConfirmationEmail(mockReservation);

      expect(result.html).toContain('Circunvala');
      expect(result.html).toContain('Rua da Circunvala');
    });
  });
});
