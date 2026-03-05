import { Resend } from "resend";
import type { Reservation } from "@/types/database";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  getCustomerConfirmationEmail,
  getRestaurantNotificationEmail,
  getReservationConfirmedEmail,
  getFarewellEmail,
  getCancellationEmail,
  getDayBeforeReminderEmail,
  getSameDayReminderEmail,
  getCustomerWelcomeEmail,
  getTimeOffApprovalEmail,
  type LocationInfo,
} from "./templates";
import { generateGoogleCalendarURL, type CalendarEvent } from "@/lib/calendar/ics";

const resend = new Resend(process.env.RESEND_API_KEY);

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

// Fetch restaurant info from DB for email templates
async function fetchLocationInfo(slug: string): Promise<LocationInfo> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("restaurants")
      .select("name, address, phone, email, latitude, longitude, google_maps_url")
      .eq("slug", slug)
      .single();

    if (data) {
      return {
        name: `Sushi in Sushi - ${data.name}`,
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        coordinates: {
          lat: data.latitude || 0,
          lng: data.longitude || 0,
        },
        mapsUrl: data.google_maps_url || `https://maps.google.com/?q=Sushi+in+Sushi+${encodeURIComponent(data.name)}`,
      };
    }
  } catch (error) {
    console.error("Error fetching location info:", error);
  }

  // Fallback if DB lookup fails
  return {
    name: "Sushi in Sushi",
    address: "",
    phone: "",
    email: "",
    coordinates: { lat: 0, lng: 0 },
    mapsUrl: "",
  };
}

// Helper to update reservation with email tracking info
async function updateReservationEmailTracking(
  reservationId: string,
  emailType: "customer" | "confirmation",
  emailId: string,
) {
  try {
    const supabase = await createClient();

    const updateData =
      emailType === "customer"
        ? {
            customer_email_id: emailId,
            customer_email_sent_at: new Date().toISOString(),
            customer_email_status: "sent" as const,
          }
        : {
            confirmation_email_id: emailId,
            confirmation_email_sent_at: new Date().toISOString(),
            confirmation_email_status: "sent" as const,
          };

    const { error } = await supabase
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

  const locationInfo = await fetchLocationInfo(reservation.location);

  // Check if email is properly configured
  if (!isEmailConfigured()) {
    const customerEmail = getCustomerConfirmationEmail(reservation, locationInfo);
    const restaurantEmail = getRestaurantNotificationEmail(reservation, locationInfo);

    logEmail(reservation.email, customerEmail.subject, "Customer Confirmation");
    logEmail(
      locationInfo.email,
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
    const customerEmail = getCustomerConfirmationEmail(reservation, locationInfo);
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
    const restaurantEmail = getRestaurantNotificationEmail(reservation, locationInfo);
    const toEmail = locationInfo.email;

    if (!toEmail) {
      results.restaurantEmail.error = "No restaurant email configured";
      return results;
    }

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

export async function sendRestaurantNotificationEmail(reservation: Reservation) {
  const locationInfo = await fetchLocationInfo(reservation.location);

  if (!isEmailConfigured()) {
    const restaurantEmail = getRestaurantNotificationEmail(reservation, locationInfo);
    logEmail(
      locationInfo.email,
      restaurantEmail.subject,
      "Restaurant Notification",
    );
    return { success: false, error: "Email not configured" };
  }

  try {
    const restaurantEmail = getRestaurantNotificationEmail(reservation, locationInfo);
    const toEmail = locationInfo.email;

    if (!toEmail) {
      return { success: false, error: "No restaurant email configured" };
    }

    const { error } = await resend.emails.send({
      from: `Reservas Online <${FROM_EMAIL}>`,
      to: getRecipientEmail(toEmail),
      subject: restaurantEmail.subject,
      html: restaurantEmail.html,
    });

    if (error) {
      console.error("Error sending restaurant email:", error);
      return { success: false, error: error.message };
    }

    console.info(`✅ Restaurant notification sent to ${toEmail}`);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error sending restaurant email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendReservationConfirmedEmail(reservation: Reservation) {
  const locationInfo = await fetchLocationInfo(reservation.location);
  const emailTemplate = getReservationConfirmedEmail(reservation, locationInfo);

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
  const locationInfo = await fetchLocationInfo(reservation.location);
  const emailTemplate = getFarewellEmail(reservation, locationInfo);

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
  const locationInfo = await fetchLocationInfo(reservation.location);
  const emailTemplate = getCancellationEmail(reservation, locationInfo, cancellationReason);

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
  const locationInfo = await fetchLocationInfo(reservation.location);
  const emailTemplate = getDayBeforeReminderEmail(reservation, locationInfo, wasteFeePerPiece);

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
  const locationInfo = await fetchLocationInfo(reservation.location);
  const emailTemplate = getSameDayReminderEmail(reservation, locationInfo, wasteFeePerPiece);

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

// ---------------------------------------------------------------------------
// Customer Welcome Email
// ---------------------------------------------------------------------------

export async function sendCustomerWelcomeEmail(
  email: string,
  name: string,
): Promise<{ success: boolean; error: string | null }> {
  const template = getCustomerWelcomeEmail(name);

  if (!isEmailConfigured()) {
    logEmail(email, template.subject, "Customer Welcome");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(email),
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      return { success: false, error: error.message };
    }

    console.info(`✅ Welcome email sent to ${email}`);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Time-Off Approval Email
// ---------------------------------------------------------------------------

const TIME_OFF_TYPE_LABELS_EMAIL: Record<string, string> = {
  vacation: "Férias",
  sick: "Doença",
  personal: "Pessoal",
  other: "Outro",
};

export async function sendTimeOffApprovalEmail(
  email: string,
  staffName: string,
  timeOffId: number,
  type: string,
  startDate: string,
  endDate: string,
  reason: string | null,
): Promise<{ success: boolean; error: string | null }> {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sushinsushi.pt";
  const typeLabel = TIME_OFF_TYPE_LABELS_EMAIL[type] || type;

  const calEvent: CalendarEvent = {
    id: `timeoff-${timeOffId}`,
    title: `${typeLabel} — ${staffName}`,
    description: reason ? `Motivo: ${reason}` : `Ausência: ${typeLabel}`,
    startDate,
    endDate,
    allDay: true,
    location: "Sushi in Sushi",
  };

  const googleCalendarUrl = generateGoogleCalendarURL(calEvent);
  const icsDownloadUrl = `${BASE_URL}/api/calendar/timeoff/${timeOffId}`;

  const template = getTimeOffApprovalEmail(
    staffName, email, type, startDate, endDate, reason,
    googleCalendarUrl, icsDownloadUrl,
  );

  if (!isEmailConfigured()) {
    console.info(`[TimeOff Approval] Email not configured. Would send to: ${email}`);
    return { success: false, error: "Email not configured" };
  }

  try {
    await resend.emails.send({
      from: `Sushi in Sushi <${FROM_EMAIL}>`,
      to: getRecipientEmail(email),
      subject: template.subject,
      html: template.html,
    });
    console.info(`[TimeOff Approval] Email sent to ${email}`);
    return { success: true, error: null };
  } catch (err) {
    console.error("[TimeOff Approval] Failed to send email:", err);
    return { success: false, error: String(err) };
  }
}
