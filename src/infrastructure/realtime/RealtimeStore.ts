/**
 * RealtimeStore — Platform-agnostic reactive store for Supabase Realtime.
 *
 * Implements the `subscribe` / `getSnapshot` contract required by
 * React's `useSyncExternalStore` but contains ZERO React imports.
 * This means it works identically in React web and React Native.
 *
 * Supports both:
 *  - postgres_changes (DB → WAL → Realtime, ~200-500ms)
 *  - broadcast (channel.send, <100ms peer-to-peer)
 *
 * Usage:
 *   const store = new RealtimeStore<OrderEvent, OrderEventPayload>();
 *   store.connect(supabase, channelConfig);
 *   // In React: useSyncExternalStore(store.subscribe, store.getSnapshot)
 *   // In React Native: same API
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeEnvelope, RealtimeEventSource } from "./events";

// ── Channel Configuration ────────────────────────────────────────────

export interface PostgresChangeConfig {
  /** Supabase table to listen to */
  table: string;
  /** postgres_changes event filter: INSERT, UPDATE, DELETE, or * */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  /** Optional row-level filter (e.g. "location=eq.circunvalacao") */
  filter?: string;
  /** Schema (default: "public") */
  schema?: string;
}

export interface BroadcastConfig {
  /** Broadcast event name to listen for */
  event: string;
}

export interface ChannelConfig<TEvent extends string = string> {
  /** Unique channel name (used by Supabase multiplexer) */
  name: string;
  /** postgres_changes subscriptions */
  postgresChanges?: PostgresChangeConfig[];
  /** Broadcast event subscriptions */
  broadcasts?: BroadcastConfig[];
  /**
   * Map a raw Supabase event to a typed envelope.
   * Return null to ignore/filter the event.
   */
  mapEvent: (
    _raw: Record<string, unknown>,
    _source: RealtimeEventSource,
    _broadcastEvent?: string,
  ) => RealtimeEnvelope<TEvent> | null;
}

// ── Store ────────────────────────────────────────────────────────────

/** Maximum events kept in the ring buffer */
const MAX_EVENTS = 50;

export class RealtimeStore<
  TEvent extends string = string,
  TPayload = unknown,
> {
  // ── Internal state ───────────────────────────────────────────────

  private listeners = new Set<() => void>();
  private events: RealtimeEnvelope<TEvent, TPayload>[] = [];
  private channel: RealtimeChannel | null = null;
  private connected = false;

  // Snapshot references — only recreated on change (referential equality)
  private latestSnapshot: RealtimeEnvelope<TEvent, TPayload> | null = null;
  private eventsSnapshot: readonly RealtimeEnvelope<TEvent, TPayload>[] = [];

  // ── useSyncExternalStore contract ────────────────────────────────

  /**
   * Subscribe to store changes.
   * Returns an unsubscribe function.
   * Bind-safe: arrow function stored on instance.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Get the latest event snapshot (or null if none).
   * Returns a stable reference until a new event arrives.
   */
  getSnapshot = (): RealtimeEnvelope<TEvent, TPayload> | null => {
    return this.latestSnapshot;
  };

  /**
   * Server snapshot for SSR (always null — realtime is client-only).
   */
  getServerSnapshot = (): RealtimeEnvelope<TEvent, TPayload> | null => {
    return null;
  };

  /**
   * Get all buffered events (newest first, max MAX_EVENTS).
   * Returns a stable reference until a new event arrives.
   */
  getEvents = (): readonly RealtimeEnvelope<TEvent, TPayload>[] => {
    return this.eventsSnapshot;
  };

  // ── Connection lifecycle ─────────────────────────────────────────

  /**
   * Connect to a Supabase Realtime channel.
   * Idempotent — calling twice with the same config is a no-op.
   */
  connect(supabase: SupabaseClient, config: ChannelConfig<TEvent>): void {
    if (this.connected) return;

    const channel = supabase.channel(config.name);

    // Register postgres_changes listeners
    if (config.postgresChanges) {
      for (const pg of config.postgresChanges) {
        const params: Record<string, string> = {
          event: pg.event || "*",
          schema: pg.schema || "public",
          table: pg.table,
        };
        if (pg.filter) params.filter = pg.filter;

        channel.on(
          "postgres_changes" as "system",
          params as Record<string, string>,
          (payload: Record<string, unknown>) => {
            const envelope = config.mapEvent(payload, "postgres");
            if (envelope) this.push(envelope as RealtimeEnvelope<TEvent, TPayload>);
          },
        );
      }
    }

    // Register broadcast listeners
    if (config.broadcasts) {
      for (const bc of config.broadcasts) {
        channel.on("broadcast", { event: bc.event }, (payload: Record<string, unknown>) => {
          const envelope = config.mapEvent(
            payload,
            "broadcast",
            bc.event,
          );
          if (envelope) this.push(envelope as RealtimeEnvelope<TEvent, TPayload>);
        });
      }
    }

    channel.subscribe();
    this.channel = channel;
    this.connected = true;
  }

  /**
   * Disconnect and clean up the channel.
   */
  disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.connected = false;
  }

  /**
   * Send a broadcast message through the channel.
   * Instant delivery to all subscribers (<100ms).
   */
  broadcast(event: string, payload: Record<string, unknown>): void {
    if (!this.channel) return;
    this.channel.send({
      type: "broadcast",
      event,
      payload,
    });
  }

  /**
   * Whether the store is currently connected to a channel.
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ── Internals ────────────────────────────────────────────────────

  private push(envelope: RealtimeEnvelope<TEvent, TPayload>): void {
    // Add to ring buffer
    this.events = [envelope, ...this.events].slice(0, MAX_EVENTS);

    // Update snapshots (new references for useSyncExternalStore equality check)
    this.latestSnapshot = envelope;
    this.eventsSnapshot = this.events;

    // Notify all subscribers synchronously
    this.emitChange();
  }

  private emitChange(): void {
    this.listeners.forEach((listener) => listener());
  }
}
