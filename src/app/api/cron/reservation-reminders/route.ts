import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  sendDayBeforeReminderEmail,
  sendSameDayReminderEmail,
} from "@/lib/email";
import type { Reservation, ReservationSettings } from "@/types/database";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max for Vercel

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error("Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const results = {
    dayBeforeReminders: { sent: 0, errors: 0, skipped: 0 },
    sameDayReminders: { sent: 0, errors: 0, skipped: 0 },
    settings: null as ReservationSettings | null,
  };

  try {
    // Get reminder settings from database
    const { data: settingsData } = await supabase
      .from("reservation_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const settings: ReservationSettings = settingsData || {
      id: 1,
      day_before_reminder_enabled: true,
      day_before_reminder_hours: 24,
      same_day_reminder_enabled: true,
      same_day_reminder_hours: 2,
      rodizio_waste_policy_enabled: true,
      rodizio_waste_fee_per_piece: 2.5,
      updated_at: new Date().toISOString(),
      updated_by: null,
    };

    results.settings = settings;

    // ===============================================
    // 1. DAY-BEFORE REMINDERS
    // ===============================================
    if (settings.day_before_reminder_enabled) {
      // Calculate the target date based on configured hours
      const targetDateTime = new Date(
        now.getTime() + settings.day_before_reminder_hours * 60 * 60 * 1000,
      );
      const targetDate = targetDateTime.toISOString().split("T")[0];

      // Find reservations for the target date that haven't received day-before reminder
      const { data: dayBeforeReservations, error: dbError1 } = await supabase
        .from("reservations")
        .select("*")
        .eq("reservation_date", targetDate)
        .in("status", ["pending", "confirmed"])
        .is("day_before_reminder_sent_at", null);

      if (dbError1) {
        console.error("Error fetching day-before reservations:", dbError1);
      } else if (dayBeforeReservations) {
        for (const reservation of dayBeforeReservations as Reservation[]) {
          const wasteFee = settings.rodizio_waste_policy_enabled
            ? settings.rodizio_waste_fee_per_piece
            : 0;
          const result = await sendDayBeforeReminderEmail(
            reservation,
            wasteFee,
          );

          if (result.success && result.emailId) {
            await supabase
              .from("reservations")
              .update({
                day_before_reminder_id: result.emailId,
                day_before_reminder_sent_at: new Date().toISOString(),
                day_before_reminder_status: "sent",
              })
              .eq("id", reservation.id);

            results.dayBeforeReminders.sent++;
            console.info(
              `✅ Day-before reminder sent for reservation ${reservation.id}`,
            );
          } else {
            results.dayBeforeReminders.errors++;
            console.error(
              `❌ Failed to send day-before reminder for ${reservation.id}: ${result.error}`,
            );
          }
        }
      }
    } else {
      console.info("ℹ️ Day-before reminders disabled in settings");
      results.dayBeforeReminders.skipped = -1; // Indicates disabled
    }

    // ===============================================
    // 2. SAME-DAY (X HOURS BEFORE) REMINDERS
    // ===============================================
    if (settings.same_day_reminder_enabled) {
      const todayDate = now.toISOString().split("T")[0];

      // Calculate target time window based on configured hours
      const hoursAhead = settings.same_day_reminder_hours;
      const minTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      const maxTime = new Date(
        now.getTime() + (hoursAhead + 1) * 60 * 60 * 1000,
      );

      // Format times for comparison (HH:MM:SS)
      const minTimeStr = minTime.toTimeString().slice(0, 8);
      const maxTimeStr = maxTime.toTimeString().slice(0, 8);

      // Find today's reservations within the time window
      const { data: sameDayReservations, error: dbError2 } = await supabase
        .from("reservations")
        .select("*")
        .eq("reservation_date", todayDate)
        .in("status", ["pending", "confirmed"])
        .is("same_day_reminder_sent_at", null)
        .gte("reservation_time", minTimeStr)
        .lte("reservation_time", maxTimeStr);

      if (dbError2) {
        console.error("Error fetching same-day reservations:", dbError2);
      } else if (sameDayReservations) {
        for (const reservation of sameDayReservations as Reservation[]) {
          const wasteFee = settings.rodizio_waste_policy_enabled
            ? settings.rodizio_waste_fee_per_piece
            : 0;
          const result = await sendSameDayReminderEmail(reservation, wasteFee);

          if (result.success && result.emailId) {
            await supabase
              .from("reservations")
              .update({
                same_day_reminder_id: result.emailId,
                same_day_reminder_sent_at: new Date().toISOString(),
                same_day_reminder_status: "sent",
              })
              .eq("id", reservation.id);

            results.sameDayReminders.sent++;
            console.info(
              `✅ Same-day reminder sent for reservation ${reservation.id}`,
            );
          } else {
            results.sameDayReminders.errors++;
            console.error(
              `❌ Failed to send same-day reminder for ${reservation.id}: ${result.error}`,
            );
          }
        }
      }
    } else {
      console.info("ℹ️ Same-day reminders disabled in settings");
      results.sameDayReminders.skipped = -1; // Indicates disabled
    }

    console.info("📧 Reminder cron completed:", results);
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("Error in reservation reminders cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: now.toISOString(),
        results,
      },
      { status: 500 },
    );
  }
}
