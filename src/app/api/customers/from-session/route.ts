import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/customers/from-session
 * Creates or updates a loyalty-program customer from mesa registration (session_customer)
 * and links the session_customer to that customer. Called from mesa page when user
 * registers with email so they appear in admin Clientes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      displayName,
      fullName,
      phone,
      birthDate,
      marketingConsent,
      sessionCustomerId,
    } = body as {
      email?: string;
      displayName?: string;
      fullName?: string | null;
      phone?: string | null;
      birthDate?: string | null;
      marketingConsent?: boolean;
      sessionCustomerId?: string;
    };

    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const trimmedDisplayName = typeof displayName === "string" ? displayName.trim() : "";
    const sessionId = typeof sessionCustomerId === "string" ? sessionCustomerId.trim() : "";

    if (!trimmedEmail || !trimmedDisplayName || !sessionId) {
      return NextResponse.json(
        { error: "email, displayName e sessionCustomerId são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const name = (typeof fullName === "string" ? fullName.trim() : null) || trimmedDisplayName;

    const { data: customer, error: upsertError } = await supabase
      .from("customers")
      .upsert(
        {
          email: trimmedEmail,
          name,
          phone: typeof phone === "string" ? phone.trim() || null : null,
          birth_date: typeof birthDate === "string" && birthDate.trim() ? birthDate.trim() : null,
          marketing_consent: Boolean(marketingConsent),
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error("[from-session] customers upsert error:", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("session_customers")
      .update({ customer_id: customer.id })
      .eq("id", sessionId);

    if (updateError) {
      console.error("[from-session] session_customers update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ customerId: customer.id });
  } catch (err) {
    console.error("[from-session] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao registar cliente" },
      { status: 500 }
    );
  }
}
