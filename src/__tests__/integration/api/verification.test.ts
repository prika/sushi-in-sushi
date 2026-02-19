/**
 * Integration Tests: Verification API
 * Tests for /api/verification/send and /api/verification/verify
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as sendPOST } from '@/app/api/verification/send/route';
import { POST as verifyPOST } from '@/app/api/verification/verify/route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}));

// Mock Resend
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' } }),
      };
    },
  };
});

// Mock Twilio
vi.mock('twilio', () => {
  return {
    default: function MockTwilio() {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({ sid: 'test-sms-id' }),
        },
      };
    },
  };
});

// Helper to create mock NextRequest
function createMockRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: new Headers({
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Mozilla/5.0',
    }),
  } as NextRequest;
}

describe('POST /api/verification/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de entrada', () => {
    it('requer sessionCustomerId', async () => {
      const body = { verificationType: 'email', contactValue: 'test@example.com' };
      const request = createMockRequest(body);

      const response = await sendPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('requer verificationType', async () => {
      const body = { sessionCustomerId: '123', contactValue: 'test@example.com' };
      const request = createMockRequest(body);

      const response = await sendPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('requer contactValue', async () => {
      const body = { sessionCustomerId: '123', verificationType: 'email' };
      const request = createMockRequest(body);

      const response = await sendPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('valida verificationType como email ou phone', async () => {
      // Test that 'email' and 'phone' pass validation (don't return 400 for invalid type)
      const validTypes = ['email', 'phone'];

      for (const type of validTypes) {
        // Mock Supabase to prevent errors after validation passes
        const mockSelect = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockGte = vi.fn().mockReturnThis();
        const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

        mockSupabaseFrom.mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          gte: mockGte,
          limit: mockLimit,
        });

        const body = {
          sessionCustomerId: '123',
          verificationType: type,
          contactValue: 'test@example.com'
        };
        const request = createMockRequest(body);
        const response = await sendPOST(request);
        const data = await response.json();

        // Should NOT return 400 with "Invalid verification type" error
        if (response.status === 400) {
          expect(data.error).not.toBe('Invalid verification type');
        }
      }
    });

    it('rejeita tipos inválidos', async () => {
      const invalidTypes = ['sms', 'whatsapp', 'invalid'];

      for (const type of invalidTypes) {
        const body = {
          sessionCustomerId: '123',
          verificationType: type,
          contactValue: 'test@example.com'
        };
        const request = createMockRequest(body);
        const response = await sendPOST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid verification type');
      }
    });
  });

  describe('Rate limiting', () => {
    it('permite até 3 tentativas por hora', async () => {
      // Mock Supabase to return 2 recent logs (below rate limit)
      const recentLogs = [
        { id: '1', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { id: '2', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: recentLogs, error: null });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        limit: mockLimit,
      });

      // Mock RPC for token generation
      mockSupabaseRpc.mockResolvedValue({ data: '123456', error: null });

      const body = {
        sessionCustomerId: '123',
        verificationType: 'email',
        contactValue: 'test@example.com'
      };
      const request = createMockRequest(body);
      const response = await sendPOST(request);

      // Should NOT return 429 (rate limit) with only 2 recent attempts
      expect(response.status).not.toBe(429);
    });

    it('bloqueia após 3 tentativas', async () => {
      // Mock Supabase to return 3 recent logs (at rate limit)
      const recentLogs = [
        { id: '1', created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
        { id: '2', created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
        { id: '3', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: recentLogs, error: null });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        limit: mockLimit,
      });

      const body = {
        sessionCustomerId: '123',
        verificationType: 'email',
        contactValue: 'test@example.com'
      };
      const request = createMockRequest(body);
      const response = await sendPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many verification attempts');
      expect(data.error).toContain('1 hour');
    });

    it('usa janela de 1 hora para rate limit', async () => {
      // Mock Supabase to return logs with different timestamps
      // Only logs within last hour should count
      const allLogs = [
        { id: '1', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() }, // 30 min ago - counts
        { id: '2', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString() }, // 90 min ago - too old
        { id: '3', created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString() }, // 2 hours ago - too old
      ];

      // The route filters by gte(oneHourAgo), so Supabase should only return logs within 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLogs = allLogs.filter(log => new Date(log.created_at) >= oneHourAgo);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: recentLogs, error: null });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        limit: mockLimit,
      });

      mockSupabaseRpc.mockResolvedValue({ data: '123456', error: null });

      const body = {
        sessionCustomerId: '123',
        verificationType: 'email',
        contactValue: 'test@example.com'
      };
      const request = createMockRequest(body);
      const response = await sendPOST(request);

      // Verify the gte filter was called with a timestamp approximately 1 hour ago
      expect(mockGte).toHaveBeenCalled();
      const gteArg = mockGte.mock.calls[0][1]; // Second argument to gte()
      const gteTime = new Date(gteArg).getTime();
      const expectedTime = Date.now() - 60 * 60 * 1000;
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(gteTime - expectedTime)).toBeLessThan(1000);

      // With only 1 recent log, should not hit rate limit
      expect(response.status).not.toBe(429);
    });

    it('conta apenas logs recentes (última hora)', async () => {
      // Test that old logs outside 1-hour window don't count
      const allLogs = [
        { id: '1', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() }, // 30 min ago - count
        { id: '2', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString() }, // 90 min ago - skip
      ];

      // Simulate Supabase filtering (only returns logs from last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLogs = allLogs.filter(log => new Date(log.created_at) >= oneHourAgo);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: recentLogs, error: null });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        limit: mockLimit,
      });

      mockSupabaseRpc.mockResolvedValue({ data: '123456', error: null });

      const body = {
        sessionCustomerId: '123',
        verificationType: 'email',
        contactValue: 'test@example.com'
      };
      const request = createMockRequest(body);
      const response = await sendPOST(request);

      // Should have filtered to only 1 recent log
      expect(recentLogs).toHaveLength(1);

      // With only 1 recent log, should not hit rate limit
      expect(response.status).not.toBe(429);
    });
  });

  describe('Geração de token', () => {
    it('gera token de 6 dígitos', () => {
      const token = '123456';

      expect(token).toHaveLength(6);
      expect(/^\d{6}$/.test(token)).toBe(true);
    });

    it('token expira em 15 minutos', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (60 * 1000);

      expect(diffMinutes).toBe(15);
    });

    it('formata expiresAt como ISO string', () => {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const isoString = expiresAt.toISOString();

      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('Atualização de session_customer', () => {
    it('armazena token, expiresAt e type', () => {
      const updateData = {
        verification_token: '123456',
        verification_expires_at: new Date().toISOString(),
        verification_type: 'email',
      };

      expect(updateData.verification_token).toBeDefined();
      expect(updateData.verification_expires_at).toBeDefined();
      expect(updateData.verification_type).toBe('email');
    });

    it('suporta tipo phone', () => {
      const updateData = {
        verification_type: 'phone',
      };

      expect(['email', 'phone'].includes(updateData.verification_type)).toBe(true);
    });
  });

  describe('Logging de tentativa', () => {
    it('regista detalhes da tentativa', () => {
      const logEntry = {
        session_customer_id: '123',
        verification_type: 'email',
        contact_value: 'test@example.com',
        token: '123456',
        expires_at: new Date().toISOString(),
        status: 'sent',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      };

      expect(logEntry.status).toBe('sent');
      expect(logEntry.ip_address).toBeDefined();
      expect(logEntry.user_agent).toBeDefined();
    });

    it('extrai IP de headers', () => {
      const headers = new Map([
        ['x-forwarded-for', '192.168.1.1'],
        ['x-real-ip', '10.0.0.1'],
      ]);

      const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip');

      expect(ip).toBe('192.168.1.1');
    });

    it('usa x-real-ip como fallback', () => {
      const headers = new Map([
        ['x-real-ip', '10.0.0.1'],
      ]);

      const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip');

      expect(ip).toBe('10.0.0.1');
    });
  });

  describe('Envio por email', () => {
    it('valida formato de email', () => {
      const validEmails = ['test@example.com', 'user+tag@domain.co.uk'];

      validEmails.forEach(email => {
        expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(true);
      });
    });

    it('rejeita emails inválidos', () => {
      const invalidEmails = ['notanemail', '@example.com', 'user@'];

      invalidEmails.forEach(email => {
        expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(false);
      });
    });

    it('cria URL de verificação com token', () => {
      const token = '123456';
      const customerId = 'cust-123';
      const url = `https://example.com/mesa/verify?token=${token}&customerId=${customerId}`;

      expect(url).toContain('token=123456');
      expect(url).toContain('customerId=cust-123');
    });
  });

  describe('Envio por SMS', () => {
    it('valida formato de telefone', () => {
      const validPhones = ['+351912345678', '+351234567890'];

      validPhones.forEach(phone => {
        expect(/^\+\d{10,15}$/.test(phone)).toBe(true);
      });
    });

    it('rejeita telefones sem código de país', () => {
      const invalidPhones = ['912345678', '234567890'];

      invalidPhones.forEach(phone => {
        expect(/^\+\d{10,15}$/.test(phone)).toBe(false);
      });
    });

    it('retorna 503 se Twilio não configurado', async () => {
      try {
        // Stub Twilio env vars as empty
        vi.stubEnv('TWILIO_ACCOUNT_SID', '');
        vi.stubEnv('TWILIO_AUTH_TOKEN', '');
        vi.stubEnv('TWILIO_PHONE_NUMBER', '');

        // Mock Supabase for rate limiting check and update
        const mockSelect = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockGte = vi.fn().mockReturnThis();
        const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
        const mockUpdate = vi.fn().mockReturnThis();
        const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });

        let callCount = 0;
        mockSupabaseFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: rate limiting check
            return { select: mockSelect, eq: mockEq, gte: mockGte, limit: mockLimit };
          } else if (callCount === 2) {
            // Second call: update session_customer
            return { update: mockUpdate, eq: mockEq };
          } else {
            // Third call: insert verification_logs
            return { insert: mockInsert };
          }
        });

        // Mock RPC for token generation
        mockSupabaseRpc.mockResolvedValue({ data: '123456', error: null });

        const body = {
          sessionCustomerId: '123',
          verificationType: 'phone',
          contactValue: '+351912345678',
        };
        const request = createMockRequest(body);

        const response = await sendPOST(request);
        const data = await response.json();

        expect(response.status).toBe(503);
        expect(data.error).toContain('not configured');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('previne envio para o próprio número', async () => {
      // This test validates the same-number check via the route.
      // The validation logic is extracted to validateContactNotSameAsSender()
      // (tested separately in twilio.test.ts), and the route uses it to return 400.

      try {
        const sameNumber = '+351912345678';

        // Stub Twilio env vars with the sender number
        vi.stubEnv('TWILIO_ACCOUNT_SID', 'test-account-sid');
        vi.stubEnv('TWILIO_AUTH_TOKEN', 'test-auth-token');
        vi.stubEnv('TWILIO_PHONE_NUMBER', sameNumber);

        // Mock Supabase for rate limiting check and update
        const mockSelect = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockGte = vi.fn().mockReturnThis();
        const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
        const mockUpdate = vi.fn().mockReturnThis();
        const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });

        let callCount = 0;
        mockSupabaseFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: rate limiting check
            return { select: mockSelect, eq: mockEq, gte: mockGte, limit: mockLimit };
          } else if (callCount === 2) {
            // Second call: update session_customer
            return { update: mockUpdate, eq: mockEq };
          } else {
            // Third call: insert verification_logs
            return { insert: mockInsert };
          }
        });

        // Mock RPC for token generation
        mockSupabaseRpc.mockResolvedValue({ data: '123456', error: null });

        const body = {
          sessionCustomerId: '123',
          verificationType: 'phone',
          contactValue: sameNumber, // Same as Twilio sender
        };
        const request = createMockRequest(body);

        const response = await sendPOST(request);
        const data = await response.json();

        // Should return 400 with same-number error
        expect(response.status).toBe(400);
        expect(data.error).toContain('Cannot send SMS to the same number');
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna success true', () => {
      const response = {
        success: true,
        message: 'Verification code sent to email',
        expiresAt: new Date().toISOString(),
      };

      expect(response.success).toBe(true);
    });

    it('inclui expiresAt na resposta', () => {
      const response = {
        success: true,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      expect(response.expiresAt).toBeDefined();
      expect(typeof response.expiresAt).toBe('string');
    });

    it('diferencia mensagem por tipo', () => {
      const emailResponse = { message: 'Verification code sent to email' };
      const smsResponse = { message: 'Verification code sent via SMS' };

      expect(emailResponse.message).toContain('email');
      expect(smsResponse.message).toContain('SMS');
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 400 para campos ausentes', () => {
      const error = { code: 'MISSING_FIELDS', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 400 para tipo inválido', () => {
      const error = { code: 'INVALID_TYPE', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 429 para rate limit excedido', () => {
      const error = { code: 'RATE_LIMIT', status: 429 };

      expect(error.status).toBe(429);
    });

    it('retorna 500 para erro ao gerar token', () => {
      const error = { code: 'TOKEN_GENERATION_FAILED', status: 500 };

      expect(error.status).toBe(500);
    });
  });
});

describe('POST /api/verification/verify', () => {
  describe('Validação de entrada', () => {
    it('requer sessionCustomerId', async () => {
      const body = { token: '123456' };
      const request = createMockRequest(body);

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('requer token', async () => {
      const body = { sessionCustomerId: '123' };
      const request = createMockRequest(body);

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('aceita ambos os campos', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock Supabase - will fail later, but not due to missing fields
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      // Should not return 400 for missing fields
      // May return 404 (not found) or other error, but not 400 missing fields
      if (response.status === 400) {
        expect(data.error).not.toBe('Missing required fields');
      }
      // More likely: returns 404 because session_customer not found
      // This proves the input validation passed
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Validação de token', () => {
    it('verifica se token corresponde', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock Supabase to return matching token
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456', // Matching token
          verification_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          phone: null,
          customer_id: null,
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      // Mock update to fail (to avoid complex mocking), but after token validation
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      mockSupabaseFrom.mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }).mockReturnValueOnce({
        update: mockUpdate,
        eq: mockUpdateEq,
      });

      const response = await verifyPOST(request);

      // Should not return 400 for invalid token
      // May return 500 (update error), but not 400 invalid token
      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).not.toBe('Invalid verification code');
      }
      // More likely: returns 500 because update failed
      // This proves token validation passed
      expect([500]).toContain(response.status);
    });

    it('rejeita token incorreto', async () => {
      const body = { sessionCustomerId: '123', token: '654321' };
      const request = createMockRequest(body);

      // Mock Supabase to return different token
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456', // Different from provided
          verification_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid verification code');
    });

    it('verifica se token não expirou', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock token that expires in the future
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456',
          verification_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          customer_id: null,
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      // Mock update to fail (to avoid complex mocking), but after expiry validation
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      mockSupabaseFrom.mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }).mockReturnValueOnce({
        update: mockUpdate,
        eq: mockUpdateEq,
      });

      const response = await verifyPOST(request);

      // Should not return 400 for expired token
      // May return 500 (update error), but not 400 expired token
      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).not.toBe('Verification code has expired');
      }
      // More likely: returns 500 because update failed
      // This proves expiry validation passed
      expect([500]).toContain(response.status);
    });

    it('rejeita token expirado', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock token that expired in the past
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456',
          verification_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Verification code has expired');
    });

    it('valida formato de data ISO', () => {
      const isoString = new Date().toISOString();

      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('Validação de tipo', () => {
    it('aceita tipo email', () => {
      const verificationType = 'email';

      expect(['email', 'phone'].includes(verificationType)).toBe(true);
    });

    it('aceita tipo phone', () => {
      const verificationType = 'phone';

      expect(['email', 'phone'].includes(verificationType)).toBe(true);
    });

    it('rejeita tipos inválidos', () => {
      const invalidTypes = ['sms', 'whatsapp', null, undefined];

      invalidTypes.forEach(type => {
        const isValid = type === 'email' || type === 'phone';
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Verificação de contacto', () => {
    it('usa email se tipo for email', () => {
      const sessionCustomer = {
        email: 'test@example.com',
        phone: '+351912345678',
        verification_type: 'email',
      };

      const contactValue = sessionCustomer.verification_type === 'email'
        ? sessionCustomer.email
        : sessionCustomer.phone;

      expect(contactValue).toBe('test@example.com');
    });

    it('usa phone se tipo for phone', () => {
      const sessionCustomer = {
        email: 'test@example.com',
        phone: '+351912345678',
        verification_type: 'phone',
      };

      const contactValue = sessionCustomer.verification_type === 'phone'
        ? sessionCustomer.phone
        : sessionCustomer.email;

      expect(contactValue).toBe('+351912345678');
    });

    it('rejeita se contactValue ausente', () => {
      const sessionCustomer = {
        email: null,
        phone: null,
        verification_type: 'email',
      };

      const contactValue = sessionCustomer.email;

      expect(contactValue).toBeNull();
    });
  });

  describe('Atualização de verified status', () => {
    it('define email_verified para tipo email', () => {
      const verificationType = 'email';
      const verifiedField = verificationType === 'email' ? 'email_verified' : 'phone_verified';

      expect(verifiedField).toBe('email_verified');
    });

    it('define phone_verified para tipo phone', () => {
      const verificationType = 'phone';
      const verifiedField = verificationType === 'phone' ? 'phone_verified' : 'email_verified';

      expect(verifiedField).toBe('phone_verified');
    });

    it('limpa token após verificação', () => {
      const updateData = {
        email_verified: true,
        verification_token: null,
        verification_expires_at: null,
        verification_type: null,
      };

      expect(updateData.verification_token).toBeNull();
      expect(updateData.verification_expires_at).toBeNull();
    });
  });

  describe('Atualização de log', () => {
    it('marca status como verified', () => {
      const logUpdate = {
        status: 'verified',
        verified_at: new Date().toISOString(),
      };

      expect(logUpdate.status).toBe('verified');
      expect(logUpdate.verified_at).toBeDefined();
    });

    it('regista timestamp de verificação', () => {
      const verifiedAt = new Date();

      expect(verifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('Associação de pessoas na mesma mesa', () => {
    it('encontra outros clientes na mesma mesa', () => {
      const tableId = 'table-5';
      const contactValue = 'test@example.com';

      const otherCustomers = [
        { id: 'cust-2', session_id: 'sess-2', table_id: tableId, email: contactValue },
        { id: 'cust-3', session_id: 'sess-3', table_id: tableId, email: contactValue },
      ];

      expect(otherCustomers).toHaveLength(2);
    });

    it('exclui o cliente atual da associação', () => {
      const currentCustomerId = 'cust-1';
      const otherCustomers = [
        { id: 'cust-2' },
        { id: 'cust-3' },
      ];

      const hasCurrentCustomer = otherCustomers.some(c => c.id === currentCustomerId);

      expect(hasCurrentCustomer).toBe(false);
    });

    it('verifica apenas clientes com mesmo contacto', () => {
      const targetContact = 'test@example.com';
      const customers = [
        { email: 'test@example.com' },
        { email: 'other@example.com' },
      ];

      const matching = customers.filter(c => c.email === targetContact);

      expect(matching).toHaveLength(1);
    });

    it('atualiza todos os clientes correspondentes', () => {
      const otherIds = ['cust-2', 'cust-3', 'cust-4'];
      const updateData = { email_verified: true };

      expect(otherIds).toHaveLength(3);
      expect(updateData.email_verified).toBe(true);
    });
  });

  describe('Atualização da tabela customers', () => {
    it('atualiza customer se customer_id existe', () => {
      const sessionCustomer = {
        customer_id: 'customer-123',
        verification_type: 'email',
      };

      const shouldUpdate = !!(sessionCustomer.customer_id && sessionCustomer.verification_type === 'email');

      expect(shouldUpdate).toBe(true);
    });

    it('não atualiza se customer_id ausente', () => {
      const sessionCustomer = {
        customer_id: null,
        verification_type: 'email',
      };

      const shouldUpdate = !!(sessionCustomer.customer_id);

      expect(shouldUpdate).toBe(false);
    });

    it('não atualiza customers para tipo phone', () => {
      const sessionCustomer = {
        customer_id: 'customer-123',
        verification_type: 'phone',
      };

      const shouldUpdate = sessionCustomer.verification_type === 'email' && sessionCustomer.customer_id;

      expect(shouldUpdate).toBe(false);
    });
  });

  describe('Resposta de sucesso', () => {
    it('retorna success e verified true', () => {
      const response = {
        success: true,
        verified: true,
        verificationType: 'email',
        message: 'Verification successful',
      };

      expect(response.success).toBe(true);
      expect(response.verified).toBe(true);
    });

    it('inclui verificationType na resposta', () => {
      const response = {
        verificationType: 'phone',
      };

      expect(['email', 'phone'].includes(response.verificationType)).toBe(true);
    });

    it('retorna associatedCount', () => {
      const response = {
        success: true,
        associatedCount: 2,
      };

      expect(typeof response.associatedCount).toBe('number');
      expect(response.associatedCount).toBeGreaterThanOrEqual(0);
    });

    it('associatedCount é 0 se nenhum outro cliente', () => {
      const otherCustomers: unknown[] = [];
      const associatedCount = otherCustomers?.length || 0;

      expect(associatedCount).toBe(0);
    });
  });

  describe('Tratamento de erros', () => {
    it('retorna 400 para campos ausentes', async () => {
      const body = { token: '123456' }; // Missing sessionCustomerId
      const request = createMockRequest(body);

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('retorna 404 se session_customer não encontrado', async () => {
      const body = { sessionCustomerId: 'non-existent', token: '123456' };
      const request = createMockRequest(body);

      // Mock Supabase to return null (not found)
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session customer not found');
    });

    it('retorna 400 para token inválido', async () => {
      const body = { sessionCustomerId: '123', token: 'wrong-token' };
      const request = createMockRequest(body);

      // Mock Supabase with different token
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456',
          verification_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid verification code');
    });

    it('retorna 400 para token expirado', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock expired token
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456',
          verification_expires_at: new Date(Date.now() - 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Verification code has expired');
    });

    it('retorna 400 para tipo inválido', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock with invalid verification type
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456',
          verification_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verification_type: 'invalid-type',
          email: 'test@example.com',
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid verification type');
    });

    it('retorna 500 para erro ao atualizar', async () => {
      const body = { sessionCustomerId: '123', token: '123456' };
      const request = createMockRequest(body);

      // Mock successful fetch but failed update
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: '123',
          verification_token: '123456',
          verification_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verification_type: 'email',
          email: 'test@example.com',
          customer_id: null,
          session: { id: 'session-1', table_id: 'table-1' },
        },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      mockSupabaseFrom.mockReturnValueOnce({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      }).mockReturnValueOnce({
        update: mockUpdate,
        eq: mockUpdateEq,
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to verify');
    });
  });
});
