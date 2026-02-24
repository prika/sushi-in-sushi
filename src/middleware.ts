import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import type { RoleName } from "@/types/database";
import { updateSession, getStaffFromAuth } from "@/lib/supabase/middleware";

// Route configuration with role requirements
const ROUTE_CONFIG: Record<string, { roles: RoleName[]; redirect: string }> = {
  "/admin": { roles: ["admin"], redirect: "/login" },
  "/cozinha": { roles: ["admin", "kitchen"], redirect: "/login" },
  "/waiter": { roles: ["admin", "waiter"], redirect: "/login" },
};

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  location: string | null;
}

// Supabase Auth authentication
async function verifyAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: AuthPayload;
  response: NextResponse;
}> {
  const { supabase, user, response } = await updateSession(request);

  if (!user) {
    return { authenticated: false, response };
  }

  // Get staff profile linked to this auth user
  const staff = await getStaffFromAuth(supabase, user.id);

  if (!staff) {
    return { authenticated: false, response };
  }

  return {
    authenticated: true,
    user: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role as RoleName,
      location: staff.location,
    },
    response,
  };
}

function getRouteConfig(
  pathname: string,
): { roles: RoleName[]; redirect: string } | null {
  for (const [route, config] of Object.entries(ROUTE_CONFIG)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }
  return null;
}

function getDefaultRedirectForRole(role: RoleName): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "kitchen":
      return "/cozinha";
    case "waiter":
      return "/waiter";
    default:
      return "/";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const routeConfig = getRouteConfig(pathname);

  if (routeConfig) {
    const { authenticated, user, response } = await verifyAuth(request);

    if (!authenticated || !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!routeConfig.roles.includes(user.role)) {
      const redirectTo = getDefaultRedirectForRole(user.role);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return response;
  }

  // For login page, redirect if already authenticated
  if (pathname === "/login") {
    const { authenticated, user, response } = await verifyAuth(request);

    if (authenticated && user) {
      const redirectTo = getDefaultRedirectForRole(user.role);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }

  // Apply intl middleware for other routes (excluding non-i18n routes)
  const isNonI18nRoute =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/mesa") ||
    pathname.startsWith("/demo") ||
    pathname.includes(".");

  if (!isNonI18nRoute) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all pathnames except static assets and API routes
    // API routes handle their own auth via getAuthUser() (JWT cookie)
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)",
  ],
};
