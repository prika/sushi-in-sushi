import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================
// MOCKS
// =============================================

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockCreateClient = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  })),
}));

// Suppress console output in tests
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

import {
  checkRateLimit,
  resetRateLimit,
  logAuthEvent,
  getAuthEventsForStaff,
  getFailedLoginAttempts,
  updateStaffLoginInfo,
  isAccountLocked,
  getSessionConfig,
  enrollMfa,
  verifyMfa,
  getMfaFactors,
  unenrollMfa,
  isMfaRequired,
  secureLogin,
} from '@/lib/auth/security';

// =============================================
// HELPERS
// =============================================

const createDefaultClient = () => ({
  rpc: mockRpc,
  from: mockFrom,
});

/**
 * Build a thenable chain mock for Supabase query builder.
 * The chain supports chaining .select().eq().order().limit().single()
 * and resolves via .then() to the provided value.
 */
const createChain = (resolvedValue: any) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: (fn: (v: any) => any) => Promise.resolve(resolvedValue).then(fn),
  };
  return chain;
};

// Mock supabase client for MFA tests (passed directly to functions)
const createMockSupabase = () => ({
  auth: {
    mfa: {
      enroll: vi.fn(),
      challenge: vi.fn(),
      verify: vi.fn(),
      listFactors: vi.fn(),
      unenroll: vi.fn(),
      getAuthenticatorAssuranceLevel: vi.fn(),
    },
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
});

// =============================================
// SETUP
// =============================================

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockResolvedValue(createDefaultClient());
});

// =============================================
// checkRateLimit
// =============================================

describe('checkRateLimit', () => {
  it('should bypass rate limit for 127.0.0.1', async () => {
    const result = await checkRateLimit('127.0.0.1', 'ip');

    expect(result.allowed).toBe(true);
    expect(result.attemptsRemaining).toBe(5);
    expect(result.blockedUntil).toBeNull();
    expect(result.currentAttempts).toBe(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should bypass rate limit for ::1', async () => {
    const result = await checkRateLimit('::1', 'ip');

    expect(result.allowed).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should call rpc with correct params for normal IP', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          allowed: true,
          attempts_remaining: 3,
          blocked_until: null,
          current_attempts: 2,
        },
      ],
      error: null,
    });

    const result = await checkRateLimit('192.168.1.1', 'ip', {
      maxAttempts: 10,
      windowMinutes: 20,
      blockMinutes: 45,
    });

    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
      p_identifier: '192.168.1.1',
      p_identifier_type: 'ip',
      p_max_attempts: 10,
      p_window_minutes: 20,
      p_block_minutes: 45,
    });
    expect(result.allowed).toBe(true);
    expect(result.attemptsRemaining).toBe(3);
    expect(result.currentAttempts).toBe(2);
  });

  it('should map RPC data correctly including blockedUntil date', async () => {
    const blockedDate = '2026-02-20T15:00:00Z';
    mockRpc.mockResolvedValue({
      data: [
        {
          allowed: false,
          attempts_remaining: 0,
          blocked_until: blockedDate,
          current_attempts: 5,
        },
      ],
      error: null,
    });

    const result = await checkRateLimit('10.0.0.1', 'ip');

    expect(result.allowed).toBe(false);
    expect(result.attemptsRemaining).toBe(0);
    expect(result.blockedUntil).toEqual(new Date(blockedDate));
    expect(result.currentAttempts).toBe(5);
  });

  it('should fail open when RPC returns error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function not found' },
    });

    const result = await checkRateLimit('10.0.0.1', 'ip');

    expect(result.allowed).toBe(true);
    expect(result.attemptsRemaining).toBe(5);
    expect(result.blockedUntil).toBeNull();
    expect(result.currentAttempts).toBe(0);
  });

  it('should fail open when RPC throws exception', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'));

    const result = await checkRateLimit('10.0.0.1', 'ip');

    expect(result.allowed).toBe(true);
    expect(result.attemptsRemaining).toBe(5);
  });
});

// =============================================
// resetRateLimit
// =============================================

describe('resetRateLimit', () => {
  it('should call rpc with correct params', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await resetRateLimit('test@email.com', 'email');

    expect(mockRpc).toHaveBeenCalledWith('reset_rate_limit', {
      p_identifier: 'test@email.com',
      p_identifier_type: 'email',
    });
  });

  it('should silently ignore errors', async () => {
    mockRpc.mockRejectedValue(new Error('rpc error'));

    // Should not throw
    await expect(resetRateLimit('192.168.1.1', 'ip')).resolves.toBeUndefined();
  });
});

// =============================================
// logAuthEvent
// =============================================

