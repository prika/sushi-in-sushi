import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabaseReservationSettingsRepository } from "@/infrastructure/repositories/SupabaseReservationSettingsRepository";
import {
  GetReservationSettingsUseCase,
  UpdateReservationSettingsUseCase,
} from "@/application/use-cases/reservation-settings";
import type { UpdateReservationSettingsData } from "@/domain/entities/ReservationSettings";

// GET - Fetch reservation settings
export async function GET() {
  try {
    // Verify admin authentication
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const repository = new SupabaseReservationSettingsRepository(supabase);
    const getReservationSettings = new GetReservationSettingsUseCase(repository);

    const result = await getReservationSettings.execute();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Map to database format for backwards compatibility
    const data = {
      id: result.data.id,
      day_before_reminder_enabled: result.data.dayBeforeReminderEnabled,
      day_before_reminder_hours: result.data.dayBeforeReminderHours,
      same_day_reminder_enabled: result.data.sameDayReminderEnabled,
      same_day_reminder_hours: result.data.sameDayReminderHours,
      rodizio_waste_policy_enabled: result.data.rodizioWastePolicyEnabled,
      rodizio_waste_fee_per_piece: result.data.rodizioWasteFeePerPiece,
      waiter_alert_minutes: result.data.waiterAlertMinutes,
      piece_limiter_enabled: result.data.pieceLimiterEnabled,
      piece_limiter_mode: result.data.pieceLimiterMode,
      piece_limiter_max_per_person: result.data.pieceLimiterMaxPerPerson,
      updated_at: result.data.updatedAt.toISOString(),
      updated_by: result.data.updatedBy,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET reservation-settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH - Update reservation settings
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const supabase = createAdminClient();
    const repository = new SupabaseReservationSettingsRepository(supabase);
    const updateReservationSettings = new UpdateReservationSettingsUseCase(repository);

    // Build UpdateReservationSettingsData (supporting both camelCase and snake_case)
    const updateData: UpdateReservationSettingsData = {};

    if (body.dayBeforeReminderEnabled !== undefined || body.day_before_reminder_enabled !== undefined) {
      updateData.dayBeforeReminderEnabled = body.dayBeforeReminderEnabled ?? body.day_before_reminder_enabled;
    }
    if (body.dayBeforeReminderHours !== undefined || body.day_before_reminder_hours !== undefined) {
      updateData.dayBeforeReminderHours = body.dayBeforeReminderHours ?? body.day_before_reminder_hours;
    }
    if (body.sameDayReminderEnabled !== undefined || body.same_day_reminder_enabled !== undefined) {
      updateData.sameDayReminderEnabled = body.sameDayReminderEnabled ?? body.same_day_reminder_enabled;
    }
    if (body.sameDayReminderHours !== undefined || body.same_day_reminder_hours !== undefined) {
      updateData.sameDayReminderHours = body.sameDayReminderHours ?? body.same_day_reminder_hours;
    }
    if (body.rodizioWastePolicyEnabled !== undefined || body.rodizio_waste_policy_enabled !== undefined) {
      updateData.rodizioWastePolicyEnabled = body.rodizioWastePolicyEnabled ?? body.rodizio_waste_policy_enabled;
    }
    if (body.rodizioWasteFeePerPiece !== undefined || body.rodizio_waste_fee_per_piece !== undefined) {
      updateData.rodizioWasteFeePerPiece = body.rodizioWasteFeePerPiece ?? body.rodizio_waste_fee_per_piece;
    }
    if (body.waiterAlertMinutes !== undefined || body.waiter_alert_minutes !== undefined) {
      updateData.waiterAlertMinutes = body.waiterAlertMinutes ?? body.waiter_alert_minutes;
    }
    if (body.pieceLimiterEnabled !== undefined || body.piece_limiter_enabled !== undefined) {
      updateData.pieceLimiterEnabled = body.pieceLimiterEnabled ?? body.piece_limiter_enabled;
    }
    if (body.pieceLimiterMode !== undefined || body.piece_limiter_mode !== undefined) {
      updateData.pieceLimiterMode = body.pieceLimiterMode ?? body.piece_limiter_mode;
    }
    if (body.pieceLimiterMaxPerPerson !== undefined || body.piece_limiter_max_per_person !== undefined) {
      updateData.pieceLimiterMaxPerPerson = body.pieceLimiterMaxPerPerson ?? body.piece_limiter_max_per_person;
    }

    const result = await updateReservationSettings.execute({
      data: updateData,
      updatedBy: auth.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Map to database format for backwards compatibility
    const data = {
      id: result.data.id,
      day_before_reminder_enabled: result.data.dayBeforeReminderEnabled,
      day_before_reminder_hours: result.data.dayBeforeReminderHours,
      same_day_reminder_enabled: result.data.sameDayReminderEnabled,
      same_day_reminder_hours: result.data.sameDayReminderHours,
      rodizio_waste_policy_enabled: result.data.rodizioWastePolicyEnabled,
      rodizio_waste_fee_per_piece: result.data.rodizioWasteFeePerPiece,
      waiter_alert_minutes: result.data.waiterAlertMinutes,
      piece_limiter_enabled: result.data.pieceLimiterEnabled,
      piece_limiter_mode: result.data.pieceLimiterMode,
      piece_limiter_max_per_person: result.data.pieceLimiterMaxPerPerson,
      updated_at: result.data.updatedAt.toISOString(),
      updated_by: result.data.updatedBy,
    };

    console.info(`✅ Reservation settings updated by ${auth.email}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH reservation-settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
