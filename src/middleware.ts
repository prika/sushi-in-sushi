import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { jwtVerify } from "jose";
import { routing } from "./i18n/routing";
import type { RoleName } from "@/types/database";
import { AUTH_COOKIE_NAME, AUTH_SECRET_KEY } from "@/lib/config/constants";

const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET_KEY);

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

async function verifyAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: AuthPayload;
}> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authenticated: false };
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      authenticated: true,
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as RoleName,
        location: payload.location as string | null,
      },
    };
  } catch {
    return { authenticated: false };
  }
}

function getRouteConfig(pathname: string): { roles: RoleName[]; redirect: string } | null {
  // Check each route prefix
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
    const { authenticated, user } = await verifyAuth(request);

    // Not authenticated - redirect to login
    if (!authenticated || !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has required role
    if (!routeConfig.roles.includes(user.role)) {
      // Redirect to appropriate dashboard based on their actual role
      const redirectTo = getDefaultRedirectForRole(user.role);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // User has access - allow through
    return NextResponse.next();
  }

  // For login page, redirect if already authenticated
  if (pathname === "/login") {
    const { authenticated, user } = await verifyAuth(request);
    if (authenticated && user) {
      const redirectTo = getDefaultRedirectForRole(user.role);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.next();
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
    // Match all pathnames
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
