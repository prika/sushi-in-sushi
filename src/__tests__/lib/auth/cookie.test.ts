import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockVerifyToken = vi.fn();
vi.mock('@/lib/auth/token', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

import { getAuthUser, setAuthCookie, clearAuthCookie, getCookieName } from '@/lib/auth/cookie';

describe('getCookieName', () => {
  it('deve retornar nome do cookie de auth', () => {
    expect(getCookieName()).toBe('sushi-auth-token');
  });
});

describe('getAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar user quando token valido', async () => {
    const user = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin', location: null };
    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    mockVerifyToken.mockResolvedValue(user);

    const result = await getAuthUser();
    expect(result).toEqual(user);
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('deve retornar null quando sem cookie', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getAuthUser();
    expect(result).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('deve retornar null quando token invalido', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
    mockVerifyToken.mockResolvedValue(null);

    const result = await getAuthUser();
    expect(result).toBeNull();
  });
});

describe('setAuthCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve definir cookie com opcoes correctas', async () => {
    await setAuthCookie('test-token');

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'sushi-auth-token',
      'test-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('deve definir maxAge de 24h', async () => {
    await setAuthCookie('test-token');

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.maxAge).toBe(86400); // 60 * 60 * 24
  });
});

describe('clearAuthCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve apagar o cookie de auth', async () => {
    await clearAuthCookie();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('sushi-auth-token');
  });
});
