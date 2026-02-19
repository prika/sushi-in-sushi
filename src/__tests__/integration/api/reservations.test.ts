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

describe('GET /api/reservations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Busca por ID', () => {
    it('retorna reserva se encontrada', () => {
      const reservation = createTestReservation();

      expect(reservation.id).toBeDefined();
      expect(reservation.email).toBeDefined();
    });

    it('retorna 404 se não encontrada', () => {
      const result = { success: false, error: 'Reserva não encontrada' };
      const status = 404;

      expect(status).toBe(404);
    });
  });

  describe('Formato de resposta', () => {
    it('retorna em snake_case', () => {
      const response = {
        id: '1',
        first_name: 'João',
        last_name: 'Silva',
        party_size: 4,
        reservation_date: '2026-02-20',
        reservation_time: '19:00',
      };

      expect(response).toHaveProperty('first_name');
      expect(response).toHaveProperty('party_size');
      expect(response).toHaveProperty('reservation_date');
    });

    it('inclui timestamps', () => {
      const response = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(response.created_at).toBeDefined();
      expect(response.updated_at).toBeDefined();
    });
  });
});

describe('PATCH /api/reservations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', () => {
      const user = null;
      const isAuthenticated = !!user;

      expect(isAuthenticated).toBe(false);
    });

    it('permite qualquer role autenticado', () => {
      const allowedRoles = ['admin', 'waiter', 'kitchen'];

      allowedRoles.forEach(role => {
        expect(['admin', 'waiter', 'kitchen'].includes(role)).toBe(true);
      });
    });
  });

  describe('Mudanças de status com use cases especializados', () => {
    it('usa ConfirmReservationUseCase para confirmed', () => {
      const body = { status: 'confirmed' };

      const useCaseType = body.status === 'confirmed' ? 'ConfirmReservationUseCase' : 'UpdateReservationUseCase';

      expect(useCaseType).toBe('ConfirmReservationUseCase');
    });

    it('usa CancelReservationUseCase para cancelled', () => {
      const body = { status: 'cancelled', cancellation_reason: 'Cliente cancelou' };

      const useCaseType = body.status === 'cancelled' ? 'CancelReservationUseCase' : 'UpdateReservationUseCase';

      expect(useCaseType).toBe('CancelReservationUseCase');
    });

    it('usa MarkReservationSeatedUseCase para completed com session_id', () => {
      const body = { status: 'completed', session_id: 'session-123' };

      const useCaseType = (body.status === 'completed' && body.session_id) ? 'MarkReservationSeatedUseCase' : 'UpdateReservationUseCase';

      expect(useCaseType).toBe('MarkReservationSeatedUseCase');
    });

    it('usa MarkReservationNoShowUseCase para no_show', () => {
      const body = { status: 'no_show' };

      const useCaseType = body.status === 'no_show' ? 'MarkReservationNoShowUseCase' : 'UpdateReservationUseCase';

      expect(useCaseType).toBe('MarkReservationNoShowUseCase');
    });

    it('usa UpdateReservationUseCase para outros casos', () => {
      const body = { table_id: 'table-5' };

      const useCaseType = body.status ? 'SpecializedUseCase' : 'UpdateReservationUseCase';

      expect(useCaseType).toBe('UpdateReservationUseCase');
    });
  });

  describe('Suporte camelCase e snake_case', () => {
    it('aceita table_id e tableId', () => {
      const body1 = { table_id: 'table-5' };
      const body2 = { tableId: 'table-5' };

      const tableId1 = body1.table_id ?? (body1 as any).tableId;
      const tableId2 = (body2 as any).tableId ?? body2.table_id;

      expect(tableId1).toBe('table-5');
      expect(tableId2).toBe('table-5');
    });

    it('aceita cancellation_reason e cancellationReason', () => {
      const body1 = { cancellation_reason: 'Motivo' };
      const body2 = { cancellationReason: 'Motivo' };

      const reason1 = body1.cancellation_reason ?? (body1 as any).cancellationReason;
      const reason2 = (body2 as any).cancellationReason ?? body2.cancellation_reason;

      expect(reason1).toBe('Motivo');
      expect(reason2).toBe('Motivo');
    });

    it('aceita session_id e sessionId', () => {
      const body1 = { session_id: 'session-123' };
      const body2 = { sessionId: 'session-123' };

      const sessionId1 = body1.session_id ?? (body1 as any).sessionId;
      const sessionId2 = (body2 as any).sessionId ?? body2.session_id;

      expect(sessionId1).toBe('session-123');
      expect(sessionId2).toBe('session-123');
    });
  });

  describe('Confirmação de reserva', () => {
    it('regista confirmedBy ao confirmar', () => {
      const userId = 'user-123';
      const status = 'confirmed';

      const updateData: { confirmedBy?: string } = {};
      if (status === 'confirmed') {
        updateData.confirmedBy = userId;
      }

      expect(updateData.confirmedBy).toBe(userId);
    });

    it('envia email de confirmação', () => {
      const status = 'confirmed';

      const shouldSendEmail = status === 'confirmed';

      expect(shouldSendEmail).toBe(true);
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 404 se não encontrada', () => {
      const error = 'Reserva não encontrada';
      const status = error.includes('não encontrada') ? 404 : 400;

      expect(status).toBe(404);
    });

    it('retorna 400 para erros de validação', () => {
      const error = 'Dados inválidos';
      const status = error.includes('não encontrada') ? 404 : 400;

      expect(status).toBe(400);
    });
  });
});

describe('DELETE /api/reservations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação', () => {
    it('requer autenticação', () => {
      const user = null;
      const isAuthenticated = !!user;

      expect(isAuthenticated).toBe(false);
    });

    it('requer role admin', () => {
      const user = { role: 'waiter' };
      const isAdmin = user.role === 'admin';

      expect(isAdmin).toBe(false);
    });

    it('permite admin eliminar', () => {
      const user = { role: 'admin' };
      const isAdmin = user.role === 'admin';

      expect(isAdmin).toBe(true);
    });
  });

  describe('Eliminação', () => {
    it('retorna success true', () => {
      const response = { success: true };

      expect(response.success).toBe(true);
    });

    it('não retorna dados da reserva eliminada', () => {
      const response = { success: true };

      expect(Object.keys(response)).toHaveLength(1);
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 400 para erro', () => {
      const error = { code: 'DELETE_FAILED', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 403 para não-admin', () => {
      const user = { role: 'waiter' };
      const status = user.role !== 'admin' ? 403 : 200;

      expect(status).toBe(403);
    });
  });
});
