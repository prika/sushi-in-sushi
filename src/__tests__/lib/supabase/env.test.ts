import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('supabase/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isDev', () => {
    it('deve ser true quando NEXT_PUBLIC_APP_ENV=development', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      const { isDev } = await import('@/lib/supabase/env');
      expect(isDev).toBe(true);
    });

    it('deve ser false quando NEXT_PUBLIC_APP_ENV=production', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      const { isDev } = await import('@/lib/supabase/env');
      expect(isDev).toBe(false);
    });

    it('deve ser false quando NEXT_PUBLIC_APP_ENV nao definido', async () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      const { isDev } = await import('@/lib/supabase/env');
      expect(isDev).toBe(false);
    });
  });

  describe('getSupabaseUrl', () => {
    it('deve retornar URL dev quando em development com DEV var', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = 'https://dev.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co';
      const { getSupabaseUrl } = await import('@/lib/supabase/env');
      expect(getSupabaseUrl()).toBe('https://dev.supabase.co');
    });

    it('deve retornar URL padrao quando em production', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co';
      const { getSupabaseUrl } = await import('@/lib/supabase/env');
      expect(getSupabaseUrl()).toBe('https://prod.supabase.co');
    });

    it('deve fazer fallback para URL padrao quando DEV var nao existe', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      delete process.env.NEXT_PUBLIC_SUPABASE_URL_DEV;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co';
      const { getSupabaseUrl } = await import('@/lib/supabase/env');
      expect(getSupabaseUrl()).toBe('https://prod.supabase.co');
    });
  });

  describe('getSupabaseAnonKey', () => {
    it('deve retornar key dev quando em development', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV = 'dev-key';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'prod-key';
      const { getSupabaseAnonKey } = await import('@/lib/supabase/env');
      expect(getSupabaseAnonKey()).toBe('dev-key');
    });

    it('deve retornar key padrao quando em production', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'prod-key';
      const { getSupabaseAnonKey } = await import('@/lib/supabase/env');
      expect(getSupabaseAnonKey()).toBe('prod-key');
    });
  });

  describe('getSupabaseServiceRoleKey', () => {
    it('deve retornar service key dev quando em development', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      process.env.SUPABASE_SERVICE_ROLE_KEY_DEV = 'dev-service-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'prod-service-key';
      const { getSupabaseServiceRoleKey } = await import('@/lib/supabase/env');
      expect(getSupabaseServiceRoleKey()).toBe('dev-service-key');
    });

    it('deve retornar service key padrao quando em production', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'prod-service-key';
      const { getSupabaseServiceRoleKey } = await import('@/lib/supabase/env');
      expect(getSupabaseServiceRoleKey()).toBe('prod-service-key');
    });
  });

  describe('shouldUseSupabaseAuth', () => {
    it('deve retornar false em development (legacy auth)', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      delete process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH;
      const { shouldUseSupabaseAuth } = await import('@/lib/supabase/env');
      expect(shouldUseSupabaseAuth()).toBe(false);
    });

    it('deve retornar true em production (Supabase Auth)', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      delete process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH;
      const { shouldUseSupabaseAuth } = await import('@/lib/supabase/env');
      expect(shouldUseSupabaseAuth()).toBe(true);
    });

    it('deve respeitar override true', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'development';
      process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH = 'true';
      const { shouldUseSupabaseAuth } = await import('@/lib/supabase/env');
      expect(shouldUseSupabaseAuth()).toBe(true);
    });

    it('deve respeitar override false', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH = 'false';
      const { shouldUseSupabaseAuth } = await import('@/lib/supabase/env');
      expect(shouldUseSupabaseAuth()).toBe(false);
    });
  });
});
