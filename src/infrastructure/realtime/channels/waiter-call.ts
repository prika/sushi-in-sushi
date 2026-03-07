/**
 * Waiter Call Channel — real-time waiter call events.
 *
 * Listens to:
 *  - postgres_changes on `waiter_calls` (new calls, status changes)
 *  - broadcast: `call:created` (instant notification from customer)
 */

import type { ChannelConfig } from "../RealtimeStore";
import type {
  WaiterCallEvent,
  RealtimeEnvelope,
  RealtimeEventSource,
} from "../events";

interface WaiterCallChannelOptions {
  /** Filter by location */
  location?: string;
}

export function createWaiterCallChannelConfig(
  options: WaiterCallChannelOptions = {},
): ChannelConfig<WaiterCallEvent> {
  const suffix = options.location || "all";

  return {
    name: `rt-calls-${suffix}`,

    postgresChanges: [
      {
        table: "waiter_calls",
        event: "*",
      },
    ],

    broadcasts: [
      { event: "call:created" },
    ],

    mapEvent(
      raw: Record<string, unknown>,
      source: RealtimeEventSource,
      broadcastEvent?: string,
    ): RealtimeEnvelope<WaiterCallEvent> | null {
      const now = new Date().toISOString();

      // ── Broadcast events (instant) ───────────────────────────────
      if (source === "broadcast" && broadcastEvent === "call:created") {
        const payload = (raw as { payload?: Record<string, unknown> }).payload ?? raw;
        return {
          event: "call:created",
          payload,
          source,
          timestamp: now,
        };
      }

      // ── Postgres changes ─────────────────────────────────────────
      const eventType = (raw as { eventType?: string }).eventType;
      const newRow = (raw as { new?: Record<string, unknown> }).new;

      if (!newRow) return null;

      // New call
      if (eventType === "INSERT") {
        return {
          event: "call:created",
          payload: {
            callId: newRow.id,
            tableId: newRow.table_id,
            tableNumber: 0, // Resolved by consumer
            callType: newRow.type ?? "assistance",
          },
          source,
          timestamp: now,
        };
      }

      // Status changes
      if (eventType === "UPDATE") {
        if (newRow.status === "acknowledged") {
          return {
            event: "call:acknowledged",
            payload: {
              callId: newRow.id,
              tableId: newRow.table_id,
              tableNumber: 0,
              callType: newRow.type ?? "assistance",
            },
            source,
            timestamp: now,
          };
        }

        if (newRow.status === "resolved") {
          return {
            event: "call:resolved",
            payload: {
              callId: newRow.id,
              tableId: newRow.table_id,
              tableNumber: 0,
              callType: newRow.type ?? "assistance",
            },
            source,
            timestamp: now,
          };
        }
      }

      return null;
    },
  };
}
