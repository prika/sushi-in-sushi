/**
 * Realtime Event Types
 *
 * Platform-agnostic event definitions used by RealtimeStore.
 * These types are shared between web (React) and native (React Native) clients.
 */

// ── Generic ──────────────────────────────────────────────────────────

export type RealtimeEventSource = "postgres" | "broadcast";

export interface RealtimeEnvelope<T extends string = string, P = unknown> {
  /** Event name (e.g. "order:created", "table:preferences_updated") */
  event: T;
  /** Event payload */
  payload: P;
  /** Where the event originated */
  source: RealtimeEventSource;
  /** ISO timestamp */
  timestamp: string;
}

// ── Table Events ─────────────────────────────────────────────────────

export type TableEvent =
  | "table:open_requested"
  | "table:session_opened"
  | "table:session_closed"
  | "table:preferences_updated"
  | "table:status_changed";

export interface TableOpenRequestedPayload {
  tableId: string;
  tableNumber: number;
  location: string;
  requestedRodizio: boolean | null;
  requestedNumPeople: number | null;
}

export interface TableSessionOpenedPayload {
  tableId: string;
  sessionId: string;
  tableNumber: number;
  isRodizio: boolean;
  numPeople: number;
}

export interface TableSessionClosedPayload {
  tableId: string;
  sessionId: string;
}

export interface TablePreferencesPayload {
  tableId: string;
  tableNumber: number;
  requestedRodizio: boolean | null;
  requestedNumPeople: number | null;
}

export interface TableStatusChangedPayload {
  tableId: string;
  status: string;
  previousStatus?: string;
}

export type TableEventPayload =
  | TableOpenRequestedPayload
  | TableSessionOpenedPayload
  | TableSessionClosedPayload
  | TablePreferencesPayload
  | TableStatusChangedPayload;

// ── Order Events ─────────────────────────────────────────────────────

export type OrderEvent =
  | "order:created"
  | "order:status_changed"
  | "order:cancelled";

export interface OrderCreatedPayload {
  orderId: string;
  sessionId: string;
  productId: number;
  productName: string;
  quantity: number;
  status: string;
  customerName?: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  sessionId: string;
  productId: number;
  status: string;
  previousStatus: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  sessionId: string;
}

export type OrderEventPayload =
  | OrderCreatedPayload
  | OrderStatusChangedPayload
  | OrderCancelledPayload;

// ── Waiter Call Events ───────────────────────────────────────────────

export type WaiterCallEvent =
  | "call:created"
  | "call:acknowledged"
  | "call:resolved";

export interface WaiterCallPayload {
  callId: string;
  tableId: string;
  tableNumber: number;
  callType: "assistance" | "bill" | "order";
  customerName?: string;
}

export type WaiterCallEventPayload = WaiterCallPayload;

// ── Union types ──────────────────────────────────────────────────────

export type AnyEvent = TableEvent | OrderEvent | WaiterCallEvent;
export type AnyPayload =
  | TableEventPayload
  | OrderEventPayload
  | WaiterCallEventPayload;