describe('logAuthEvent', () => {
  it('should call rpc with mapped params and return event ID', async () => {
    mockRpc.mockResolvedValue({ data: 'event-uuid-456', error: null });

    const result = await logAuthEvent({
      eventType: 'login_success',
      staffId: 'staff-1',
      authUserId: 'auth-1',
      email: 'test@test.com',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { browser: 'Chrome' },
      success: true,
      errorMessage: null as unknown as string | undefined,
    });

    expect(mockRpc).toHaveBeenCalledWith('log_auth_event', {
      p_event_type: 'login_success',
      p_staff_id: 'staff-1',
      p_auth_user_id: 'auth-1',
      p_email: 'test@test.com',
      p_ip_address: '10.0.0.1',
      p_user_agent: 'Mozilla/5.0',
      p_metadata: { browser: 'Chrome' },
      p_success: true,
      p_error_message: null,
    });
    expect(result).toBe('event-uuid-456');
  });

  it('should return null on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'table not found' } });

    const result = await logAuthEvent({
      eventType: 'login_failed',
      email: 'fail@test.com',
      success: false,
    });

    expect(result).toBeNull();
  });

  it('should return null on exception', async () => {
    mockRpc.mockRejectedValue(new Error('network failure'));

    const result = await logAuthEvent({
      eventType: 'logout',
      staffId: 'staff-1',
    });

    expect(result).toBeNull();
  });
});

// =============================================
// getAuthEventsForStaff
// =============================================

describe('getAuthEventsForStaff', () => {
  it('should return audit log entries from DB', async () => {
    const entries = [
      { id: '1', event_type: 'login_success', staff_id: 's1', created_at: '2026-02-20T10:00:00Z' },
      { id: '2', event_type: 'logout', staff_id: 's1', created_at: '2026-02-20T11:00:00Z' },
    ];
    const chain = createChain({ data: entries, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getAuthEventsForStaff('s1', 10);

    expect(mockFrom).toHaveBeenCalledWith('auth_audit_log');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('staff_id', 's1');
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual(entries);
  });

  it('should return empty array on error', async () => {
    const chain = createChain({ data: null, error: { message: 'table not found' } });
    mockFrom.mockReturnValue(chain);

    const result = await getAuthEventsForStaff('s1');

    expect(result).toEqual([]);
  });
});

// =============================================
// getFailedLoginAttempts
// =============================================

describe('getFailedLoginAttempts', () => {
  it('should return count from DB', async () => {
    const chain = createChain({ count: 7, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getFailedLoginAttempts('test@test.com', 30);

    expect(mockFrom).toHaveBeenCalledWith('auth_audit_log');
    expect(chain.eq).toHaveBeenCalledWith('email', 'test@test.com');
    expect(chain.eq).toHaveBeenCalledWith('event_type', 'login_failed');
    expect(result).toBe(7);
  });

  it('should return 0 on error', async () => {
    const chain = createChain({ count: null, error: { message: 'table missing' } });
    mockFrom.mockReturnValue(chain);

    const result = await getFailedLoginAttempts('test@test.com');

    expect(result).toBe(0);
  });
});

// =============================================
// updateStaffLoginInfo
// =============================================

describe('updateStaffLoginInfo', () => {
  it('should call rpc and return isNewIp from data', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await updateStaffLoginInfo('staff-1', '192.168.1.100', true);

    expect(mockRpc).toHaveBeenCalledWith('update_staff_login_info', {
      p_staff_id: 'staff-1',
      p_ip_address: '192.168.1.100',
      p_success: true,
    });
    expect(result).toEqual({ isNewIp: true });
  });

  it('should return isNewIp: false on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'error' } });

    const result = await updateStaffLoginInfo('staff-1', null);

    expect(result).toEqual({ isNewIp: false });
  });
});

// =============================================
// isAccountLocked
// =============================================

describe('isAccountLocked', () => {
  it('should return locked: true when locked_until is in the future', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const chain = createChain({ data: { locked_until: futureDate }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await isAccountLocked('staff-1');

    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toEqual(new Date(futureDate));
  });

  it('should return locked: false when locked_until is in the past', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const chain = createChain({ data: { locked_until: pastDate }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await isAccountLocked('staff-1');

    expect(result.locked).toBe(false);
    expect(result.lockedUntil).toEqual(new Date(pastDate));
  });

  it('should return locked: false when no data or error', async () => {
    const chain = createChain({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(chain);

    const result = await isAccountLocked('staff-1');

    expect(result.locked).toBe(false);
    expect(result.lockedUntil).toBeNull();
  });
});

// =============================================
// getSessionConfig
// =============================================

describe('getSessionConfig', () => {
  it('should return mapped config from DB', async () => {
    const dbRow = {
      session_timeout_minutes: 120,
      inactivity_timeout_minutes: 30,
      require_mfa: true,
      max_concurrent_sessions: 1,
    };
    const chain = createChain({ data: dbRow, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getSessionConfig('admin');

    expect(mockFrom).toHaveBeenCalledWith('auth_session_config');
    expect(chain.eq).toHaveBeenCalledWith('role_name', 'admin');
    expect(result).toEqual({
      sessionTimeoutMinutes: 120,
      inactivityTimeoutMinutes: 30,
      requireMfa: true,
      maxConcurrentSessions: 1,
    });
  });

  it('should return DEFAULT_SESSION_CONFIG on error', async () => {
    const chain = createChain({ data: null, error: { message: 'table not found' } });
    mockFrom.mockReturnValue(chain);

    const result = await getSessionConfig('waiter');

    expect(result).toEqual({
      sessionTimeoutMinutes: 480,
      inactivityTimeoutMinutes: 60,
      requireMfa: false,
      maxConcurrentSessions: 3,
    });
  });
});

// =============================================
// MFA Functions
// =============================================

describe('enrollMfa', () => {
  it('should return qrCode and secret on success', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.enroll.mockResolvedValue({
      data: {
        totp: {
          qr_code: 'data:image/svg+xml;base64,abc',
          secret: 'JBSWY3DPEHPK3PXP',
        },
      },
      error: null,
    });

    const result = await enrollMfa(mockSupabase as any);

    expect(result.success).toBe(true);
    expect(result.qrCode).toBe('data:image/svg+xml;base64,abc');
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(mockSupabase.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Sushi in Sushi Authenticator',
    });
  });

  it('should return success: false on enroll error', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.enroll.mockResolvedValue({
      data: null,
      error: { message: 'MFA not available' },
    });

    const result = await enrollMfa(mockSupabase as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('MFA not available');
  });
});

describe('verifyMfa', () => {
  it('should return success: true when challenge and verify succeed', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.challenge.mockResolvedValue({
      data: { id: 'challenge-123' },
      error: null,
    });
    mockSupabase.auth.mfa.verify.mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await verifyMfa(mockSupabase as any, 'factor-1', '123456');

    expect(result.success).toBe(true);
    expect(mockSupabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' });
    expect(mockSupabase.auth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-123',
      code: '123456',
    });
  });

  it('should return error when challenge fails', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.challenge.mockResolvedValue({
      data: null,
      error: { message: 'Challenge failed' },
    });

    const result = await verifyMfa(mockSupabase as any, 'factor-1', '123456');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Challenge failed');
    expect(mockSupabase.auth.mfa.verify).not.toHaveBeenCalled();
  });
});

describe('getMfaFactors', () => {
  it('should map factors correctly', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [
          { id: 'f1', factor_type: 'totp', friendly_name: 'My Auth' },
          { id: 'f2', factor_type: 'totp', friendly_name: null },
        ],
      },
      error: null,
    });

    const result = await getMfaFactors(mockSupabase as any);

    expect(result).toEqual([
      { id: 'f1', type: 'totp', friendlyName: 'My Auth' },
      { id: 'f2', type: 'totp', friendlyName: undefined },
    ]);
  });
});

