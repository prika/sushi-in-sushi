import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  TableFullStatus,
  TableStatus,
  Session,
} from "@/types/database";

interface UseTableManagementOptions {
  location?: string;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

interface UseTableManagementReturn {
  tables: TableFullStatus[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  changeTableStatus: (
    tableId: string,
    newStatus: TableStatus,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  markTableInactive: (
    tableId: string,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;
  reactivateTable: (
    tableId: string
  ) => Promise<{ success: boolean; error?: string }>;
  startWalkInSession: (
    tableId: string,
    isRodizio: boolean,
    numPeople: number
  ) => Promise<{ success: boolean; session?: Session; error?: string }>;
  requestBill: (
    sessionId: string
  ) => Promise<{ success: boolean; error?: string }>;
  closeSession: (
    sessionId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

// Helper to bypass Supabase type checking for new tables/views
function getSupabaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase as unknown as {
    from: (table: string) => {
      select: (fields: string) => ReturnType<ReturnType<typeof createClient>["from"]>["select"];
      insert: (data: Record<string, unknown>) => ReturnType<ReturnType<typeof createClient>["from"]>["insert"];
      update: (data: Record<string, unknown>) => ReturnType<ReturnType<typeof createClient>["from"]>["update"];
    };
  };
}

export function useTableManagement(
  options: UseTableManagementOptions = {}
): UseTableManagementReturn {
  const { location, refreshInterval = 30000, enableRealtime = true } = options;

  const [tables, setTables] = useState<TableFullStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTables = useCallback(async () => {
    try {
      // Try to fetch from view first (if migration has been run)
      const extendedSupabase = getSupabaseQuery(supabase);
      let viewQuery = extendedSupabase.from("tables_full_status").select("*");
      if (location) {
        viewQuery = viewQuery.eq("location", location);
      }

      const { data: viewData, error: viewError } = await viewQuery.order("number");

      // Also fetch waiter assignments
      const { data: waiterData } = await extendedSupabase
        .from("waiter_assignments")
        .select("table_id, staff_id, staff_name");

      const waiterMap = new Map(
        (waiterData || []).map((w: { table_id: string; staff_id: string; staff_name: string }) => [
          w.table_id,
          { waiter_id: w.staff_id, waiter_name: w.staff_name },
        ])
      );

      if (!viewError && viewData) {
        const tablesWithWaiter = (viewData as TableFullStatus[]).map((t) => ({
          ...t,
          ...(waiterMap.get(t.id) || {}),
        }));
        setTables(tablesWithWaiter);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Fallback: fetch from tables directly
      let tablesQuery = supabase
        .from("tables")
        .select("*")
        .eq("is_active", true);

      if (location) {
        tablesQuery = tablesQuery.eq("location", location);
      }

      const { data: tablesData, error: tablesError } = await tablesQuery.order("number");

      if (tablesError) throw tablesError;

      // Map to TableFullStatus format
      const mappedTables: TableFullStatus[] = (tablesData || []).map(
        (t) => ({
          ...t,
          status: "available" as TableStatus,
          session_id: null,
          session_started: null,
          is_rodizio: null,
          session_people: null,
          session_total: null,
          status_label: "Livre",
          minutes_occupied: null,
          ...(waiterMap.get(t.id) || {}),
        })
      );

      setTables(mappedTables);
      setError(null);
    } catch (err) {
      console.error("Error fetching tables:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar mesas"
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, location]);

  // Initial fetch
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchTables, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTables, refreshInterval]);

  // Real-time subscriptions
  useEffect(() => {
    if (!enableRealtime) return;

    const tablesChannel = supabase
      .channel("tables-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel("sessions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [supabase, enableRealtime, fetchTables]);

  const logStatusChange = async (
    tableId: string,
    oldStatus: TableStatus | null,
    newStatus: TableStatus,
    reason?: string,
    sessionId?: string
  ) => {
    try {
      const historyEntry = {
        table_id: tableId,
        old_status: oldStatus,
        new_status: newStatus,
        reason: reason || null,
        session_id: sessionId || null,
        changed_by: null,
        reservation_id: null,
      };

      const extendedSupabase = getSupabaseQuery(supabase);
      await extendedSupabase.from("table_status_history").insert(historyEntry);
    } catch {
      // Ignore errors if table doesn't exist yet
      console.log("table_status_history not available yet");
    }
  };

  const changeTableStatus = async (
    tableId: string,
    newStatus: TableStatus,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get current status
      const currentTable = tables.find((t) => t.id === tableId);
      const oldStatus = (currentTable?.status as TableStatus) || null;

      const extendedSupabase = getSupabaseQuery(supabase);
      const { error: updateError } = await extendedSupabase
        .from("tables")
        .update({
          status: newStatus,
          status_note: reason || null,
        })
        .eq("id", tableId);

      if (updateError) throw updateError;

      await logStatusChange(tableId, oldStatus, newStatus, reason);
      await fetchTables();

      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao alterar estado";
      return { success: false, error: errorMessage };
    }
  };

  const markTableInactive = async (
    tableId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if table has active session
      const table = tables.find((t) => t.id === tableId);
      if (table?.session_id) {
        return {
          success: false,
          error: "Não é possível desativar mesa com sessão ativa",
        };
      }

      return await changeTableStatus(tableId, "inactive", reason);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao desativar mesa";
      return { success: false, error: errorMessage };
    }
  };

  const reactivateTable = async (
    tableId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const extendedSupabase = getSupabaseQuery(supabase);
      const { error: updateError } = await extendedSupabase
        .from("tables")
        .update({
          status: "available",
          status_note: null,
        })
        .eq("id", tableId);

      if (updateError) throw updateError;

      const table = tables.find((t) => t.id === tableId);
      await logStatusChange(
        tableId,
        (table?.status as TableStatus) || null,
        "available",
        "Mesa reativada"
      );
      await fetchTables();

      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao reativar mesa";
      return { success: false, error: errorMessage };
    }
  };

  const startWalkInSession = async (
    tableId: string,
    isRodizio: boolean,
    numPeople: number
  ): Promise<{ success: boolean; session?: Session; error?: string }> => {
    try {
      // Check if table is available
      const table = tables.find((t) => t.id === tableId);
      if (table?.status === "occupied") {
        return { success: false, error: "Mesa já está ocupada" };
      }
      if (table?.status === "inactive") {
        return { success: false, error: "Mesa está inativa" };
      }

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          table_id: tableId,
          is_rodizio: isRodizio,
          num_people: numPeople,
          status: "active",
          total_amount: 0,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Update table status (trigger should do this, but just in case)
      const extendedSupabase = getSupabaseQuery(supabase);
      await extendedSupabase
        .from("tables")
        .update({
          status: "occupied",
          current_session_id: session.id,
        })
        .eq("id", tableId);

      await logStatusChange(
        tableId,
        (table?.status as TableStatus) || "available",
        "occupied",
        "Sessão iniciada (walk-in)",
        session.id
      );

      await fetchTables();

      return { success: true, session: session as Session };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao iniciar sessão";
      return { success: false, error: errorMessage };
    }
  };

  const requestBill = async (
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const extendedSupabase = getSupabaseQuery(supabase);
      const { error: updateError } = await extendedSupabase
        .from("sessions")
        .update({
          bill_requested_at: new Date().toISOString(),
          status: "pending_payment",
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      await fetchTables();

      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao pedir conta";
      return { success: false, error: errorMessage };
    }
  };

  const closeSession = async (
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from("sessions")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      // The trigger should update the table status
      await fetchTables();

      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao fechar sessão";
      return { success: false, error: errorMessage };
    }
  };

  return {
    tables,
    isLoading,
    error,
    refresh: fetchTables,
    changeTableStatus,
    markTableInactive,
    reactivateTable,
    startWalkInSession,
    requestBill,
    closeSession,
  };
}
