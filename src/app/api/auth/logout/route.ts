import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clearAuthCookie, logAuthEvent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Feature flag for Supabase Auth
const USE_SUPABASE_AUTH = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true";

export async function POST() {
  try {
    // Get client info for audit logging
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    if (USE_SUPABASE_AUTH) {
      const supabase = await createClient();

      // Get current user before signing out
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Get staff record
        const { data: staff } = await supabase
          .from("staff")
          .select("id, email")
          .eq("auth_user_id", user.id)
          .single();

        // Log the logout event
        await logAuthEvent({
          eventType: "logout",
          staffId: staff?.id,
          authUserId: user.id,
          email: staff?.email ?? user.email,
          ipAddress,
          userAgent,
          success: true,
        });
      }
    }

    // Clear legacy cookie (safe to call even if not using legacy auth)
    await clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer logout" },
      { status: 500 }
    );
  }
}
