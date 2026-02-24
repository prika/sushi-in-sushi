import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

/**
 * Creates a Supabase client for use in Next.js middleware.
 * Handles session refresh and cookie management.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response };
}

/**
 * Gets the staff profile for the authenticated user.
 * Returns null if user is not authenticated or not linked to a staff record.
 * Uses RPC functions with SECURITY DEFINER to bypass RLS on roles table.
 * Both RPCs run in parallel for faster response.
 */
export async function getStaffFromAuth(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  _userId: string
) {
  // Run both RPCs in parallel to reduce latency
  const [staffResult, roleResult] = await Promise.all([
    (supabase as any).rpc("get_current_staff"),
    (supabase as any).rpc("get_current_staff_role"),
  ]);

  if (staffResult.error || !staffResult.data || staffResult.data.length === 0) {
    return null;
  }

  if (roleResult.error || !roleResult.data) {
    return null;
  }

  const staff = staffResult.data[0];

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    location: staff.location,
    role: roleResult.data as string,
  };
}
