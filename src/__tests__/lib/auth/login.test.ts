import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock createAdminClient (sync, not async)
const mockFrom = vi.fn();
const mockAdminClient = { from: mockFrom };
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

const mockVerifyPassword = vi.fn();
vi.mock('@/lib/auth/password', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

const mockCreateToken = vi.fn();
vi.mock('@/lib/auth/token', () => ({
  createToken: (...args: unknown[]) => mockCreateToken(...args),
}));

const mockLogActivity = vi.fn();
vi.mock('@/lib/auth/activity', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

import { login } from '@/lib/auth/login';

// Suppress console output in tests
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Helper: build a thenable chain mock for Supabase query builder
const createChain = (resolvedValue: any) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (fn: (v: any) => any) => Promise.resolve(resolvedValue).then(fn),
  };
  return chain;
};

// Sample staff record returned from DB
const makeStaff = (overrides: Record<string, any> = {}) => ({
  id: 'staff-uuid-123',
  email: 'chef@sushinsushi.pt',
  name: 'Chef Tanaka',
  password_hash: 'hashed-password',
  location: 'circunvalacao',
  is_active: true,
  role: { id: 1, name: 'admin' },
  ...overrides,
});

describe('login()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateToken.mockResolvedValue('mock-token');
    mockLogActivity.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------
  // 1. DB auth success
  // -------------------------------------------------------
  it('should return success when DB staff found and password correct', async () => {
    const staff = makeStaff();
    const queryChain = createChain({ data: staff, error: null });
    const updateChain = createChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return queryChain;
      return updateChain;
    });

    mockVerifyPassword.mockReturnValue(true);

    const result = await login('chef@sushinsushi.pt', 'correct-password');

    expect(result.success).toBe(true);
    expect(result.user).toEqual({
      id: 'staff-uuid-123',
      email: 'chef@sushinsushi.pt',
      name: 'Chef Tanaka',
      role: 'admin',
      location: 'circunvalacao',
    });
    expect(result.token).toBe('mock-token');
    expect(mockVerifyPassword).toHaveBeenCalledWith('correct-password', 'hashed-password');
  });

  // -------------------------------------------------------
  // 2. DB auth - password wrong in production
  // -------------------------------------------------------
  it('should return error when password is wrong and NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const staff = makeStaff({ email: 'admin@sushinsushi.pt' });
    const queryChain = createChain({ data: staff, error: null });
    mockFrom.mockReturnValue(queryChain);
    mockVerifyPassword.mockReturnValue(false);

    const result = await login('admin@sushinsushi.pt', 'wrong-password');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Credenciais inválidas');
  });

  // -------------------------------------------------------
  // 3. DB auth - password wrong, fallback succeeds (non-prod)
  // -------------------------------------------------------
  it('should fallback to env credentials when password wrong in non-production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ADMIN_PASSWORD', 'admin123');

    const staff = makeStaff({ id: 'real-staff-id', email: 'admin@sushinsushi.pt' });
    const queryChain = createChain({ data: staff, error: null });
    mockFrom.mockReturnValue(queryChain);
    mockVerifyPassword.mockReturnValue(false);

    const result = await login('admin@sushinsushi.pt', 'admin123');

    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('real-staff-id');
    expect(result.user?.role).toBe('admin');
    expect(result.token).toBe('mock-token');
  });

  // -------------------------------------------------------
  // 4. DB auth - role missing (null)
  // -------------------------------------------------------
  it('should return configuration error when staff.role is null', async () => {
    const staff = makeStaff({ role: null });
    const queryChain = createChain({ data: staff, error: null });
    const updateChain = createChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return queryChain;
      return updateChain;
    });

    mockVerifyPassword.mockReturnValue(true);

    const result = await login('chef@sushinsushi.pt', 'correct-password');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro de configuração do utilizador');
  });

  // -------------------------------------------------------
  // 5. DB auth - role.name missing (falsy)
  // -------------------------------------------------------
  it('should return configuration error when staff.role.name is falsy', async () => {
    const staff = makeStaff({ role: { id: 1, name: '' } });
    const queryChain = createChain({ data: staff, error: null });
    mockFrom.mockReturnValue(queryChain);
    mockVerifyPassword.mockReturnValue(true);

    const result = await login('chef@sushinsushi.pt', 'correct-password');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro de configuração do utilizador');
  });

  // -------------------------------------------------------
  // 6. Last login update
  // -------------------------------------------------------
  it('should call supabase to update last_login on success', async () => {
    const staff = makeStaff();
    const queryChain = createChain({ data: staff, error: null });
    const updateChain = createChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return queryChain;
      return updateChain;
    });

    mockVerifyPassword.mockReturnValue(true);

    await login('chef@sushinsushi.pt', 'correct-password');

    // Second from() call should be for 'staff' update
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'staff');
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_login: expect.any(String) })
    );
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'staff-uuid-123');
  });

  // -------------------------------------------------------
  // 7. Activity log
  // -------------------------------------------------------
  it('should call logActivity on successful login', async () => {
    const staff = makeStaff();
    const queryChain = createChain({ data: staff, error: null });
    const updateChain = createChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return queryChain;
      return updateChain;
    });

    mockVerifyPassword.mockReturnValue(true);

    await login('chef@sushinsushi.pt', 'correct-password');

    expect(mockLogActivity).toHaveBeenCalledWith(
      'staff-uuid-123',
      'login',
      'staff',
      'staff-uuid-123'
    );
  });

  // -------------------------------------------------------
  // 8. Token creation
  // -------------------------------------------------------
  it('should call createToken with correct authUser on DB success', async () => {
    const staff = makeStaff();
    const queryChain = createChain({ data: staff, error: null });
    const updateChain = createChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return queryChain;
      return updateChain;
    });

    mockVerifyPassword.mockReturnValue(true);

    await login('chef@sushinsushi.pt', 'correct-password');

    expect(mockCreateToken).toHaveBeenCalledWith({
      id: 'staff-uuid-123',
      email: 'chef@sushinsushi.pt',
      name: 'Chef Tanaka',
      role: 'admin',
      location: 'circunvalacao',
    });
  });

  // -------------------------------------------------------
  // 9. No staff in DB - fallback success
  // -------------------------------------------------------
  it('should fallback to env credentials when DB returns error', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'admin123');

    const queryChain = createChain({
      data: null,
      error: { message: 'No rows found' },
    });
    mockFrom.mockReturnValue(queryChain);

    const result = await login('admin@sushinsushi.pt', 'admin123');

    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('fallback-admin@sushinsushi.pt');
    expect(result.user?.email).toBe('admin@sushinsushi.pt');
    expect(result.user?.name).toBe('Administrador');
    expect(result.user?.role).toBe('admin');
    expect(result.token).toBe('mock-token');
  });

  // -------------------------------------------------------
  // 10. No staff in DB - fallback fails
  // -------------------------------------------------------
  it('should return error when DB returns error and fallback credentials do not match', async () => {
    const queryChain = createChain({
      data: null,
      error: { message: 'No rows found' },
    });
    mockFrom.mockReturnValue(queryChain);

    const result = await login('admin@sushinsushi.pt', 'totally-wrong');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Credenciais inválidas');
  });

  // -------------------------------------------------------
  // 11. Exception - fallback success
  // -------------------------------------------------------
  it('should fallback to env credentials when an exception is thrown', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'admin123');

    mockFrom.mockImplementation(() => {
      throw new Error('Connection refused');
    });

    const result = await login('admin@sushinsushi.pt', 'admin123');

    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('fallback-admin@sushinsushi.pt');
    expect(result.user?.role).toBe('admin');
  });

  // -------------------------------------------------------
  // 12. Exception - fallback fails
  // -------------------------------------------------------
  it('should return login error when exception thrown and fallback does not match', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection refused');
    });

    const result = await login('unknown@email.com', 'wrong-password');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao fazer login');
  });
});
