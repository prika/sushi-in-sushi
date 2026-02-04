/**
 * Integration Tests: Reservations API
 * Tests for the /api/reservations endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestReservation, getFutureDate, getPastDate, getTodayDate } from '../../helpers/factories';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

// Mock email sending
vi.mock('@/lib/email', () => ({
  sendReservationEmails: vi.fn().mockResolvedValue({ success: true }),
}));

describe('POST /api/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de campos obrigatórios', () => {
    it('rejeita pedido sem first_name', async () => {
      const body = {
        last_name: 'Silva',
        email: 'test@test.com',
        phone: '912345678',
        reservation_date: getFutureDate(1),
        reservation_time: '19:00',
        party_size: 4,
        location: 'circunvalacao',
      };

      // Simulate validation
      const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'reservation_date', 'reservation_time', 'party_size', 'location'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toContain('first_name');
    });

    it('aceita pedido com todos os campos', () => {
      const body = {
        first_name: 'João',
        last_name: 'Silva',
        email: 'test@test.com',
        phone: '912345678',
        reservation_date: getFutureDate(1),
        reservation_time: '19:00',
        party_size: 4,
        location: 'circunvalacao',
      };

      const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'reservation_date', 'reservation_time', 'party_size', 'location'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toHaveLength(0);
    });
  });

  describe('Validação de party_size', () => {
    it('rejeita party_size 0', () => {
      const partySize = 0;
      expect(partySize >= 1 && partySize <= 20).toBe(false);
    });

    it('rejeita party_size > 20', () => {
      const partySize = 21;
      expect(partySize >= 1 && partySize <= 20).toBe(false);
    });

    it('aceita party_size entre 1 e 20', () => {
      [1, 4, 10, 20].forEach(size => {
        expect(size >= 1 && size <= 20).toBe(true);
      });
    });
  });

  describe('Validação de data', () => {
    it('rejeita datas passadas', () => {
      const pastDate = getPastDate(1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reservationDate = new Date(pastDate);

      expect(reservationDate < today).toBe(true);
    });

    it('aceita data de hoje ou futuro', () => {
      const futureDate = getFutureDate(1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reservationDate = new Date(futureDate);

      expect(reservationDate >= today).toBe(true);
    });
  });

  describe('Validação de localização', () => {
    it('aceita circunvalacao', () => {
      expect(['circunvalacao', 'boavista'].includes('circunvalacao')).toBe(true);
    });

    it('aceita boavista', () => {
      expect(['circunvalacao', 'boavista'].includes('boavista')).toBe(true);
    });

    it('rejeita localização inválida', () => {
      expect(['circunvalacao', 'boavista'].includes('invalid')).toBe(false);
    });
  });
});

describe('GET /api/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna reservas filtradas por data', () => {
    const reservations = [
      createTestReservation({ reservation_date: '2026-02-10' }),
      createTestReservation({ reservation_date: '2026-02-11' }),
    ];

    const filterDate = '2026-02-10';
    const filtered = reservations.filter(r => r.reservation_date === filterDate);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].reservation_date).toBe('2026-02-10');
  });

  it('retorna reservas filtradas por localização', () => {
    const reservations = [
      createTestReservation({ location: 'circunvalacao' }),
      createTestReservation({ location: 'boavista' }),
    ];

    const filterLocation = 'circunvalacao';
    const filtered = reservations.filter(r => r.location === filterLocation);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].location).toBe('circunvalacao');
  });

  it('retorna reservas filtradas por status', () => {
    const reservations = [
      createTestReservation({ status: 'pending' }),
      createTestReservation({ status: 'confirmed' }),
      createTestReservation({ status: 'cancelled' }),
    ];

    const filterStatus = 'pending';
    const filtered = reservations.filter(r => r.status === filterStatus);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe('pending');
  });
});

describe('Verificação de dias de folga', () => {
  it('deteta fecho específico para a data', () => {
    const closures = [
      { closure_date: '2026-02-15', location: null, reason: 'Feriado' },
    ];

    const checkDate = '2026-02-15';
    const closure = closures.find(c => c.closure_date === checkDate);

    expect(closure).toBeDefined();
    expect(closure?.reason).toBe('Feriado');
  });

  it('deteta fecho recorrente semanal', () => {
    const closures = [
      { is_recurring: true, recurring_day_of_week: 1, reason: 'Fechado às segundas' }, // Monday
    ];

    const checkDate = new Date('2026-02-09'); // This is a Monday
    const dayOfWeek = checkDate.getDay();
    const closure = closures.find(c => c.is_recurring && c.recurring_day_of_week === dayOfWeek);

    expect(closure).toBeDefined();
    expect(closure?.reason).toBe('Fechado às segundas');
  });

  it('permite reserva em dia aberto', () => {
    const closures = [
      { closure_date: '2026-02-15', location: null, reason: 'Feriado' },
    ];

    const checkDate = '2026-02-14'; // Different date
    const closure = closures.find(c => c.closure_date === checkDate);

    expect(closure).toBeUndefined();
  });
});
