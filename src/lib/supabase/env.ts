/**
 * Environment helper — single source of truth.
 *
 * Controlled by NEXT_PUBLIC_APP_ENV (set by npm scripts):
 *   npm run dev      → NEXT_PUBLIC_APP_ENV=development
 *   npm run dev:prod → NEXT_PUBLIC_APP_ENV=production
 *   npm run build    → NEXT_PUBLIC_APP_ENV=production
 *   npm run start    → NEXT_PUBLIC_APP_ENV=production
 *
 * Behavior per environment:
 *   development:
 *     - Supabase: _DEV credentials (falls back to standard if not set)
 *     - Auth: legacy (staff table, no Supabase Auth users needed)
 *   production:
 *     - Supabase: standard credentials
 *     - Auth: Supabase Auth (rate limiting, MFA, audit logging)
 */

/** true when running against the development environment */
export const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development";

export function getSupabaseUrl(): string {
  if (isDev && process.env.NEXT_PUBLIC_SUPABASE_URL_DEV) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL_DEV;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function getSupabaseAnonKey(): string {
  if (isDev && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

export function getSupabaseServiceRoleKey(): string {
  if (isDev && process.env.SUPABASE_SERVICE_ROLE_KEY_DEV) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY_DEV;
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

/**
 * Whether to use Supabase Auth (secure-login) or legacy auth (staff table).
 * development = false (legacy), production = true (Supabase Auth).
 * Override with NEXT_PUBLIC_USE_SUPABASE_AUTH=true|false.
 */
export function shouldUseSupabaseAuth(): boolean {
  const override = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH;
  if (override === "true") return true;
  if (override === "false") return false;
  return !isDev;
}
