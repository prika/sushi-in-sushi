/**
 * Environment helper — single source of truth.
 *
 * Controlled by NEXT_PUBLIC_APP_ENV (set by npm scripts):
 *   npm run dev      → NEXT_PUBLIC_APP_ENV=development
 *   npm run dev:prod → NEXT_PUBLIC_APP_ENV=production
 *   npm run build    → NEXT_PUBLIC_APP_ENV=production
 *   npm run start    → NEXT_PUBLIC_APP_ENV=production
 *
 * Single Supabase instance for all environments.
 * Supabase Auth is always used (legacy auth removed).
 */

/** true when running against the development environment (shows DEV badge) */
export const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development";

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}
