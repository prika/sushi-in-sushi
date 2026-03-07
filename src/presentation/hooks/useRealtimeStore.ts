"use client";

import { useSyncExternalStore, useRef, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RealtimeStore, type ChannelConfig } from "@/infrastructure/realtime/RealtimeStore";
import type { RealtimeEnvelope } from "@/infrastructure/realtime/events";

/**
 * useRealtimeStore — React binding for RealtimeStore.
 *
 * Uses `useSyncExternalStore` (zero useEffect for data).
 * The only useEffect is for connection lifecycle (acceptable per project rules:
 * "useEffect so e aceitavel para: subscricoes externas (Supabase realtime)").
 *
 * The store instance lives in a ref — survives re-renders, shared across
 * the component tree if the same ref is passed.
 *
 * @example
 * const event = useRealtimeStore(supabase, orderChannelConfig);
 * // event is the latest RealtimeEnvelope or null
 */
export function useRealtimeStore<TEvent extends string>(
  supabase: SupabaseClient,
  config: ChannelConfig<TEvent>,
  enabled = true,
): RealtimeEnvelope<TEvent> | null {
  const storeRef = useRef<RealtimeStore<TEvent>>();

  if (!storeRef.current) {
    storeRef.current = new RealtimeStore<TEvent>();
  }

  const store = storeRef.current;

  // Connection lifecycle — the ONE acceptable useEffect (external subscription)
  useEffect(() => {
    if (!enabled) return;
    store.connect(supabase, config);
    return () => store.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config identity is stable (created outside render)
  }, [supabase, config.name, enabled]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

/**
 * useRealtimeStoreEvents — like useRealtimeStore but returns the full event buffer.
 *
 * Useful when you need the last N events (e.g. notification feed).
 */
export function useRealtimeStoreEvents<TEvent extends string>(
  supabase: SupabaseClient,
  config: ChannelConfig<TEvent>,
  enabled = true,
): readonly RealtimeEnvelope<TEvent>[] {
  const storeRef = useRef<RealtimeStore<TEvent>>();

  if (!storeRef.current) {
    storeRef.current = new RealtimeStore<TEvent>();
  }

  const store = storeRef.current;

  useEffect(() => {
    if (!enabled) return;
    store.connect(supabase, config);
    return () => store.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, config.name, enabled]);

  return useSyncExternalStore(
    store.subscribe,
    store.getEvents,
    () => [] as readonly RealtimeEnvelope<TEvent>[],
  );
}

/**
 * Get direct access to the store instance (for broadcasting).
 */
export function useRealtimeStoreRef<TEvent extends string>(
  supabase: SupabaseClient,
  config: ChannelConfig<TEvent>,
  enabled = true,
): {
  event: RealtimeEnvelope<TEvent> | null;
  store: RealtimeStore<TEvent>;
} {
  const storeRef = useRef<RealtimeStore<TEvent>>();

  if (!storeRef.current) {
    storeRef.current = new RealtimeStore<TEvent>();
  }

  const store = storeRef.current;

  useEffect(() => {
    if (!enabled) return;
    store.connect(supabase, config);
    return () => store.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, config.name, enabled]);

  const event = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return { event, store };
}
