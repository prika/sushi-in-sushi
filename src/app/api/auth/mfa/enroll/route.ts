import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrollMfa, logAuthEvent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
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
      .select("id, email, roles!inner(name)")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!staff) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 }
      );
    }

    // Enroll in MFA
    const result = await enrollMfa(supabase);

    if (!result.success) {
      await logAuthEvent({
        eventType: "mfa_enrolled",
        staffId: staff.id,
        authUserId: user.id,
        email: staff.email,
        success: false,
        errorMessage: result.error,
      });

      return NextResponse.json(
        { error: result.error || "Erro ao ativar MFA" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCode: result.qrCode,
      secret: result.secret,
    });
  } catch (error) {
    console.error("MFA enroll error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
