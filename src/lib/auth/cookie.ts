import { cookies } from "next/headers";
import type { AuthUser, RoleName, Location } from "@/types/database";
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { verifyToken } from "./token";

/**
 * Get the current authenticated user from cookies.
 * Tries the JWT cookie first (fast path), then falls back to
 * Supabase Auth session if the JWT cookie is missing or expired.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const user = await verifyToken(token);
    if (user) return user;
  }

  // Fallback: check Supabase Auth session
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    // Get staff profile via RPC (SECURITY DEFINER, bypasses RLS)
    const [staffResult, roleResult] = await Promise.all([
      (supabase as any).rpc("get_current_staff"),
      (supabase as any).rpc("get_current_staff_role"),
    ]);

    if (staffResult.error || !staffResult.data?.length) return null;
    if (roleResult.error || !roleResult.data) return null;

    const staff = staffResult.data[0];
    return {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: roleResult.data as RoleName,
      location: (staff.location as Location) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Set the auth cookie with a token
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Clear the auth cookie (logout)
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Get the cookie name
 */
export function getCookieName(): string {
  return AUTH_COOKIE_NAME;
}
