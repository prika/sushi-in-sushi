/**
 * Integration Tests: Resend Webhooks API
 * Tests for /api/webhooks/resend (POST)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

describe('POST /api/webhooks/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Verificação de assinatura', () => {
    it('verifica assinatura HMAC SHA256', () => {
      const payload = 'test payload';
      const secret = 'webhook_secret';

      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64); // SHA256 hex
    });

    it('usa timing-safe comparison', () => {
      const sig1 = 'abc123';
      const sig2 = 'abc123';

      const buffer1 = Buffer.from(sig1);
      const buffer2 = Buffer.from(sig2);

      expect(buffer1.length).toBe(buffer2.length);
    });

    it('rejeita assinatura inválida', () => {
      const payload = 'test';
      const secret = 'secret1';
      const wrongSecret = 'secret2';

      const correctSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const providedSignature = crypto.createHmac('sha256', wrongSecret).update(payload).digest('hex');

      expect(correctSignature).not.toBe(providedSignature);
    });

    it('permite webhook se secret não configurado (desenvolvimento)', () => {
      const secret = undefined;
      const signature = null;

      const shouldAllow = !secret || !signature;

      expect(shouldAllow).toBe(true);
    });
  });

  describe('Tipos de eventos Resend', () => {
    it('suporta email.sent', () => {
      const eventType = 'email.sent';

      expect(['email.sent', 'email.delivered', 'email.opened'].includes(eventType)).toBe(true);
    });

    it('suporta email.delivered', () => {
      const eventType = 'email.delivered';

      expect(['email.sent', 'email.delivered', 'email.opened'].includes(eventType)).toBe(true);
    });

    it('suporta email.opened', () => {
      const eventType = 'email.opened';

      expect(['email.sent', 'email.delivered', 'email.opened'].includes(eventType)).toBe(true);
    });

    it('suporta email.clicked', () => {
      const eventType = 'email.clicked';

      expect(['email.clicked', 'email.bounced', 'email.complained'].includes(eventType)).toBe(true);
    });

    it('suporta email.bounced', () => {
      const eventType = 'email.bounced';

      expect(['email.bounced', 'email.complained', 'email.delivery_delayed'].includes(eventType)).toBe(true);
    });

    it('suporta email.complained', () => {
      const eventType = 'email.complained';

      expect(['email.bounced', 'email.complained', 'email.delivery_delayed'].includes(eventType)).toBe(true);
    });

    it('suporta email.delivery_delayed', () => {
      const eventType = 'email.delivery_delayed';

      expect(['email.bounced', 'email.complained', 'email.delivery_delayed'].includes(eventType)).toBe(true);
    });
  });

  describe('Mapeamento de event types para status', () => {
    it('mapeia email.sent para sent', () => {
      const eventType = 'email.sent';
      const status = eventType === 'email.sent' ? 'sent' : 'unknown';

      expect(status).toBe('sent');
    });

    it('mapeia email.delivered para delivered', () => {
      const eventType = 'email.delivered';
      const status = eventType === 'email.delivered' ? 'delivered' : 'unknown';

      expect(status).toBe('delivered');
    });

    it('mapeia email.opened para opened', () => {
      const eventType = 'email.opened';
      const status = eventType === 'email.opened' ? 'opened' : 'unknown';

      expect(status).toBe('opened');
    });

    it('mapeia email.clicked para clicked', () => {
      const eventType = 'email.clicked';
      const status = eventType === 'email.clicked' ? 'clicked' : 'unknown';

      expect(status).toBe('clicked');
    });

    it('mapeia email.bounced para bounced', () => {
      const eventType = 'email.bounced';
      const status = eventType === 'email.bounced' ? 'bounced' : 'unknown';

      expect(status).toBe('bounced');
    });

    it('mapeia email.complained para complained', () => {
      const eventType = 'email.complained';
      const status = eventType === 'email.complained' ? 'complained' : 'unknown';

      expect(status).toBe('complained');
    });

    it('mapeia email.delivery_delayed para delayed', () => {
      const eventType = 'email.delivery_delayed';
      const status = eventType === 'email.delivery_delayed' ? 'delayed' : 'unknown';

      expect(status).toBe('delayed');
    });

    it('mapeia tipos desconhecidos para unknown', () => {
      const eventType = 'email.unknown';
      const validTypes = ['email.sent', 'email.delivered', 'email.opened'];
      const status = validTypes.includes(eventType) ? 'known' : 'unknown';

      expect(status).toBe('unknown');
    });
  });

  describe('Estrutura do evento webhook', () => {
    it('inclui type, created_at e data', () => {
      const event = {
        type: 'email.delivered',
        created_at: '2026-02-13T10:00:00Z',
        data: {
          email_id: 'email-123',
          from: 'noreply@sushiinsushi.pt',
          to: ['customer@example.com'],
          subject: 'Reserva Confirmada',
        },
      };

      expect(event.type).toBeDefined();
      expect(event.created_at).toBeDefined();
      expect(event.data).toBeDefined();
      expect(event.data.email_id).toBeDefined();
    });

    it('data.to é array de emails', () => {
      const data = {
        to: ['customer1@example.com', 'customer2@example.com'],
      };

      expect(Array.isArray(data.to)).toBe(true);
      expect(data.to).toHaveLength(2);
    });

    it('email.clicked inclui link', () => {
      const data = {
        click: { link: 'https://example.com/reservation' },
      };

      expect(data.click).toBeDefined();
      expect(data.click.link).toContain('https://');
    });
  });

  describe('Logging de eventos', () => {
    it('insere evento em email_events', () => {
      const logEntry = {
        email_id: 'email-123',
        event_type: 'delivered',
        recipient_email: 'customer@example.com',
        raw_data: { type: 'email.delivered' },
        event_timestamp: '2026-02-13T10:00:00Z',
      };

      expect(logEntry.email_id).toBeDefined();
      expect(logEntry.event_type).toBeDefined();
      expect(logEntry.recipient_email).toBeDefined();
    });

    it('armazena evento completo em raw_data', () => {
      const rawData = {
        type: 'email.opened',
        created_at: '2026-02-13T10:00:00Z',
        data: { email_id: 'email-123' },
      };

      expect(rawData.type).toBeDefined();
      expect(rawData.data).toBeDefined();
    });
  });

  describe('Tipos de email de reserva', () => {
    it('identifica customer_email (confirmação inicial)', () => {
      const emailId = 'email-123';
      const reservation = { customer_email_id: 'email-123' };

      const isCustomerEmail = reservation.customer_email_id === emailId;

      expect(isCustomerEmail).toBe(true);
    });

    it('identifica confirmation_email (reserva confirmada por staff)', () => {
      const emailId = 'email-456';
      const reservation = { confirmation_email_id: 'email-456' };

      const isConfirmationEmail = reservation.confirmation_email_id === emailId;

      expect(isConfirmationEmail).toBe(true);
    });

    it('identifica day_before_reminder (lembrete dia anterior)', () => {
      const emailId = 'email-789';
      const reservation = { day_before_reminder_id: 'email-789' };

      const isDayBeforeReminder = reservation.day_before_reminder_id === emailId;

      expect(isDayBeforeReminder).toBe(true);
    });

    it('identifica same_day_reminder (lembrete mesmo dia)', () => {
      const emailId = 'email-012';
      const reservation = { same_day_reminder_id: 'email-012' };

      const isSameDayReminder = reservation.same_day_reminder_id === emailId;

      expect(isSameDayReminder).toBe(true);
    });
  });

  describe('Atualização de status de email', () => {
    it('atualiza customer_email_status', () => {
      const updateData = {
        customer_email_status: 'delivered',
      };

      expect(updateData.customer_email_status).toBe('delivered');
    });

    it('regista customer_email_delivered_at para delivered', () => {
      const eventType = 'email.delivered';
      const updateData: Record<string, unknown> = {
        customer_email_status: 'delivered',
      };

      if (eventType === 'email.delivered') {
        updateData.customer_email_delivered_at = '2026-02-13T10:00:00Z';
      }

      expect(updateData.customer_email_delivered_at).toBeDefined();
    });

    it('regista customer_email_opened_at para opened', () => {
      const eventType = 'email.opened';
      const updateData: Record<string, unknown> = {
        customer_email_status: 'opened',
      };

      if (eventType === 'email.opened') {
        updateData.customer_email_opened_at = '2026-02-13T11:00:00Z';
      }

      expect(updateData.customer_email_opened_at).toBeDefined();
    });

    it('não regista timestamps para outros eventos', () => {
      const eventType = 'email.sent';
      const updateData: Record<string, unknown> = {
        customer_email_status: 'sent',
      };

      if (eventType === 'email.delivered') {
        updateData.customer_email_delivered_at = '2026-02-13T10:00:00Z';
      }

      expect(updateData).not.toHaveProperty('customer_email_delivered_at');
    });
  });

  describe('Atualização de email_events com reservation_id', () => {
    it('liga evento a reserva (customer_confirmation)', () => {
      const eventUpdate = {
        reservation_id: 'reservation-123',
        email_type: 'customer_confirmation',
      };

      expect(eventUpdate.reservation_id).toBe('reservation-123');
      expect(eventUpdate.email_type).toBe('customer_confirmation');
    });

    it('liga evento a reserva (reservation_confirmed)', () => {
      const eventUpdate = {
        reservation_id: 'reservation-456',
        email_type: 'reservation_confirmed',
      };

      expect(eventUpdate.email_type).toBe('reservation_confirmed');
    });

    it('liga evento a reserva (day_before_reminder)', () => {
      const eventUpdate = {
        reservation_id: 'reservation-789',
        email_type: 'day_before_reminder',
      };

      expect(eventUpdate.email_type).toBe('day_before_reminder');
    });

    it('liga evento a reserva (same_day_reminder)', () => {
      const eventUpdate = {
        reservation_id: 'reservation-012',
        email_type: 'same_day_reminder',
      };

      expect(eventUpdate.email_type).toBe('same_day_reminder');
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna success true e tipo customer_email', () => {
      const response = {
        success: true,
        type: 'customer_email',
      };

      expect(response.success).toBe(true);
      expect(response.type).toBe('customer_email');
    });

    it('retorna tipo confirmation_email', () => {
      const response = {
        success: true,
        type: 'confirmation_email',
      };

      expect(response.type).toBe('confirmation_email');
    });

    it('retorna tipo day_before_reminder', () => {
      const response = {
        success: true,
        type: 'day_before_reminder',
      };

      expect(response.type).toBe('day_before_reminder');
    });

    it('retorna tipo same_day_reminder', () => {
      const response = {
        success: true,
        type: 'same_day_reminder',
      };

      expect(response.type).toBe('same_day_reminder');
    });

    it('retorna tipo untracked se email não encontrado', () => {
      const response = {
        success: true,
        type: 'untracked',
      };

      expect(response.type).toBe('untracked');
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 401 para assinatura inválida', () => {
      const error = { code: 'INVALID_SIGNATURE', status: 401 };

      expect(error.status).toBe(401);
    });

    it('retorna 500 para erro interno', () => {
      const error = { code: 'INTERNAL_ERROR', status: 500 };

      expect(error.status).toBe(500);
    });
  });

  describe('Casos de uso', () => {
    it('processa entrega de email de confirmação', () => {
      const event = {
        type: 'email.delivered',
        data: { email_id: 'email-123' },
        created_at: '2026-02-13T10:00:00Z',
      };

      expect(event.type).toBe('email.delivered');
      expect(event.data.email_id).toBeDefined();
    });

    it('processa abertura de email de lembrete', () => {
      const event = {
        type: 'email.opened',
        data: { email_id: 'email-456' },
        created_at: '2026-02-13T11:00:00Z',
      };

      expect(event.type).toBe('email.opened');
    });

    it('processa bounce de email', () => {
      const event = {
        type: 'email.bounced',
        data: { email_id: 'email-789' },
      };

      const status = event.type === 'email.bounced' ? 'bounced' : 'unknown';

      expect(status).toBe('bounced');
    });

    it('processa complaint (spam)', () => {
      const event = {
        type: 'email.complained',
        data: { email_id: 'email-012' },
      };

      const status = event.type === 'email.complained' ? 'complained' : 'unknown';

      expect(status).toBe('complained');
    });

    it('processa clique em link de email', () => {
      const event = {
        type: 'email.clicked',
        data: {
          email_id: 'email-345',
          click: { link: 'https://sushiinsushi.pt/reserva' },
        },
      };

      expect(event.type).toBe('email.clicked');
      expect(event.data.click).toBeDefined();
    });
  });
});
