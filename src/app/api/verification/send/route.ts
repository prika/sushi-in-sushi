import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import {
  validateContactNotSameAsSender,
  isTwilioConfigured,
} from '@/lib/validation/twilio';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/verification/send
 * Sends verification code via email or SMS
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { sessionCustomerId, verificationType, contactValue } = body;

    // Validate input
    if (!sessionCustomerId || !verificationType || !contactValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['email', 'phone'].includes(verificationType)) {
      return NextResponse.json(
        { error: 'Invalid verification type' },
        { status: 400 }
      );
    }

    // Rate limiting: Check if too many verifications sent recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentLogs, error: logsError } = await supabase
      .from('verification_logs')
      .select('id')
      .eq('contact_value', contactValue)
      .gte('created_at', oneHourAgo)
      .limit(3);

    if (logsError) {
      console.error('Error checking rate limit:', logsError);
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      );
    }

    if (recentLogs && recentLogs.length >= 3) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again in 1 hour.' },
        { status: 429 }
      );
    }

    // Generate 6-digit verification token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_verification_token');

    if (tokenError || !tokenData) {
      console.error('Error generating token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate verification token' },
        { status: 500 }
      );
    }

    const token = tokenData as string;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update session_customer with verification token
    const { error: updateError } = await supabase
      .from('session_customers')
      .update({
        verification_token: token,
        verification_expires_at: expiresAt.toISOString(),
        verification_type: verificationType,
      })
      .eq('id', sessionCustomerId);

    if (updateError) {
      console.error('Error updating session_customer:', updateError);
      return NextResponse.json(
        { error: 'Failed to save verification token' },
        { status: 500 }
      );
    }

    // Log verification attempt
    const { error: logError } = await supabase
      .from('verification_logs')
      .insert({
        session_customer_id: sessionCustomerId,
        verification_type: verificationType,
        contact_value: contactValue,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'sent',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      });

    if (logError) {
      console.error('Error logging verification:', logError);
      // Continue anyway - this is not critical
    }

    // Send verification code
    if (verificationType === 'email') {
      try {
        // Create verification link with token pre-filled
        const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/mesa/verify?token=${token}&customerId=${sessionCustomerId}`;

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@sushiinsushi.pt',
          to: contactValue,
          subject: '🍣 Código de Verificação - Sushi in Sushi',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <style>
                @media only screen and (max-width: 600px) {
                  .email-container { width: 100% !important; }
                  .code-box { font-size: 28px !important; letter-spacing: 6px !important; }
                }
              </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a1a1a; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">

                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #D4AF37 0%, #F4E5B8 100%); padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: bold;">
                            🍣 Sushi in Sushi
                          </h1>
                          <p style="margin: 10px 0 0 0; color: #2a2a2a; font-size: 16px;">
                            Verificação de Identidade
                          </p>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                            Código de Verificação
                          </h2>
                          <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                            Use o código abaixo para verificar o seu email. Clique no botão para verificar automaticamente, ou copie o código manualmente.
                          </p>

                          <!-- Verification Button -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                            <tr>
                              <td align="center">
                                <a href="${verificationUrl}" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);">
                                  ✅ Verificar Agora
                                </a>
                              </td>
                            </tr>
                          </table>

                          <!-- Divider -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                            <tr>
                              <td style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                                <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; text-align: center;">
                                  Ou copie o código manualmente:
                                </p>
                              </td>
                            </tr>
                          </table>

                          <!-- Code Box -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center">
                                <div class="code-box" style="background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%); padding: 25px 30px; border-radius: 12px; border: 2px dashed #D4AF37; display: inline-block;">
                                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1a1a1a; font-family: 'Courier New', monospace;">
                                    ${token}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </table>

                          <!-- Info -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px;">
                            <tr>
                              <td style="background-color: #fff8e7; padding: 20px; border-radius: 8px; border-left: 4px solid #D4AF37;">
                                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                  ⏱️ <strong>Este código expira em 15 minutos.</strong><br>
                                  🔒 Por razões de segurança, não partilhe este código com ninguém.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                          <p style="margin: 0 0 10px 0; color: #999; font-size: 13px;">
                            Se não solicitou este código, pode ignorar este email com segurança.
                          </p>
                          <p style="margin: 0; color: #999; font-size: 12px;">
                            © ${new Date().getFullYear()} Sushi in Sushi. Todos os direitos reservados.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });

        return NextResponse.json({
          success: true,
          message: 'Verification code sent to email',
          expiresAt: expiresAt.toISOString(),
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send verification email' },
          { status: 500 }
        );
      }
    } else if (verificationType === 'phone') {
      // Check if Twilio is configured
      if (!isTwilioConfigured()) {
        return NextResponse.json(
          { error: 'SMS service not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' },
          { status: 503 }
        );
      }

      // Validate contact is not same as sender
      const validation = validateContactNotSameAsSender(
        contactValue,
        process.env.TWILIO_PHONE_NUMBER
      );
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Initialize Twilio client (safe to do here after config validation)
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      try {
        await twilioClient.messages.create({
          body: `Sushi in Sushi - O seu código de verificação é: ${token}. Válido por 15 minutos.`,
          from: process.env.TWILIO_PHONE_NUMBER || '',
          to: contactValue,
        });

        return NextResponse.json({
          success: true,
          message: 'Verification code sent via SMS',
          expiresAt: expiresAt.toISOString(),
        });
      } catch (smsError: any) {
        console.error('Error sending SMS:', smsError);

        // Handle specific Twilio errors
        if (smsError.code === 21266) {
          return NextResponse.json(
            { error: 'Cannot send SMS to the same number as the sender. Please use a different phone number.' },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to send verification SMS. Please check the phone number format and try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid verification type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Verification send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
