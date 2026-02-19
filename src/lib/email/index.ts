import { Resend } from "resend";
import type { Reservation } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import {
  getCustomerConfirmationEmail,
  getRestaurantNotificationEmail,
  getReservationConfirmedEmail,
  getFarewellEmail,
  getCancellationEmail,
  getDayBeforeReminderEmail,
  getSameDayReminderEmail,
} from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY);

// Restaurant notification emails by location
const RESTAURANT_EMAILS: Record<string, string> = {
  circunvalacao: process.env.RESTAURANT_EMAIL_1 || "",
  boavista: process.env.RESTAURANT_EMAIL_2 || "",
};

const FROM_EMAIL = process.env.FROM_EMAIL;

// Test email override - when set, ALL emails are sent to this address
const TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE;

// Helper to get the actual recipient email (respects test override)
const getRecipientEmail = (originalEmail: string): string => {
  if (TEST_EMAIL_OVERRIDE) {
    console.info(`📧 [TEST MODE] Redirecting email from ${originalEmail} to ${TEST_EMAIL_OVERRIDE}`);
    return TEST_EMAIL_OVERRIDE;
  }
  return originalEmail;
};

// Helper to update reservation with email tracking info
async function updateReservationEmailTracking(
  reservationId: string,
  emailType: "customer" | "confirmation",
  emailId: string,
) {
  try {
    const supabase = await createClient();
    const extendedSupabase = supabase as unknown as {
      from: (table: string) => ReturnType<typeof supabase.from>;
    };

    const updateData =
      emailType === "customer"
        ? {
            customer_email_id: emailId,
            customer_email_sent_at: new Date().toISOString(),
            customer_email_status: "sent",
          }
        : {
            confirmation_email_id: emailId,
            confirmation_email_sent_at: new Date().toISOString(),
            confirmation_email_status: "sent",
          };

    const { error } = await extendedSupabase
      .from("reservations")
      .update(updateData)
      .eq("id", reservationId);

    if (error) {
      console.error("Error updating email tracking:", error);
    }
  } catch (error) {
    console.error("Error updating email tracking:", error);
  }
}

// Check if emails are properly configured (not using resend.dev domain for production)
const isEmailConfigured = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  // No API key = no emails
  if (!apiKey) return false;

  // If using resend.dev domain, only allow in development mode for testing
  if (!fromEmail || fromEmail.includes("resend.dev")) {
    return process.env.NODE_ENV === "development";
  }

  return true;
};

// Log email instead of sending (for development/debugging)
const logEmail = (to: string, subject: string, type: string) => {
  console.info(`
📧 EMAIL ${process.env.NODE_ENV === "production" ? "WOULD BE SENT" : "(dev mode - not sent)"}:
   To: ${to}
   Subject: ${subject}
   Type: ${type}
  `);
};

export async function sendReservationEmails(reservation: Reservation) {
  const results = {
    customerEmail: { success: false, error: null as string | null },
    restaurantEmail: { success: false, error: null as string | null },
  };

  // Check if email is properly configured
  if (!isEmailConfigured()) {
    const customerEmail = getCustomerConfirmationEmail(reservation);
    const restaurantEmail = getRestaurantNotificationEmail(reservation);

    logEmail(reservation.email, customerEmail.subject, "Customer Confirmation");
    logEmail(
      RESTAURANT_EMAILS[reservation.location],
      restaurantEmail.subject,
      "Restaurant Notification",
    );

    console.info(
      "⚠️  Emails not sent: Configure RESEND_API_KEY and FROM_EMAIL with a verified domain",
    );
    results.customerEmail.error = "Email not configured";
    results.restaurantEmail.error = "Email not configured";
    return results;
  }

  // Send confirmation email to customer
  try {
    const customerEmail = getCustomerConfirmationEmail(reservation);
    const { data, error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(reservation.email),
      subject: customerEmail.subject,
      html: customerEmail.html,
    });

    if (error) {
      console.error("Error sending customer email:", error);
      results.customerEmail.error = error.message;
    } else {
      results.customerEmail.success = true;
      console.info(`✅ Customer email sent to ${reservation.email}`);

      // Update reservation with email tracking info
      if (data?.id) {
        await updateReservationEmailTracking(
          reservation.id,
          "customer",
          data.id,
        );
      }
    }
  } catch (error) {
    console.error("Error sending customer email:", error);
    results.customerEmail.error =
      error instanceof Error ? error.message : "Unknown error";
  }

  // Send notification email to restaurant
  try {
    const restaurantEmail = getRestaurantNotificationEmail(reservation);
    const toEmail =
      RESTAURANT_EMAILS[reservation.location] ||
      RESTAURANT_EMAILS.circunvalacao;

    const { error } = await resend.emails.send({
      from: `Reservas Online <${FROM_EMAIL}>`,
      to: getRecipientEmail(toEmail),
      subject: restaurantEmail.subject,
      html: restaurantEmail.html,
    });

    if (error) {
      console.error("Error sending restaurant email:", error);
      results.restaurantEmail.error = error.message;
    } else {
      results.restaurantEmail.success = true;
      console.info(`✅ Restaurant email sent to ${toEmail}`);
    }
  } catch (error) {
    console.error("Error sending restaurant email:", error);
    results.restaurantEmail.error =
      error instanceof Error ? error.message : "Unknown error";
  }

  return results;
}

