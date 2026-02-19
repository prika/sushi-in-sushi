import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyMfa, getMfaFactors, logAuthEvent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, factorId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Código MFA é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Get staff record
    const { data: staff } = await supabase
      .from("staff")
      .select("id, email")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single();

    // Get factor ID if not provided
    let targetFactorId = factorId;
    if (!targetFactorId) {
      const factors = await getMfaFactors(supabase);
      if (factors.length === 0) {
        return NextResponse.json(
          { error: "MFA não está configurado" },
          { status: 400 }
        );
      }
      targetFactorId = factors[0].id;
    }

    // Verify MFA
    const result = await verifyMfa(supabase, targetFactorId, code);

    if (!result.success) {
      await logAuthEvent({
        eventType: "mfa_failed",
        staffId: staff?.id,
        authUserId: user.id,
        email: staff?.email ?? user.email,
        success: false,
        errorMessage: result.error,
      });

      return NextResponse.json(
        { error: result.error || "Código MFA inválido" },
        { status: 400 }
      );
    }

    // Log successful MFA verification
    await logAuthEvent({
      eventType: "mfa_verified",
      staffId: staff?.id,
      authUserId: user.id,
      email: staff?.email ?? user.email,
      success: true,
    });

    // Note: mfa_enrolled_at column update is handled by the MFA enroll endpoint
    // This endpoint only verifies the code

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
