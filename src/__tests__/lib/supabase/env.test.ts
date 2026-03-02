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
    it('deve retornar NEXT_PUBLIC_SUPABASE_URL', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://my.supabase.co';
      const { getSupabaseUrl } = await import('@/lib/supabase/env');
      expect(getSupabaseUrl()).toBe('https://my.supabase.co');
    });
  });

  describe('getSupabaseAnonKey', () => {
    it('deve retornar NEXT_PUBLIC_SUPABASE_ANON_KEY', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'my-key';
      const { getSupabaseAnonKey } = await import('@/lib/supabase/env');
      expect(getSupabaseAnonKey()).toBe('my-key');
    });
  });

  describe('getSupabaseServiceRoleKey', () => {
    it('deve retornar SUPABASE_SERVICE_ROLE_KEY', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'my-service-key';
      const { getSupabaseServiceRoleKey } = await import('@/lib/supabase/env');
      expect(getSupabaseServiceRoleKey()).toBe('my-service-key');
    });
  });

});
