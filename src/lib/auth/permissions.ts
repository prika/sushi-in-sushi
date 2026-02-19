import { createClient } from "@/lib/supabase/server";
import type { RoleName, AuthUser } from "@/types/database";
import { getStaffById } from "./staff";

/**
 * Get all tables accessible by a user based on their role
 */
export async function getAccessibleTables(
  userId: string,
): Promise<{ id: string; number: number; name: string }[]> {
  try {
    const supabase = await createClient();

    // First, get the user's role
    const staff = await getStaffById(userId);
    if (!staff || !staff.role) return [];

    // Admin and kitchen can see all tables (at their location)
    if (staff.role.name === "admin" || staff.role.name === "kitchen") {
      const query = supabase
        .from("tables")
        .select("id, number, name")
        .eq("is_active", true);

      // Filter by location if staff has a specific location
      if (staff.location) {
        query.eq("location", staff.location);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    }

    // Waiters can only see their assigned tables
    if (staff.role.name === "waiter") {
      const { data, error } = await supabase
        .from("waiter_tables")
        .select(
          `
          table:tables(id, number, name)
        `,
        )
        .eq("staff_id", userId);

      if (error || !data) return [];

      return data
        .filter((d) => d.table)
        .map((d) => d.table as { id: string; number: number; name: string });
    }

    return [];
  } catch (error) {
    console.error("Error fetching accessible tables:", error);
    return [];
  }
}

/**
 * Check if a user can access a specific table
 */
export async function canAccessTable(
  userId: string,
  tableId: string,
): Promise<boolean> {
  try {
    const staff = await getStaffById(userId);
    if (!staff || !staff.role) return false;

    // Admin has access to all tables
    if (staff.role.name === "admin") return true;

    // Kitchen has access to all tables (view only)
    if (staff.role.name === "kitchen") return true;

    // Waiters can only access assigned tables
    if (staff.role.name === "waiter") {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("waiter_tables")
        .select("id")
        .eq("staff_id", userId)
        .eq("table_id", tableId)
        .single();

      return !error && !!data;
    }

    return false;
  } catch (error) {
    console.error("Error checking table access:", error);
    return false;
  }
}

/**
 * Check if a user can edit an order
 */
export async function canEditOrder(
  userId: string,
  orderId: string,
): Promise<boolean> {
  try {
    const staff = await getStaffById(userId);
    if (!staff || !staff.role) return false;

    // Admin can edit all orders
    if (staff.role.name === "admin") return true;

    // Kitchen can update order status (preparing, ready)
    if (staff.role.name === "kitchen") return true;

    // Waiters can edit orders for their assigned tables
    if (staff.role.name === "waiter") {
      const supabase = await createClient();

      // Get the order's session and table
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          session:sessions(table_id)
        `,
        )
        .eq("id", orderId)
        .single();

      if (orderError || !order || !order.session) return false;

      // Check if waiter has access to this table
      return canAccessTable(userId, order.session.table_id);
    }

    return false;
  } catch (error) {
    console.error("Error checking order edit permission:", error);
    return false;
  }
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: AuthUser | null, roles: RoleName[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, ["admin"]);
}

/**
 * Check if user is kitchen staff
 */
export function isKitchen(user: AuthUser | null): boolean {
  return hasRole(user, ["kitchen"]);
}

/**
 * Check if user is waiter
 */
export function isWaiter(user: AuthUser | null): boolean {
  return hasRole(user, ["waiter"]);
}
