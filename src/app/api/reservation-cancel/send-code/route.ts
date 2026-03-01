import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL;
const TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE;

const getRecipientEmail = (email: string): string =>
  TEST_EMAIL_OVERRIDE || email;

/**
 * POST /api/reservation-cancel/send-code
 * Sends a 6-digit verification code to the customer's email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if there are any upcoming reservations for this email
    const today = new Date().toISOString().split("T")[0];
    const { data: reservations } = await supabase
      .from("reservations")
      .select("id")
      .eq("email", email)
      .in("status", ["pending", "confirmed"])
      .gte("reservation_date", today)
      .limit(1);

    if (!reservations || reservations.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma reserva encontrada para este email" },
        { status: 404 }
      );
    }

    // Rate limit: max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTokens } = await (supabase as any)
      .from("reservation_cancel_tokens")
      .select("id")
      .eq("email", email)
      .gte("created_at", oneHourAgo)
      .limit(3);

    if (recentTokens && recentTokens.length >= 3) {
      return NextResponse.json(
        { error: "Demasiadas tentativas. Tente novamente dentro de 1 hora." },
        { status: 429 }
      );
    }

    // Generate 6-digit token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "generate_verification_token"
    );

    if (tokenError || !tokenData) {
      console.error("Error generating token:", tokenError);
      return NextResponse.json(
        { error: "Erro ao gerar código de verificação" },
        { status: 500 }
      );
    }

    const token = tokenData as string;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token
    const { error: insertError } = await (supabase as any)
      .from("reservation_cancel_tokens")
      .insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing cancel token:", insertError);
      return NextResponse.json(
        { error: "Erro ao guardar código" },
        { status: 500 }
      );
    }

    // Send email with verification code
    if (FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: `Sushi in Sushi <${FROM_EMAIL}>`,
          to: getRecipientEmail(email),
          subject: "Código de Verificação - Cancelamento de Reserva",
          html: buildVerificationEmail(token),
        });
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error in send-code:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

function buildVerificationEmail(token: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Inter',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:500px;background-color:#1a1a1a;border-radius:24px;overflow:hidden;border:1px solid #333;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#D4AF37 0%,#B8941F 100%);padding:30px;text-align:center;">
    <h1 style="margin:0;color:#1a1a1a;font-size:20px;font-weight:700;">Sushi in Sushi</h1>
    <p style="margin:8px 0 0;color:rgba(26,26,26,0.7);font-size:13px;">Código de Verificação</p>
  </td></tr>
  <!-- Content -->
  <tr><td style="padding:40px 30px;">
    <p style="margin:0 0 20px;color:#e0e0e0;font-size:15px;line-height:1.6;">
      Recebeu este email porque solicitou o cancelamento de uma reserva.
      Introduza o seguinte código para verificar a sua identidade:
    </p>
    <!-- Code Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td style="padding:25px;text-align:center;background:linear-gradient(135deg,#252525,#1e1e1e);border-radius:16px;border:1px solid #D4AF37;">
      <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#D4AF37;">${token}</span>
    </td></tr>
    </table>
    <p style="margin:20px 0 0;color:#888;font-size:13px;text-align:center;">
      Este código expira em <strong style="color:#e0e0e0;">15 minutos</strong>.
    </p>
    <p style="margin:20px 0 0;color:#666;font-size:12px;text-align:center;">
      Se não solicitou este código, pode ignorar este email.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
