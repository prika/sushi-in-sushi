import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// Use the actual database row type for activity_log
type ActivityLogRow = Database["public"]["Tables"]["activity_log"]["Row"];

// =============================================
// TYPES
// =============================================

export type ActivityAction =
  // Auth events
  | "login"
  | "logout"
  | "login_failed"
  | "password_changed"
  // Staff management
  | "staff_created"
  | "staff_updated"
  | "staff_deleted"
  | "staff_role_changed"
  | "staff_activated"
  | "staff_deactivated"
  // Session management
  | "session_started"
  | "session_closed"
  | "session_payment_requested"
  | "session_paid"
  // Order management
  | "order_created"
  | "order_status_changed"
  | "order_cancelled"
  | "order_deleted"
  // Table management
  | "table_created"
  | "table_updated"
  | "table_deleted"
  | "table_status_changed"
  | "waiter_assigned"
  | "waiter_unassigned"
  // Reservation management
  | "reservation_created"
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "reservation_completed"
  | "reservation_no_show"
  // Product management
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "product_availability_changed"
  // Category management
  | "category_created"
  | "category_updated"
  | "category_deleted"
  // Closure management
  | "closure_created"
  | "closure_updated"
  | "closure_deleted"
  // Customer management
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "customer_points_added"
  // Export
  | "data_exported"
  // Generic
  | "view"
  | "create"
  | "update"
  | "delete";

export type EntityType =
  | "staff"
  | "session"
  | "order"
  | "table"
  | "reservation"
  | "product"
  | "category"
  | "customer"
  | "closure"
  | "waiter_call"
  | "export";

// Activity log entry with optional staff info (for joined queries)
export interface ActivityLogRowWithStaff extends ActivityLogRow {
  staff?: {
    name: string;
    email: string;
  } | null;
}

export interface ActivityLogRowOptions {
  staffId?: string;
  action: ActivityAction | string;
  entityType?: EntityType | string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// =============================================
// MAIN LOGGING FUNCTION
// =============================================

/**
 * Log an activity in the activity log
 */
export async function logActivity(_options: ActivityLogRowOptions): Promise<void>;
export async function logActivity(
  _staffId: string,
  _action: string,
  _entityType?: string,
  _entityId?: string,
  _details?: Record<string, unknown>
): Promise<void>;
export async function logActivity(
  staffIdOrOptions: string | ActivityLogRowOptions,
  action?: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();

    let logData: {
      staff_id: string | null;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      details: Record<string, unknown> | null;
      ip_address?: string | null;
    };

    if (typeof staffIdOrOptions === "object") {
      // New signature with options object
      logData = {
        staff_id: staffIdOrOptions.staffId || null,
        action: staffIdOrOptions.action,
        entity_type: staffIdOrOptions.entityType || null,
        entity_id: staffIdOrOptions.entityId || null,
        details: staffIdOrOptions.details || null,
        ip_address: staffIdOrOptions.ipAddress || null,
      };
    } else {
      // Legacy signature
      logData = {
        staff_id: staffIdOrOptions,
        action: action!,
        entity_type: entityType || null,
        entity_id: entityId || null,
        details: details || null,
      };
    }

    await supabase.from("activity_log").insert(logData);
  } catch (error) {
    // Don't throw errors for logging - just log to console
    console.error("Error logging activity:", error);
  }
}

// =============================================
// SPECIALIZED LOGGING FUNCTIONS
// =============================================

/**
 * Log a staff management action
 */
export async function logStaffActivity(
  performedByStaffId: string,
  action: "created" | "updated" | "deleted" | "role_changed" | "activated" | "deactivated",
  targetStaffId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId: performedByStaffId,
    action: `staff_${action}` as ActivityAction,
    entityType: "staff",
    entityId: targetStaffId,
    details,
  });
}

/**
 * Log a session action
 */
export async function logSessionActivity(
  staffId: string | undefined,
  action: "started" | "closed" | "payment_requested" | "paid",
  sessionId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId,
    action: `session_${action}` as ActivityAction,
    entityType: "session",
    entityId: sessionId,
    details,
  });
}

/**
 * Log an order action
 */
export async function logOrderActivity(
  staffId: string | undefined,
  action: "created" | "status_changed" | "cancelled" | "deleted",
  orderId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId,
    action: `order_${action}` as ActivityAction,
    entityType: "order",
    entityId: orderId,
    details,
  });
}

/**
 * Log a table action
 */
export async function logTableActivity(
  staffId: string,
  action: "created" | "updated" | "deleted" | "status_changed",
  tableId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId,
    action: `table_${action}` as ActivityAction,
    entityType: "table",
    entityId: tableId,
    details,
  });
}

/**
 * Log a reservation action
 */
export async function logReservationActivity(
  staffId: string | undefined,
  action: "created" | "confirmed" | "cancelled" | "completed" | "no_show",
  reservationId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId,
    action: `reservation_${action}` as ActivityAction,
    entityType: "reservation",
    entityId: reservationId,
    details,
  });
}

/**
 * Log a product action
 */
export async function logProductActivity(
  staffId: string,
  action: "created" | "updated" | "deleted" | "availability_changed",
  productId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId,
    action: `product_${action}` as ActivityAction,
    entityType: "product",
    entityId: productId,
    details,
  });
}

/**
 * Log an export action
 */
export async function logExportActivity(
  staffId: string,
  exportType: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    staffId,
    action: "data_exported",
    entityType: "export",
    details: {
      exportType,
      ...details,
    },
  });
}

/**
 * Log an auth event (login, logout, etc.)
 */
export async function logAuthActivity(
  staffId: string | undefined,
  action: "login" | "logout" | "login_failed" | "password_changed",
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await logActivity({
    staffId,
    action,
    entityType: "staff",
    entityId: staffId,
    details,
    ipAddress,
  });
}

// =============================================
// QUERY FUNCTIONS
// =============================================

/**
 * Get recent activity for a staff member
 */
export async function getStaffActivityLogRow(
  staffId: string,
  limit: number = 50
): Promise<ActivityLogRow[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching activity log:", error);
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * Get recent activity for an entity
 */
export async function getEntityActivityLog(
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<ActivityLogRowWithStaff[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("activity_log")
      .select("*, staff:staff_id(name, email)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching activity log:", error);
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * Get all recent activity (admin view)
 */
export async function getRecentActivityLog(
  limit: number = 100,
  filters?: {
    action?: string;
    entityType?: EntityType;
    staffId?: string;
    since?: Date;
  }
): Promise<ActivityLogRowWithStaff[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("activity_log")
      .select("*, staff:staff_id(name, email)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters?.action) {
      query = query.eq("action", filters.action);
    }
    if (filters?.entityType) {
      query = query.eq("entity_type", filters.entityType);
    }
    if (filters?.staffId) {
      query = query.eq("staff_id", filters.staffId);
    }
    if (filters?.since) {
      query = query.gte("created_at", filters.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activity log:", error);
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
}
