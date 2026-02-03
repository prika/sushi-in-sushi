import { cookies } from "next/headers";
import type { AuthUser } from "@/types/database";
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { verifyToken } from "./token";

/**
 * Get the current authenticated user from cookies
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
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
