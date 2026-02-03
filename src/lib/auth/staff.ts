import { createClient } from "@/lib/supabase/server";
import type { StaffWithRole } from "@/types/database";

/**
 * Get a staff member by ID with role information
 */
export async function getStaffById(id: string): Promise<StaffWithRole | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("staff")
      .select(
        `
        *,
        role:roles(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      role: data.role,
    } as StaffWithRole;
  } catch (error) {
    console.error("Error fetching staff:", error);
    return null;
  }
}

/**
 * Get all staff members with roles
 */
export async function getAllStaff(): Promise<StaffWithRole[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("staff").select(
      `
        *,
        role:roles(*)
      `,
    );

    if (error || !data) return [];

    return data as StaffWithRole[];
  } catch (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
}
