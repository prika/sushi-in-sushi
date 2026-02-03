import { createClient } from "@/lib/supabase/server";

/**
 * Log an activity in the activity log
 */
export async function logActivity(
  staffId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("activity_log").insert({
      staff_id: staffId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || null,
    });
  } catch (error) {
    // Don't throw errors for logging - just log to console
    console.error("Error logging activity:", error);
  }
}
