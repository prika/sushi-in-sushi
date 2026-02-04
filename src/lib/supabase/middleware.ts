import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for use in Next.js middleware.
 * Handles session refresh and cookie management.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
 */
export async function getStaffFromAuth(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string
) {
  const { data: staff, error } = await supabase
    .from("staff")
    .select(
      `
      id,
      name,
      email,
      location,
      is_active,
      roles!inner (
        name
      )
    `
    )
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !staff) {
    return null;
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    location: staff.location,
    role: (staff.roles as { name: string }).name,
  };
}
