import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { secureLogin } from "@/lib/auth";

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

    // Return MFA status if required
    if (result.requiresMfa) {
      return NextResponse.json({
        success: true,
        requiresMfa: true,
        mfaFactorId: result.mfaFactorId,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Secure login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
