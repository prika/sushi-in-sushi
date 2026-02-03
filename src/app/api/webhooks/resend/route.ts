import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Resend webhook event types
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Additional fields for specific events
    click?: { link: string };
  };
}

// Helper to get typed supabase query
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// Verify Resend webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string | undefined
): boolean {
  if (!webhookSecret || !signature) {
    // If no secret configured, skip verification (not recommended for production)
    console.warn("⚠️ Resend webhook secret not configured - skipping signature verification");
    return true;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Map Resend event type to our status
function mapEventToStatus(eventType: ResendEventType): string {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.delivery_delayed":
      return "delayed";
    default:
      return "unknown";
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("svix-signature");
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: ResendWebhookEvent = JSON.parse(payload);
    const { type, data, created_at } = event;
    const emailId = data.email_id;
    const status = mapEventToStatus(type);

    console.log(`📧 Resend webhook: ${type} for email ${emailId}`);

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    // Log the event
    await extendedSupabase.from("email_events").insert({
      email_id: emailId,
      event_type: status,
      recipient_email: data.to?.[0],
      raw_data: event,
      event_timestamp: created_at,
    });

    // Find and update the reservation
    // First, check if it's a customer email
    const { data: customerReservation } = await extendedSupabase
      .from("reservations")
      .select("id")
      .eq("customer_email_id", emailId)
      .single();

    if (customerReservation) {
      const updateData: Record<string, unknown> = {
        customer_email_status: status,
      };

      if (type === "email.delivered") {
        updateData.customer_email_delivered_at = created_at;
      } else if (type === "email.opened") {
        updateData.customer_email_opened_at = created_at;
      }

      await extendedSupabase
        .from("reservations")
        .update(updateData)
        .eq("id", customerReservation.id);

      // Update the email event with reservation ID
      await extendedSupabase
        .from("email_events")
        .update({
          reservation_id: customerReservation.id,
          email_type: "customer_confirmation",
        })
        .eq("email_id", emailId)
        .eq("event_type", status);

      console.log(`✅ Updated customer email status for reservation ${customerReservation.id}`);
      return NextResponse.json({ success: true, type: "customer_email" });
    }

    // Check if it's a confirmation email
    const { data: confirmationReservation } = await extendedSupabase
      .from("reservations")
      .select("id")
      .eq("confirmation_email_id", emailId)
      .single();

    if (confirmationReservation) {
      const updateData: Record<string, unknown> = {
        confirmation_email_status: status,
      };

      if (type === "email.delivered") {
        updateData.confirmation_email_delivered_at = created_at;
      } else if (type === "email.opened") {
        updateData.confirmation_email_opened_at = created_at;
      }

      await extendedSupabase
        .from("reservations")
        .update(updateData)
        .eq("id", confirmationReservation.id);

      // Update the email event with reservation ID
      await extendedSupabase
        .from("email_events")
        .update({
          reservation_id: confirmationReservation.id,
          email_type: "reservation_confirmed",
        })
        .eq("email_id", emailId)
        .eq("event_type", status);

      console.log(`✅ Updated confirmation email status for reservation ${confirmationReservation.id}`);
      return NextResponse.json({ success: true, type: "confirmation_email" });
    }

    // Email not found in reservations (might be restaurant notification)
    console.log(`ℹ️ Email ${emailId} not linked to a customer reservation (might be restaurant notification)`);
    return NextResponse.json({ success: true, type: "untracked" });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
