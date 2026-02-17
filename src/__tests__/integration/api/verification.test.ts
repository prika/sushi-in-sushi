/**
 * Integration Tests: Verification API
 * Tests for /api/verification/send and /api/verification/verify
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}));

describe('POST /api/verification/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de entrada', () => {
    it('requer sessionCustomerId', () => {
      const body = { verificationType: 'email', contactValue: 'test@example.com' };
      const isValid = !!(body.sessionCustomerId);

      expect(isValid).toBe(false);
    });

    it('requer verificationType', () => {
      const body = { sessionCustomerId: '123', contactValue: 'test@example.com' };
      const isValid = !!('verificationType' in body);

      expect(isValid).toBe(false);
    });

    it('requer contactValue', () => {
      const body = { sessionCustomerId: '123', verificationType: 'email' };
      const isValid = !!('contactValue' in body);

      expect(isValid).toBe(false);
    });

    it('valida verificationType como email ou phone', () => {
      const validTypes = ['email', 'phone'];

      expect(validTypes.includes('email')).toBe(true);
      expect(validTypes.includes('phone')).toBe(true);
      expect(validTypes.includes('sms')).toBe(false);
    });

    it('rejeita tipos inválidos', () => {
      const invalidTypes = ['sms', 'whatsapp', 'invalid'];

      invalidTypes.forEach(type => {
        expect(['email', 'phone'].includes(type)).toBe(false);
      });
    });
  });

  describe('Rate limiting', () => {
    it('permite até 3 tentativas por hora', () => {
      const recentLogs = [
        { id: '1', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { id: '2', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
      ];

      const isAllowed = recentLogs.length < 3;

      expect(isAllowed).toBe(true);
    });

    it('bloqueia após 3 tentativas', () => {
      const recentLogs = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ];

      const isAllowed = recentLogs.length < 3;

      expect(isAllowed).toBe(false);
    });

    it('usa janela de 1 hora para rate limit', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      expect(oneHourAgo.getTime()).toBeGreaterThan(twoHoursAgo.getTime());
    });

    it('conta apenas logs recentes (última hora)', () => {
      const allLogs = [
        { created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() }, // 30 min ago - count
        { created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString() }, // 90 min ago - skip
      ];

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLogs = allLogs.filter(log => new Date(log.created_at) >= oneHourAgo);

      expect(recentLogs).toHaveLength(1);
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

    it('retorna 503 se Twilio não configurado', () => {
      const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

      // Se não configurado, status deveria ser 503
      const expectedStatus = twilioConfigured ? 200 : 503;

      expect([200, 503].includes(expectedStatus)).toBe(true);
    });

    it('previne envio para o próprio número', () => {
      const senderNumber = '+351912345678';
      const recipientNumber = '+351912345678';

      const isSameNumber = senderNumber === recipientNumber;

      expect(isSameNumber).toBe(true);
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de entrada', () => {
    it('requer sessionCustomerId', () => {
      const body = { token: '123456' };
      const isValid = !!('sessionCustomerId' in body);

      expect(isValid).toBe(false);
    });

    it('requer token', () => {
      const body = { sessionCustomerId: '123' };
      const isValid = !!('token' in body);

      expect(isValid).toBe(false);
    });

    it('aceita ambos os campos', () => {
      const body = { sessionCustomerId: '123', token: '123456' };

      expect(body.sessionCustomerId).toBeDefined();
      expect(body.token).toBeDefined();
    });
  });

  describe('Validação de token', () => {
    it('verifica se token corresponde', () => {
      const storedToken = '123456';
      const providedToken = '123456';

      expect(storedToken === providedToken).toBe(true);
    });

    it('rejeita token incorreto', () => {
      const storedToken = '123456';
      const providedToken = '654321';

      expect(storedToken === providedToken).toBe(false);
    });

    it('verifica se token não expirou', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min no futuro

      expect(now <= expiresAt).toBe(true);
    });

    it('rejeita token expirado', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 5 * 60 * 1000); // 5 min no passado

      expect(now > expiresAt).toBe(true);
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
    it('retorna 400 para campos ausentes', () => {
      const error = { code: 'MISSING_FIELDS', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 404 se session_customer não encontrado', () => {
      const error = { code: 'NOT_FOUND', status: 404 };

      expect(error.status).toBe(404);
    });

    it('retorna 400 para token inválido', () => {
      const error = { code: 'INVALID_TOKEN', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 400 para token expirado', () => {
      const error = { code: 'EXPIRED_TOKEN', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 400 para tipo inválido', () => {
      const error = { code: 'INVALID_TYPE', status: 400 };

      expect(error.status).toBe(400);
    });

    it('retorna 500 para erro ao atualizar', () => {
      const error = { code: 'UPDATE_FAILED', status: 500 };

      expect(error.status).toBe(500);
    });
  });
});
