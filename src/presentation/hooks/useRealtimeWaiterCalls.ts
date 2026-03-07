"use client";

import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { createWaiterCallChannelConfig } from "@/infrastructure/realtime/channels";
import type { WaiterCallEvent, RealtimeEnvelope } from "@/infrastructure/realtime/events";
import { useRealtimeStoreRef } from "./useRealtimeStore";

interface UseRealtimeWaiterCallsOptions {
  /** Filter by location */
  location?: string;
  /** Enable/disable (default: true) */
  enabled?: boolean;
  /** Callback when any call event arrives */
  onEvent?: (_event: RealtimeEnvelope<WaiterCallEvent>) => void;
  /** Callback specifically for new calls (sound, toast) */
  onNewCall?: (_event: RealtimeEnvelope<WaiterCallEvent>) => void;
}

/**
 * useRealtimeWaiterCalls — real-time waiter call events with React Query invalidation.
 *
 * Waiter usage:
 *   const { latestEvent } = useRealtimeWaiterCalls({
 *     location: "circunvalacao",
 *     onNewCall: (e) => playAlertSound(),
 *   });
 *
 * Customer usage:
 *   const { broadcastCall } = useRealtimeWaiterCalls();
 */
export function useRealtimeWaiterCalls(
  options: UseRealtimeWaiterCallsOptions = {},
) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const config = useMemo(
    () => createWaiterCallChannelConfig({ location: options.location }),
    [options.location],
  );

  const { event, store } = useRealtimeStoreRef<WaiterCallEvent>(
    supabase,
    config,
    options.enabled !== false,
  );

  // Fire callbacks and invalidate caches
  if (event) {
    queueMicrotask(() => {
      options.onEvent?.(event);
      if (event.event === "call:created") {
        options.onNewCall?.(event);
      }
    });

    queryClient.invalidateQueries({ queryKey: ["waiter-calls"] });
  }

  /**
   * Broadcast an instant waiter call (customer → waiter, <100ms).
   */
  const broadcastCall = useCallback(
    (payload: {
      tableId: string;
      tableNumber: number;
      callType: "assistance" | "bill" | "order";
      customerName?: string;
    }) => {
      store.broadcast("call:created", payload);
    },
    [store],
  );

  return {
    /** Latest call event (or null) */
    latestEvent: event,
    /** Send instant call notification to waiters */
    broadcastCall,
    /** Direct store access */
    store,
  };
}
