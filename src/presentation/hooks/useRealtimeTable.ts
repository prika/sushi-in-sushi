"use client";

import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { createTableChannelConfig } from "@/infrastructure/realtime/channels";
import type { TableEvent, RealtimeEnvelope } from "@/infrastructure/realtime/events";
import { useRealtimeStoreRef } from "./useRealtimeStore";

interface UseRealtimeTableOptions {
  /** Filter by location slug */
  location?: string;
  /** Filter by specific table ID */
  tableId?: string;
  /** Enable/disable (default: true) */
  enabled?: boolean;
  /** Callback when any table event arrives */
  onEvent?: (_event: RealtimeEnvelope<TableEvent>) => void;
}

/**
 * useRealtimeTable — real-time table events with React Query invalidation.
 *
 * Waiter usage:
 *   const { latestEvent, broadcastOpenRequest } = useRealtimeTable({ location: "circunvalacao" });
 *
 * Customer usage:
 *   const { latestEvent } = useRealtimeTable({ tableId: "abc-123" });
 */
export function useRealtimeTable(options: UseRealtimeTableOptions = {}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const config = useMemo(
    () => createTableChannelConfig({
      location: options.location,
      tableId: options.tableId,
    }),
    [options.location, options.tableId],
  );

  const { event, store } = useRealtimeStoreRef<TableEvent>(
    supabase,
    config,
    options.enabled !== false,
  );

  // Invalidate React Query caches when events arrive
  // This is done via the snapshot change — useSyncExternalStore triggers re-render,
  // and we use the render itself to trigger invalidation (no useEffect needed)
  if (event && options.onEvent) {
    // Schedule callback after render (via microtask to avoid setState-during-render)
    queueMicrotask(() => options.onEvent!(event));
  }

  if (event) {
    // Invalidate relevant queries based on event type
    switch (event.event) {
      case "table:session_opened":
      case "table:session_closed":
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        break;
      case "table:status_changed":
      case "table:preferences_updated":
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        break;
      case "table:open_requested":
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        break;
    }
  }

  /**
   * Broadcast an instant table open request (customer → waiter, <100ms).
   */
  const broadcastOpenRequest = useCallback(
    (payload: {
      tableId: string;
      tableNumber: number;
      location: string;
      requestedRodizio: boolean | null;
      requestedNumPeople: number | null;
    }) => {
      store.broadcast("table:open_requested", payload);
    },
    [store],
  );

  /**
   * Broadcast customer preferences update (customer → waiter, <100ms).
   */
  const broadcastPreferences = useCallback(
    (payload: {
      tableId: string;
      tableNumber: number;
      requestedRodizio: boolean | null;
      requestedNumPeople: number | null;
    }) => {
      store.broadcast("table:preferences_updated", payload);
    },
    [store],
  );

  return {
    /** Latest table event (or null) */
    latestEvent: event,
    /** Send instant open request to waiters */
    broadcastOpenRequest,
    /** Send instant preference update to waiters */
    broadcastPreferences,
    /** Direct store access for advanced usage */
    store,
  };
}
