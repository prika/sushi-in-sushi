/**
 * Table Channel — real-time table events for waiters and customers.
 *
 * Listens to:
 *  - postgres_changes on `tables` (status changes, customer preferences)
 *  - postgres_changes on `sessions` (session opened/closed)
 *  - broadcast: `table:open_requested` (instant, from customer scan)
 */

import type { ChannelConfig } from "../RealtimeStore";
import type {
  TableEvent,
  RealtimeEnvelope,
  RealtimeEventSource,
} from "../events";

interface TableChannelOptions {
  /** Filter by location slug (e.g. "circunvalacao") */
  location?: string;
  /** Filter by specific table ID */
  tableId?: string;
}

export function createTableChannelConfig(
  options: TableChannelOptions = {},
): ChannelConfig<TableEvent> {
  const suffix = options.tableId || options.location || "all";

  return {
    name: `rt-tables-${suffix}`,

    postgresChanges: [
      {
        table: "tables",
        event: "UPDATE",
        filter: options.location
          ? `location=eq.${options.location}`
          : options.tableId
            ? `id=eq.${options.tableId}`
            : undefined,
      },
      {
        table: "sessions",
        event: "*",
        filter: options.tableId
          ? `table_id=eq.${options.tableId}`
          : undefined,
      },
    ],

    broadcasts: [
      { event: "table:open_requested" },
      { event: "table:preferences_updated" },
    ],

    mapEvent(
      raw: Record<string, unknown>,
      source: RealtimeEventSource,
      broadcastEvent?: string,
    ): RealtimeEnvelope<TableEvent> | null {
      const now = new Date().toISOString();

      // ── Broadcast events (instant) ───────────────────────────────
      if (source === "broadcast" && broadcastEvent) {
        const payload = (raw as { payload?: Record<string, unknown> }).payload ?? raw;
        return {
          event: broadcastEvent as TableEvent,
          payload,
          source,
          timestamp: now,
        };
      }

      // ── Postgres changes ─────────────────────────────────────────
      const table = (raw as { table?: string }).table;
      const eventType = (raw as { eventType?: string }).eventType;
      const newRow = (raw as { new?: Record<string, unknown> }).new;
      const oldRow = (raw as { old?: Record<string, unknown> }).old;

      if (table === "tables" && newRow) {
        // Detect preference updates
        const prefsChanged =
          oldRow &&
          (newRow.customer_requested_rodizio !== oldRow.customer_requested_rodizio ||
            newRow.customer_requested_num_people !== oldRow.customer_requested_num_people);

        if (prefsChanged) {
          return {
            event: "table:preferences_updated",
            payload: {
              tableId: newRow.id,
              tableNumber: newRow.number,
              requestedRodizio: newRow.customer_requested_rodizio ?? null,
              requestedNumPeople: newRow.customer_requested_num_people ?? null,
            },
            source,
            timestamp: now,
          };
        }

        // Generic status change
        if (oldRow && newRow.status !== oldRow.status) {
          return {
            event: "table:status_changed",
            payload: {
              tableId: newRow.id,
              status: newRow.status,
              previousStatus: oldRow.status,
            },
            source,
            timestamp: now,
          };
        }
      }

      if (table === "sessions") {
        if (eventType === "INSERT" && newRow) {
          return {
            event: "table:session_opened",
            payload: {
              tableId: newRow.table_id,
              sessionId: newRow.id,
              tableNumber: 0, // Resolved by consumer
              isRodizio: newRow.is_rodizio ?? false,
              numPeople: newRow.num_people ?? 2,
            },
            source,
            timestamp: now,
          };
        }

        if (eventType === "UPDATE" && newRow?.status === "closed") {
          return {
            event: "table:session_closed",
            payload: {
              tableId: newRow.table_id,
              sessionId: newRow.id,
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
