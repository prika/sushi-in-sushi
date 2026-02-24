import { createClient } from "@/lib/supabase/server";

/**
 * Assign a table to a waiter
 */
export async function assignTableToWaiter(
  waiterId: string,
  tableId: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("waiter_tables").insert({
      staff_id: waiterId,
      table_id: tableId,
    });

    if (error) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a table assignment from a waiter
 */
export async function removeTableFromWaiter(
  waiterId: string,
  tableId: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("waiter_tables")
      .delete()
      .eq("staff_id", waiterId)
      .eq("table_id", tableId);

    if (error) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all tables assigned to a waiter
 */
export async function getWaiterTables(
  waiterId: string,
): Promise<{ id: string; number: number; name: string; location: string }[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("waiter_tables")
      .select(
        `
        table:tables(id, number, name, location)
      `,
      )
      .eq("staff_id", waiterId);

    if (error || !data) return [];

    return data
      .filter((d) => d.table)
      .map(
        (d) =>
          d.table as {
            id: string;
            number: number;
            name: string;
            location: string;
          },
      );
  } catch {
    return [];
  }
}
