/**
 * Supabase environment helper.
 *
 * Selects dev or prod credentials based on NODE_ENV:
 *   - development: uses _DEV vars if available, falls back to prod
 *   - production (or anything else): uses standard vars
 */

const isDev = process.env.NODE_ENV === "development";

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
