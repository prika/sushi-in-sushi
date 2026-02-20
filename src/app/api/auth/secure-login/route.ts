import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { secureLogin, setAuthCookie } from "@/lib/auth";
import { createToken } from "@/lib/auth/token";
import type { RoleName, Location } from "@/types/database";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e palavra-passe são obrigatórios" },
        { status: 400 }
      );
    }

    // Get client info for audit logging
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    const supabase = await createClient();

    // Use secure login with rate limiting and audit logging
    const result = await secureLogin(supabase, {
      email,
      password,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      const status = result.rateLimited ? 429 : 401;
      return NextResponse.json(
        {
          error: result.error,
          rateLimited: result.rateLimited,
          blockedUntil: result.blockedUntil?.toISOString(),
        },
        { status }
      );
    }

    // Return MFA status if required (don't set cookie yet — wait for MFA verification)
    if (result.requiresMfa) {
      return NextResponse.json({
        success: true,
        requiresMfa: true,
        mfaFactorId: result.mfaFactorId,
      });
    }

    // Create JWT token and set auth cookie so API routes work
    if (result.user) {
      const token = await createToken({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role as RoleName,
        location: result.user.location as Location | null,
      });
      await setAuthCookie(token);
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Secure login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
