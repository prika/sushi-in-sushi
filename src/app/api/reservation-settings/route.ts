import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import type { ReservationSettings, ReservationSettingsUpdate } from "@/types/database";

// Helper to get typed supabase query
function getExtendedSupabase(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
}

// GET - Fetch reservation settings
export async function GET() {
  try {
    // Verify admin authentication
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const { data, error } = await extendedSupabase
      .from("reservation_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching reservation settings:", error);
      // Return default settings if table doesn't exist or no data
      const defaultSettings: ReservationSettings = {
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
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(data as ReservationSettings);
  } catch (error) {
    console.error("Error in GET reservation-settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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

    const body: ReservationSettingsUpdate = await request.json();

    // Validate the update data
    const allowedFields = [
      "day_before_reminder_enabled",
      "day_before_reminder_hours",
      "same_day_reminder_enabled",
      "same_day_reminder_hours",
      "rodizio_waste_policy_enabled",
      "rodizio_waste_fee_per_piece",
    ];

    const updateData: Record<string, unknown> = {
      updated_by: auth.id,
    };

    for (const field of allowedFields) {
      if (field in body) {
        const value = body[field as keyof ReservationSettingsUpdate];

        // Validate hours are positive integers
        if (field.endsWith("_hours") && typeof value === "number") {
          if (value < 1 || value > 168) { // Max 1 week
            return NextResponse.json(
              { error: `${field} must be between 1 and 168 hours` },
              { status: 400 }
            );
          }
        }

        // Validate fee is positive
        if (field === "rodizio_waste_fee_per_piece" && typeof value === "number") {
          if (value < 0) {
            return NextResponse.json(
              { error: "Waste fee cannot be negative" },
              { status: 400 }
            );
          }
        }

        updateData[field] = value;
      }
    }

    const supabase = await createClient();
    const extendedSupabase = getExtendedSupabase(supabase);

    const { data, error } = await extendedSupabase
      .from("reservation_settings")
      .update(updateData)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      console.error("Error updating reservation settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    console.log(`✅ Reservation settings updated by ${auth.email}`);
    return NextResponse.json(data as ReservationSettings);
  } catch (error) {
    console.error("Error in PATCH reservation-settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
