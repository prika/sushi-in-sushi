import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getMfaFactors, isMfaRequired, getSessionConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Get staff record using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: staff, error } = await adminClient
      .from("staff")
      .select("id, roles!inner(name)")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error || !staff) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 }
      );
    }

    // Try to get MFA-specific columns (may not exist if migration not applied)
    let mfaRequired = false;
    let mfaEnrolledAt: string | null = null;

    try {
      const { data: mfaData } = await adminClient
        .from("staff")
        .select("mfa_required, mfa_enrolled_at")
        .eq("id", staff.id)
        .single();

      if (mfaData) {
        mfaRequired = (mfaData as { mfa_required?: boolean }).mfa_required ?? false;
        mfaEnrolledAt = (mfaData as { mfa_enrolled_at?: string }).mfa_enrolled_at ?? null;
      }
    } catch {
      // Columns don't exist yet, use defaults
    }

    // Get MFA factors
    const factors = await getMfaFactors(supabase);

    // Check if MFA is required for this role
    const roleName = (staff.roles as { name: string }).name;
    const sessionConfig = await getSessionConfig(roleName);

    // Check current MFA status
    const needsVerification = await isMfaRequired(supabase);

    return NextResponse.json({
      enrolled: factors.length > 0,
      required: mfaRequired || sessionConfig?.requireMfa || false,
      needsVerification,
      enrolledAt: mfaEnrolledAt,
      factors: factors.map((f) => ({
        id: f.id,
        type: f.type,
        friendlyName: f.friendlyName,
      })),
    });
  } catch (error) {
    console.error("MFA status error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
