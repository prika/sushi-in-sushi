/**
 * Order Channel — real-time order events for kitchen, waiters, and customers.
 *
 * Listens to:
 *  - postgres_changes on `orders` (new orders, status changes)
 *  - broadcast: `order:created` (instant notification from customer)
 */

import type { ChannelConfig } from "../RealtimeStore";
import type {
  OrderEvent,
  RealtimeEnvelope,
  RealtimeEventSource,
} from "../events";

interface OrderChannelOptions {
  /** Filter by session ID (customer view) */
  sessionId?: string;
  /** Filter by location (kitchen/waiter view) — uses table location */
  location?: string;
  /** Only listen to these statuses (kitchen: pending/preparing/ready) */
  statuses?: string[];
}

export function createOrderChannelConfig(
  options: OrderChannelOptions = {},
): ChannelConfig<OrderEvent> {
  const suffix = options.sessionId || options.location || "all";

  return {
    name: `rt-orders-${suffix}`,

    postgresChanges: [
      {
        table: "orders",
        event: "*",
        filter: options.sessionId
          ? `session_id=eq.${options.sessionId}`
          : undefined,
      },
    ],

    broadcasts: [
      { event: "order:created" },
    ],

    mapEvent(
      raw: Record<string, unknown>,
      source: RealtimeEventSource,
      broadcastEvent?: string,
    ): RealtimeEnvelope<OrderEvent> | null {
      const now = new Date().toISOString();

      // ── Broadcast events (instant) ───────────────────────────────
      if (source === "broadcast" && broadcastEvent === "order:created") {
        const payload = (raw as { payload?: Record<string, unknown> }).payload ?? raw;
        return {
          event: "order:created",
          payload,
          source,
          timestamp: now,
        };
      }

      // ── Postgres changes ─────────────────────────────────────────
      const eventType = (raw as { eventType?: string }).eventType;
      const newRow = (raw as { new?: Record<string, unknown> }).new;
      const oldRow = (raw as { old?: Record<string, unknown> }).old;

      if (!newRow) return null;

      // Status filter (kitchen only cares about pending/preparing/ready)
      if (
        options.statuses &&
        !options.statuses.includes(newRow.status as string)
      ) {
        return null;
      }

      // New order
      if (eventType === "INSERT") {
        return {
          event: "order:created",
          payload: {
            orderId: newRow.id,
            sessionId: newRow.session_id,
            productId: newRow.product_id,
            productName: "", // Resolved by consumer via cache
            quantity: newRow.quantity ?? 1,
            status: newRow.status ?? "pending",
          },
          source,
          timestamp: now,
        };
      }

      // Status change
      if (eventType === "UPDATE" && oldRow && newRow.status !== oldRow.status) {
        // Cancelled
        if (newRow.status === "cancelled") {
          return {
            event: "order:cancelled",
            payload: {
              orderId: newRow.id,
              sessionId: newRow.session_id,
            },
            source,
            timestamp: now,
          };
        }

        return {
          event: "order:status_changed",
          payload: {
            orderId: newRow.id,
            sessionId: newRow.session_id,
            productId: newRow.product_id,
            status: newRow.status,
            previousStatus: oldRow.status,
          },
          source,
          timestamp: now,
        };
      }

      return null;
    },
  };
}
