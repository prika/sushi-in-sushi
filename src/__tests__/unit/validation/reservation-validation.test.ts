/**
 * Unit Tests: Reservation Validation
 * Tests for reservation validation logic
 */

import { describe, it, expect } from 'vitest';
import { getFutureDate, getPastDate, getTodayDate, getFutureTime } from '../../helpers/factories';

// Validation functions (these would be extracted from the API route)
function isValidPartySize(partySize: number): boolean {
  return partySize >= 1 && partySize <= 20;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Portuguese phone format: 9 digits starting with 9, or with +351
  const cleanPhone = phone.replace(/[\s-+]/g, '');
  return /^(351)?9\d{8}$/.test(cleanPhone);
}

function isValidReservationDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function isValidReservationTime(dateString: string, timeString: string, bufferMinutes: number = 30): boolean {
  const reservationDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If not same day, time is always valid
  if (reservationDate.getTime() !== today.getTime()) {
    return true;
  }

  // For same day, check if time is in the future with buffer
  const now = new Date();
  const [hours, minutes] = timeString.split(':').map(Number);
  const reservationTime = new Date();
  reservationTime.setHours(hours, minutes, 0, 0);

  const bufferTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
  return reservationTime >= bufferTime;
}

function isValidLocation(location: string): boolean {
  return ['circunvalacao', 'boavista'].includes(location);
}

describe('Reservation Validation', () => {
  describe('isValidPartySize', () => {
    it('aceita tamanho válido (1-20)', () => {
      expect(isValidPartySize(1)).toBe(true);
      expect(isValidPartySize(4)).toBe(true);
      expect(isValidPartySize(20)).toBe(true);
    });

    it('rejeita tamanho 0', () => {
      expect(isValidPartySize(0)).toBe(false);
    });

    it('rejeita tamanho negativo', () => {
      expect(isValidPartySize(-1)).toBe(false);
    });

    it('rejeita tamanho > 20', () => {
      expect(isValidPartySize(21)).toBe(false);
      expect(isValidPartySize(100)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('aceita emails válidos', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.pt')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('rejeita emails inválidos', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('aceita telefones portugueses válidos', () => {
      expect(isValidPhone('912345678')).toBe(true);
      expect(isValidPhone('961234567')).toBe(true);
      expect(isValidPhone('+351912345678')).toBe(true);
      expect(isValidPhone('351 912 345 678')).toBe(true);
    });

    it('rejeita telefones inválidos', () => {
      expect(isValidPhone('12345678')).toBe(false); // não começa com 9
      expect(isValidPhone('91234567')).toBe(false); // poucos dígitos
      expect(isValidPhone('9123456789')).toBe(false); // dígitos a mais
    });
  });

  describe('isValidReservationDate', () => {
    it('aceita datas futuras', () => {
      expect(isValidReservationDate(getFutureDate(1))).toBe(true);
      expect(isValidReservationDate(getFutureDate(30))).toBe(true);
    });

    it('aceita data de hoje', () => {
      expect(isValidReservationDate(getTodayDate())).toBe(true);
    });

    it('rejeita datas passadas', () => {
      expect(isValidReservationDate(getPastDate(1))).toBe(false);
      expect(isValidReservationDate(getPastDate(30))).toBe(false);
    });
  });

  describe('isValidReservationTime', () => {
    it('aceita qualquer hora para datas futuras', () => {
      const futureDate = getFutureDate(1);
      expect(isValidReservationTime(futureDate, '12:00')).toBe(true);
      expect(isValidReservationTime(futureDate, '19:00')).toBe(true);
    });

    it('aceita hora futura com buffer para hoje', () => {
      const today = getTodayDate();
      const futureTime = getFutureTime(2); // 2 horas no futuro
      expect(isValidReservationTime(today, futureTime, 30)).toBe(true);
    });

    // Note: This test depends on current time
    it('rejeita hora passada para hoje', () => {
      const today = getTodayDate();
      // Early morning time is always in the past after ~00:30
      const pastTime = '00:00';
      const now = new Date();
      if (now.getHours() > 0 || now.getMinutes() > 30) {
        expect(isValidReservationTime(today, pastTime, 30)).toBe(false);
      }
    });
  });

  describe('isValidLocation', () => {
    it('aceita localizações válidas', () => {
      expect(isValidLocation('circunvalacao')).toBe(true);
      expect(isValidLocation('boavista')).toBe(true);
    });

    it('rejeita localizações inválidas', () => {
      expect(isValidLocation('invalid')).toBe(false);
      expect(isValidLocation('')).toBe(false);
      expect(isValidLocation('lisboa')).toBe(false);
    });
  });
});

describe('Formatação', () => {
  describe('formatPhone', () => {
    function formatPhone(phone: string): string {
      const clean = phone.replace(/\D/g, '');
      const withoutCountry = clean.startsWith('351') ? clean.slice(3) : clean;
      return `+351 ${withoutCountry.slice(0, 3)} ${withoutCountry.slice(3, 6)} ${withoutCountry.slice(6)}`;
    }

    it('formata telefone corretamente', () => {
      expect(formatPhone('912345678')).toBe('+351 912 345 678');
      expect(formatPhone('351912345678')).toBe('+351 912 345 678');
    });
  });

  describe('formatPrice', () => {
    function formatPrice(price: number): string {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
      }).format(price);
    }

    it('formata preço em euros', () => {
      expect(formatPrice(12.5)).toMatch(/12[,.]50/);
      expect(formatPrice(100)).toMatch(/100[,.]00/);
    });
  });

  describe('formatDate', () => {
    function formatDate(dateString: string): string {
      return new Date(dateString).toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }

    it('formata data em português', () => {
      const formatted = formatDate('2026-02-14');
      expect(formatted).toContain('14');
      expect(formatted).toContain('fevereiro');
    });
  });
});