export async function sendReservationConfirmedEmail(reservation: Reservation) {
  const emailTemplate = getReservationConfirmedEmail(reservation);

  // Check if email is properly configured
  if (!isEmailConfigured()) {
    logEmail(reservation.email, emailTemplate.subject, "Reservation Confirmed");
    console.info(
      "⚠️  Email not sent: Configure RESEND_API_KEY and FROM_EMAIL with a verified domain",
    );
    return { success: false, error: "Email not configured", emailId: null };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(reservation.email),
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error("Error sending confirmation email:", error);
      return { success: false, error: error.message, emailId: null };
    }

    // Update reservation with email tracking info
    if (data?.id) {
      await updateReservationEmailTracking(
        reservation.id,
        "confirmation",
        data.id,
      );
    }

    console.info(`✅ Confirmation email sent to ${reservation.email}`);
    return { success: true, error: null, emailId: data?.id || null };
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      emailId: null,
    };
  }
}

export async function sendFarewellEmail(reservation: Reservation) {
  const emailTemplate = getFarewellEmail(reservation);

  // Check if email is properly configured
  if (!isEmailConfigured()) {
    logEmail(reservation.email, emailTemplate.subject, "Farewell");
    console.info(
      "⚠️  Email not sent: Configure RESEND_API_KEY and FROM_EMAIL with a verified domain",
    );
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(reservation.email),
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error("Error sending farewell email:", error);
      return { success: false, error: error.message };
    }

    console.info(`✅ Farewell email sent to ${reservation.email}`);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error sending farewell email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendCancellationEmail(reservation: Reservation, cancellationReason: string) {
  const emailTemplate = getCancellationEmail(reservation, cancellationReason);

  // Check if email is properly configured
  if (!isEmailConfigured()) {
    logEmail(reservation.email, emailTemplate.subject, "Cancellation");
    console.info(
      "⚠️  Email not sent: Configure RESEND_API_KEY and FROM_EMAIL with a verified domain",
    );
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(reservation.email),
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error("Error sending cancellation email:", error);
      return { success: false, error: error.message };
    }

    console.info(`✅ Cancellation email sent to ${reservation.email}`);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendDayBeforeReminderEmail(reservation: Reservation, wasteFeePerPiece: number = 2.50) {
  const emailTemplate = getDayBeforeReminderEmail(reservation, wasteFeePerPiece);

  if (!isEmailConfigured()) {
    logEmail(reservation.email, emailTemplate.subject, "Day-Before Reminder");
    console.info(
      "⚠️  Email not sent: Configure RESEND_API_KEY and FROM_EMAIL with a verified domain",
    );
    return { success: false, error: "Email not configured", emailId: null };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(reservation.email),
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error("Error sending day-before reminder:", error);
      return { success: false, error: error.message, emailId: null };
    }

    console.info(`✅ Day-before reminder sent to ${reservation.email}`);
    return { success: true, error: null, emailId: data?.id || null };
  } catch (error) {
    console.error("Error sending day-before reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      emailId: null,
    };
  }
}

export async function sendSameDayReminderEmail(reservation: Reservation, wasteFeePerPiece: number = 2.50) {
  const emailTemplate = getSameDayReminderEmail(reservation, wasteFeePerPiece);

  if (!isEmailConfigured()) {
    logEmail(reservation.email, emailTemplate.subject, "Same-Day Reminder");
    console.info(
      "⚠️  Email not sent: Configure RESEND_API_KEY and FROM_EMAIL with a verified domain",
    );
    return { success: false, error: "Email not configured", emailId: null };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(reservation.email),
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error("Error sending same-day reminder:", error);
      return { success: false, error: error.message, emailId: null };
    }

    console.info(`✅ Same-day reminder sent to ${reservation.email}`);
    return { success: true, error: null, emailId: data?.id || null };
  } catch (error) {
    console.error("Error sending same-day reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      emailId: null,
    };
  }
}
