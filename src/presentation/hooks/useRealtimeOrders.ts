"use client";

import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { createOrderChannelConfig } from "@/infrastructure/realtime/channels";
import type { OrderEvent, RealtimeEnvelope } from "@/infrastructure/realtime/events";
import { useRealtimeStoreRef } from "./useRealtimeStore";

interface UseRealtimeOrdersOptions {
  /** Filter by session ID (customer/waiter per-table view) */
  sessionId?: string;
  /** Filter by location (kitchen view) */
  location?: string;
  /** Only these statuses (kitchen: ["pending", "preparing", "ready"]) */
  statuses?: string[];
  /** Enable/disable (default: true) */
  enabled?: boolean;
  /** Callback when any order event arrives */
  onEvent?: (_event: RealtimeEnvelope<OrderEvent>) => void;
  /** Callback specifically for new orders (kitchen sound, toast) */
  onNewOrder?: (_event: RealtimeEnvelope<OrderEvent>) => void;
  /** Callback for status changes */
  onStatusChange?: (_event: RealtimeEnvelope<OrderEvent>) => void;
}

/**
 * useRealtimeOrders — real-time order events with React Query invalidation.
 *
 * Kitchen usage:
 *   const { latestEvent } = useRealtimeOrders({
 *     location: "circunvalacao",
 *     statuses: ["pending", "preparing", "ready"],
 *     onNewOrder: (e) => playSound(),
 *   });
 *
 * Customer usage:
 *   const { latestEvent, broadcastNewOrder } = useRealtimeOrders({
 *     sessionId: session.id,
 *   });
 */
export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const config = useMemo(
    () => createOrderChannelConfig({
      sessionId: options.sessionId,
      location: options.location,
      statuses: options.statuses,
    }),
    [options.sessionId, options.location, options.statuses],
  );

  const { event, store } = useRealtimeStoreRef<OrderEvent>(
    supabase,
    config,
    options.enabled !== false,
  );

  // Fire callbacks and invalidate caches on new events
  if (event) {
    queueMicrotask(() => {
      options.onEvent?.(event);

      if (event.event === "order:created") {
        options.onNewOrder?.(event);
      }
      if (event.event === "order:status_changed") {
        options.onStatusChange?.(event);
      }
    });

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["session-orders", options.sessionId] });
  }

  /**
   * Broadcast a new order notification (customer → kitchen/waiter, <100ms).
   * Sent ALONGSIDE the DB insert for instant feedback.
   */
  const broadcastNewOrder = useCallback(
    (payload: {
      sessionId: string;
      customerName?: string;
      itemCount: number;
      deviceId?: string;
    }) => {
      store.broadcast("order:created", payload);
    },
    [store],
  );

  return {
    /** Latest order event (or null) */
    latestEvent: event,
    /** Send instant new-order notification */
    broadcastNewOrder,
    /** Direct store access */
    store,
  };
}
