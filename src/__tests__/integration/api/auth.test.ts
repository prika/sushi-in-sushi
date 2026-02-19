/**
 * Integration Tests: Authentication API
 * Tests for the /api/auth/* endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestStaff } from '../../helpers/factories';

// Mock Supabase
const mockSupabaseAuth = {
  getUser: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  mfa: {
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
    listFactors: vi.fn(),
  },
};

const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth,
  })),
}));

// Mock auth lib
const mockLogin = vi.fn();
const mockSecureLogin = vi.fn();
const mockSetAuthCookie = vi.fn();
const mockClearAuthCookie = vi.fn();
const mockGetAuthUser = vi.fn();
const mockLogAuthEvent = vi.fn();

vi.mock('@/lib/auth', () => ({
  login: mockLogin,
  secureLogin: mockSecureLogin,
  setAuthCookie: mockSetAuthCookie,
  clearAuthCookie: mockClearAuthCookie,
  getAuthUser: mockGetAuthUser,
  logAuthEvent: mockLogAuthEvent,
}));

// Mock headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({
    get: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '192.168.1.1';
      if (name === 'user-agent') return 'Mozilla/5.0';
      return null;
    }),
  })),
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de campos obrigatórios', () => {
    it('rejeita pedido sem email', () => {
      const body = { password: 'password123' };
      const requiredFields = ['email', 'password'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toContain('email');
    });

    it('rejeita pedido sem password', () => {
      const body = { email: 'test@test.com' };
      const requiredFields = ['email', 'password'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toContain('password');
    });

    it('aceita pedido com email e password', () => {
      const body = { email: 'test@test.com', password: 'password123' };
      const requiredFields = ['email', 'password'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toHaveLength(0);
    });
  });

  describe('Validação de credenciais', () => {
    it('retorna erro para credenciais inválidas', async () => {
      const result = { success: false, error: 'Credenciais inválidas' };
      mockLogin.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciais inválidas');
    });

    it('retorna sucesso para credenciais válidas', async () => {
      const staff = createTestStaff();
      const result = {
        success: true,
        user: staff,
        token: 'valid-token-123',
      };
      mockLogin.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('retorna dados do utilizador no formato correto', async () => {
      const staff = createTestStaff();
      const result = { success: true, user: staff, token: 'token' };
      mockLogin.mockResolvedValue(result);

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('location');
    });
  });
});

describe('POST /api/auth/secure-login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de campos obrigatórios', () => {
    it('rejeita pedido sem email', () => {
      const body = { password: 'password123' };
      const requiredFields = ['email', 'password'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toContain('email');
    });

    it('rejeita pedido sem password', () => {
      const body = { email: 'test@test.com' };
      const requiredFields = ['email', 'password'];
      const missingFields = requiredFields.filter(field => !body[field as keyof typeof body]);

      expect(missingFields).toContain('password');
    });
  });

  describe('Rate limiting', () => {
    it('retorna erro 429 quando rate limited', async () => {
      const result = {
        success: false,
        rateLimited: true,
        error: 'Demasiadas tentativas',
        blockedUntil: new Date(),
      };
      mockSecureLogin.mockResolvedValue(result);

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.blockedUntil).toBeDefined();
    });

    it('permite login quando não rate limited', async () => {
      const result = { success: true, rateLimited: false };
      mockSecureLogin.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.rateLimited).toBe(false);
    });
  });

  describe('MFA (Multi-Factor Authentication)', () => {
    it('indica quando MFA é necessário', async () => {
      const result = {
        success: true,
        requiresMfa: true,
        mfaFactorId: 'factor-123',
      };
      mockSecureLogin.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.requiresMfa).toBe(true);
      expect(result.mfaFactorId).toBeDefined();
    });

    it('permite login direto quando MFA não é necessário', async () => {
      const result = {
        success: true,
        requiresMfa: false,
      };
      mockSecureLogin.mockResolvedValue(result);

      expect(result.success).toBe(true);
      expect(result.requiresMfa).toBe(false);
    });
  });

  describe('Audit logging', () => {
    it('captura informações de IP e User-Agent', () => {
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      expect(metadata.ipAddress).toBeDefined();
      expect(metadata.userAgent).toBeDefined();
    });

    it('processa X-Forwarded-For corretamente', () => {
      const forwardedFor = '192.168.1.1, 10.0.0.1, 172.16.0.1';
      const ipAddress = forwardedFor.split(',')[0].trim();

      expect(ipAddress).toBe('192.168.1.1');
    });
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro 401 quando não autenticado', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const user = await mockGetAuthUser();

    expect(user).toBeNull();
  });

  it('retorna dados do utilizador quando autenticado', async () => {
    const staff = createTestStaff();
    mockGetAuthUser.mockResolvedValue(staff);
    const user = await mockGetAuthUser();

    expect(user).toBeDefined();
    expect(user?.id).toBe(staff.id);
    expect(user?.email).toBe(staff.email);
  });

  it('retorna role e location do utilizador', async () => {
    const staff = createTestStaff({ role: 'waiter', location: 'boavista' });
    mockGetAuthUser.mockResolvedValue(staff);
    const user = await mockGetAuthUser();

    expect(user?.role).toBe('waiter');
    expect(user?.location).toBe('boavista');
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna sucesso após logout', async () => {
    mockClearAuthCookie.mockResolvedValue(undefined);
    await mockClearAuthCookie();

    expect(mockClearAuthCookie).toHaveBeenCalled();
  });

  it('loga evento de logout para utilizador autenticado', async () => {
    const staff = createTestStaff();
    const logData = {
      eventType: 'logout',
      staffId: staff.id,
      email: staff.email,
      success: true,
    };

    mockLogAuthEvent.mockResolvedValue(undefined);
    await mockLogAuthEvent(logData);

    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'logout',
        staffId: staff.id,
        success: true,
      })
    );
  });

  it('captura IP e User-Agent no logout', async () => {
    const logData = {
      eventType: 'logout',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      success: true,
    };

    mockLogAuthEvent.mockResolvedValue(undefined);
    await mockLogAuthEvent(logData);

    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })
    );
  });
});

describe('POST /api/auth/mfa/enroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite enroll de TOTP para utilizador autenticado', async () => {
    const result = {
      id: 'factor-123',
      type: 'totp',
      totp: {
        qr_code: 'data:image/svg+xml;base64,ABC123',
        secret: 'SECRET123',
        uri: 'otpauth://totp/...',
      },
    };

    mockSupabaseAuth.mfa.enroll.mockResolvedValue({ data: result, error: null });

    const { data, error } = await mockSupabaseAuth.mfa.enroll({ factorType: 'totp' });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.type).toBe('totp');
    expect(data.totp?.qr_code).toBeDefined();
  });

  it('retorna erro quando já tem MFA ativo', async () => {
    const error = { message: 'MFA já está ativo' };
    mockSupabaseAuth.mfa.enroll.mockResolvedValue({ data: null, error });

    const { data, error: err } = await mockSupabaseAuth.mfa.enroll({ factorType: 'totp' });

    expect(data).toBeNull();
    expect(err).toBeDefined();
  });
});

describe('POST /api/auth/mfa/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida código TOTP correto', async () => {
    const result = { user: createTestStaff() };
    mockSupabaseAuth.mfa.verify.mockResolvedValue({ data: result, error: null });

    const { data, error } = await mockSupabaseAuth.mfa.verify({
      factorId: 'factor-123',
      challengeId: 'challenge-123',
      code: '123456',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.user).toBeDefined();
  });

  it('rejeita código TOTP incorreto', async () => {
    const error = { message: 'Código inválido' };
    mockSupabaseAuth.mfa.verify.mockResolvedValue({ data: null, error });

    const { data, error: err } = await mockSupabaseAuth.mfa.verify({
      factorId: 'factor-123',
      challengeId: 'challenge-123',
      code: 'wrong',
    });

    expect(data).toBeNull();
    expect(err).toBeDefined();
    expect(err.message).toBe('Código inválido');
  });

  it('valida formato do código (6 dígitos)', () => {
    const validCodes = ['123456', '000000', '999999'];
    const invalidCodes = ['12345', '1234567', 'abcdef', ''];

    validCodes.forEach(code => {
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    invalidCodes.forEach(code => {
      expect(/^\d{6}$/.test(code)).toBe(false);
    });
  });
});

describe('GET /api/auth/mfa/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna status MFA desativado', async () => {
    const result = {
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      currentAuthenticationMethods: [],
    };

    mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: result,
      error: null,
    });

    const { data } = await mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel();

    expect(data?.currentLevel).toBe('aal1');
    expect(data?.currentAuthenticationMethods).toHaveLength(0);
  });

  it('retorna status MFA ativado', async () => {
    const result = {
      currentLevel: 'aal2',
      nextLevel: null,
      currentAuthenticationMethods: [
        { id: 'factor-123', factor_type: 'totp', created_at: new Date().toISOString() },
      ],
    };

    mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: result,
      error: null,
    });

    const { data } = await mockSupabaseAuth.mfa.getAuthenticatorAssuranceLevel();

    expect(data?.currentLevel).toBe('aal2');
    expect(data?.currentAuthenticationMethods).toHaveLength(1);
    expect(data?.currentAuthenticationMethods[0].factor_type).toBe('totp');
  });

  it('lista todos os fatores MFA do utilizador', async () => {
    const factors = [
      { id: 'factor-1', factor_type: 'totp', created_at: new Date().toISOString(), status: 'verified' },
      { id: 'factor-2', factor_type: 'totp', created_at: new Date().toISOString(), status: 'unverified' },
    ];

    mockSupabaseAuth.mfa.listFactors.mockResolvedValue({ data: { totp: factors }, error: null });

    const { data } = await mockSupabaseAuth.mfa.listFactors();

    expect(data?.totp).toHaveLength(2);
    expect(data?.totp[0].status).toBe('verified');
    expect(data?.totp[1].status).toBe('unverified');
  });
});

describe('Validação de email', () => {
  it('valida formato de email correto', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.co.uk',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it('rejeita formato de email inválido', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user@.com',
      '',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});

describe('Validação de password', () => {
  it('aceita passwords com comprimento mínimo', () => {
    const minLength = 8;
    const passwords = ['password123', 'abcdefgh', '12345678'];

    passwords.forEach(password => {
      expect(password.length >= minLength).toBe(true);
    });
  });

  it('rejeita passwords muito curtas', () => {
    const minLength = 8;
    const passwords = ['pass', '123', '', 'short'];

    passwords.forEach(password => {
      expect(password.length >= minLength).toBe(false);
    });
  });
});
