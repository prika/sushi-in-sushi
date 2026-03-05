import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sendCustomerWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e palavra-passe são obrigatórios." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "A palavra-passe deve ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    // Create Supabase Auth user (email confirmed immediately)
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email já está registado." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const authUserId = authData.user.id;

    // Upsert customer record (link existing or create new)
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      // Link existing customer to Auth user
      await adminClient
        .from("customers")
        .update({ auth_user_id: authUserId, name })
        .eq("id", existing.id);
    } else {
      // Create new customer record
      await adminClient.from("customers").insert({
        name,
        email,
        phone: phone || null,
        auth_user_id: authUserId,
        points: 0,
        total_spent: 0,
        visit_count: 0,
        is_active: true,
        marketing_consent: false,
      });
    }

    // Send welcome email (non-blocking)
    sendCustomerWelcomeEmail(email, name).catch((err) =>
      console.error("Failed to send welcome email:", err),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer register error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
