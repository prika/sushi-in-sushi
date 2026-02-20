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

// Verify Resend webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string | undefined,
): boolean {
  if (!webhookSecret || !signature) {
    // If no secret configured, skip verification (not recommended for production)
    console.warn(
      "⚠️ Resend webhook secret not configured - skipping signature verification",
    );
    return true;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
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

    console.info(`📧 Resend webhook: ${type} for email ${emailId}`);

    const supabase = await createClient();

    // Log the event
    await supabase.from("email_events").insert({
      email_id: emailId,
      event_type: status,
      recipient_email: data.to?.[0],
      raw_data: JSON.parse(payload),
      event_timestamp: created_at,
    });

    // Find and update the reservation
    // First, check if it's a customer email
    const { data: customerReservation } = await supabase
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

      await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", customerReservation.id);

      // Update the email event with reservation ID
      await supabase
        .from("email_events")
        .update({
          reservation_id: customerReservation.id,
          email_type: "customer_confirmation",
        })
        .eq("email_id", emailId)
        .eq("event_type", status);

      console.info(
        `✅ Updated customer email status for reservation ${customerReservation.id}`,
      );
      return NextResponse.json({ success: true, type: "customer_email" });
    }

    // Check if it's a confirmation email
    const { data: confirmationReservation } = await supabase
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

      await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", confirmationReservation.id);

      // Update the email event with reservation ID
      await supabase
        .from("email_events")
        .update({
          reservation_id: confirmationReservation.id,
          email_type: "reservation_confirmed",
        })
        .eq("email_id", emailId)
        .eq("event_type", status);

      console.info(
        `✅ Updated confirmation email status for reservation ${confirmationReservation.id}`,
      );
      return NextResponse.json({ success: true, type: "confirmation_email" });
    }

    // Check if it's a day-before reminder email
    const { data: dayBeforeReservation } = await supabase
      .from("reservations")
      .select("id")
      .eq("day_before_reminder_id", emailId)
      .single();

    if (dayBeforeReservation) {
      const updateData: Record<string, unknown> = {
        day_before_reminder_status: status,
      };

      if (type === "email.delivered") {
        updateData.day_before_reminder_delivered_at = created_at;
      } else if (type === "email.opened") {
        updateData.day_before_reminder_opened_at = created_at;
      }

      await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", dayBeforeReservation.id);

      // Update the email event with reservation ID
      await supabase
        .from("email_events")
        .update({
          reservation_id: dayBeforeReservation.id,
          email_type: "day_before_reminder",
        })
        .eq("email_id", emailId)
        .eq("event_type", status);

      console.info(
        `✅ Updated day-before reminder status for reservation ${dayBeforeReservation.id}`,
      );
      return NextResponse.json({ success: true, type: "day_before_reminder" });
    }

    // Check if it's a same-day reminder email
    const { data: sameDayReservation } = await supabase
      .from("reservations")
      .select("id")
      .eq("same_day_reminder_id", emailId)
      .single();

    if (sameDayReservation) {
      const updateData: Record<string, unknown> = {
        same_day_reminder_status: status,
      };

      if (type === "email.delivered") {
        updateData.same_day_reminder_delivered_at = created_at;
      } else if (type === "email.opened") {
        updateData.same_day_reminder_opened_at = created_at;
      }

      await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", sameDayReservation.id);

      // Update the email event with reservation ID
      await supabase
        .from("email_events")
        .update({
          reservation_id: sameDayReservation.id,
          email_type: "same_day_reminder",
        })
        .eq("email_id", emailId)
        .eq("event_type", status);

      console.info(
        `✅ Updated same-day reminder status for reservation ${sameDayReservation.id}`,
      );
      return NextResponse.json({ success: true, type: "same_day_reminder" });
    }

    // Email not found in reservations (might be restaurant notification)
    console.info(
      `ℹ️ Email ${emailId} not linked to a customer reservation (might be restaurant notification)`,
    );
    return NextResponse.json({ success: true, type: "untracked" });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