describe('unenrollMfa', () => {
  it('should return success: true on successful unenroll', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.unenroll.mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await unenrollMfa(mockSupabase as any, 'factor-1');

    expect(result.success).toBe(true);
    expect(mockSupabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'factor-1' });
  });
});

describe('isMfaRequired', () => {
  it('should return true when nextLevel is aal2 and currentLevel is not aal2', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    });

    const result = await isMfaRequired(mockSupabase as any);

    expect(result).toBe(true);
  });

  it('should return false when currentLevel is already aal2', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    });

    const result = await isMfaRequired(mockSupabase as any);

    expect(result).toBe(false);
  });

  it('should return false on error', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: null,
      error: { message: 'MFA not available' },
    });

    const result = await isMfaRequired(mockSupabase as any);

    expect(result).toBe(false);
  });
});

// =============================================
// secureLogin
// =============================================

describe('secureLogin', () => {
  /**
   * For secureLogin, we need to control how the internal calls to
   * checkRateLimit, isAccountLocked, updateStaffLoginInfo, resetRateLimit,
   * logAuthEvent, isMfaRequired, and getMfaFactors behave.
   *
   * These all call createClient() internally, so we control behavior via
   * mockRpc and mockFrom responses. The supabase arg to secureLogin is used
   * for auth.signInWithPassword, auth.signOut, and MFA functions.
   */

  const mockSupabase = createMockSupabase();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: createClient resolves to our mock with rpc + from
    mockCreateClient.mockResolvedValue(createDefaultClient());
  });

  it('should return rateLimited when IP rate limit is blocked', async () => {
    const blockedDate = new Date(Date.now() + 60 * 60 * 1000);

    // checkRateLimit for IP returns not allowed
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          allowed: false,
          attempts_remaining: 0,
          blocked_until: blockedDate.toISOString(),
          current_attempts: 5,
        },
      ],
      error: null,
    });

    // logAuthEvent rpc call (for rate-limited event)
    mockRpc.mockResolvedValueOnce({ data: 'event-1', error: null });

    const result = await secureLogin(mockSupabase as any, {
      email: 'test@test.com',
      password: 'pass',
      ipAddress: '10.0.0.1',
    });

    expect(result.success).toBe(false);
    expect(result.rateLimited).toBe(true);
    expect(result.error).toContain('Demasiadas tentativas');
  });

  it('should return rateLimited when email rate limit is blocked', async () => {
    // First rpc call: checkRateLimit for IP => allowed
    mockRpc.mockResolvedValueOnce({
      data: [{ allowed: true, attempts_remaining: 4, blocked_until: null, current_attempts: 1 }],
      error: null,
    });

    // Second rpc call: checkRateLimit for email => blocked
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          allowed: false,
          attempts_remaining: 0,
          blocked_until: new Date(Date.now() + 3600000).toISOString(),
          current_attempts: 10,
        },
      ],
      error: null,
    });

    // Third rpc call: logAuthEvent
    mockRpc.mockResolvedValueOnce({ data: 'event-2', error: null });

    const result = await secureLogin(mockSupabase as any, {
      email: 'test@test.com',
      password: 'pass',
      ipAddress: '10.0.0.1',
    });

    expect(result.success).toBe(false);
    expect(result.rateLimited).toBe(true);
    expect(result.error).toContain('email');
  });

  it('should return error when auth signIn fails', async () => {
    // checkRateLimit IP => allowed (via fail-open since we pass localhost)
    // checkRateLimit email => allowed (fail-open)
    mockRpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    // signInWithPassword fails
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    });

    const result = await secureLogin(mockSupabase as any, {
      email: 'bad@test.com',
      password: 'wrong',
      ipAddress: '127.0.0.1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Credenciais inválidas');
  });

  it('should sign out and return error when no staff record found', async () => {
    // Rate limit checks: fail open
    mockRpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    // Auth succeeds
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-1' }, session: {} },
      error: null,
    });

    // Admin client staff query returns no staff
    const staffChain = createChain({ data: null, error: { message: 'No rows' } });
    mockAdminFrom.mockReturnValue(staffChain);

    // signOut
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const result = await secureLogin(mockSupabase as any, {
      email: 'nostaff@test.com',
      password: 'pass123',
      ipAddress: '127.0.0.1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('staff');
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should sign out and return error when account is locked', async () => {
    // Rate limit checks: fail open
    mockRpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    // Auth succeeds
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-2' }, session: {} },
      error: null,
    });

    // Admin client staff query returns staff
    const staffChain = createChain({
      data: {
        id: 'staff-locked',
        name: 'Locked User',
        email: 'locked@test.com',
        location: null,
        role_id: 1,
        roles: { name: 'admin' },
      },
      error: null,
    });
    mockAdminFrom.mockReturnValue(staffChain);

    // isAccountLocked: from('staff') returns locked_until in the future
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const lockedChain = createChain({ data: { locked_until: futureDate }, error: null });
    mockFrom.mockReturnValue(lockedChain);

    // signOut
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const result = await secureLogin(mockSupabase as any, {
      email: 'locked@test.com',
      password: 'pass123',
      ipAddress: '127.0.0.1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('bloqueada');
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should return success with user data on happy path', async () => {
    // All rate limit / rpc calls: fail open (rate limiting not configured)
    mockRpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });

    // Auth succeeds
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-3' }, session: {} },
      error: null,
    });

    // Admin client staff query returns staff
    const staffChain = createChain({
      data: {
        id: 'staff-success',
        name: 'Chef Success',
        email: 'chef@test.com',
        location: 'circunvalacao',
        role_id: 1,
        roles: { name: 'admin' },
      },
      error: null,
    });
    mockAdminFrom.mockReturnValue(staffChain);

    // isAccountLocked: from('staff') returns no locked_until
    const notLockedChain = createChain({ data: { locked_until: null }, error: null });
    mockFrom.mockReturnValue(notLockedChain);

    // isMfaRequired returns false (via error, fail to false)
    mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal1' },
      error: null,
    });

    const result = await secureLogin(mockSupabase as any, {
      email: 'chef@test.com',
      password: 'correct-pass',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
    });

    expect(result.success).toBe(true);
    expect(result.user).toEqual({
      id: 'staff-success',
      email: 'chef@test.com',
      name: 'Chef Success',
      role: 'admin',
      location: 'circunvalacao',
    });
    expect(result.requiresMfa).toBe(false);
  });
});
