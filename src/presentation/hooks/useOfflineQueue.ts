"use client";

import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import type { QueuedRequest } from "@/infrastructure/offline/OfflineQueue";

/**
 * useOfflineQueue — React hook for offline queue state.
 *
 * Uses useSyncExternalStore (no useEffect for state) + the OfflineQueue singleton.
 * Provides: online status, queue count, queue items, and manual process trigger.
 *
 * The queue itself is platform-agnostic (IndexedDB on web, swappable for React Native).
 */

// ── Online status store (useSyncExternalStore-compatible) ────────────

let onlineSnapshot = typeof navigator !== "undefined" ? navigator.onLine : true;

function subscribeOnline(callback: () => void): () => void {
  const handleOnline = () => {
    onlineSnapshot = true;
    callback();
  };
  const handleOffline = () => {
    onlineSnapshot = false;
    callback();
  };
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

function getOnlineSnapshot(): boolean {
  return onlineSnapshot;
}

function getServerOnlineSnapshot(): boolean {
  return true; // SSR always assumes online
}

// ── Queue snapshot store ─────────────────────────────────────────────

interface QueueSnapshot {
  count: number;
  items: QueuedRequest[];
  processing: boolean;
}

const EMPTY_SNAPSHOT: QueueSnapshot = { count: 0, items: [], processing: false };

/**
 * useOnlineStatus — reactive online/offline status via useSyncExternalStore.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
}

/**
 * useOfflineQueue — full offline queue hook with count, items, and actions.
 */
export function useOfflineQueue() {
  const isOnline = useOnlineStatus();
  const snapshotRef = useRef<QueueSnapshot>(EMPTY_SNAPSHOT);
  const listenersRef = useRef(new Set<() => void>());
  const queueRef = useRef<import("@/infrastructure/offline/OfflineQueue").OfflineQueue | null>(null);

  // Lazy-init queue (client-side only)
  const getQueue = useCallback(() => {
    if (!queueRef.current && typeof window !== "undefined") {
      // Dynamic import avoids SSR issues with IndexedDB
      const { getOfflineQueue } = require("@/infrastructure/offline/OfflineQueue");
      queueRef.current = getOfflineQueue();
    }
    return queueRef.current;
  }, []);

  // Refresh snapshot from IndexedDB
  const refreshSnapshot = useCallback(async () => {
    const queue = getQueue();
    if (!queue) return;

    const items = await queue.getAll();
    const newSnapshot: QueueSnapshot = {
      count: items.length,
      items,
      processing: false,
    };

    snapshotRef.current = newSnapshot;
    listenersRef.current.forEach((listener) => {
      listener();
    });
  }, [getQueue]);

  // Subscribe to queue changes + auto-sync
  // This useEffect is acceptable: it's for external subscription setup/teardown
  useEffect(() => {
    const queue = getQueue();
    if (!queue) return;

    queue.startAutoSync();
    const unsub = queue.subscribe(() => {
      refreshSnapshot();
    });

    // Initial load
    refreshSnapshot();

    return () => {
      unsub();
      queue.stopAutoSync();
    };
  }, [getQueue, refreshSnapshot]);

  // useSyncExternalStore for queue snapshot
  const subscribe = useCallback((callback: () => void) => {
    listenersRef.current.add(callback);
    return () => listenersRef.current.delete(callback);
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);
  const getServerSnapshot = useCallback(() => EMPTY_SNAPSHOT, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Manual process trigger
  const processQueue = useCallback(async () => {
    const queue = getQueue();
    if (!queue) return { processed: 0, failed: 0 };
    return queue.processQueue();
  }, [getQueue]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    const queue = getQueue();
    if (!queue) return;
    await queue.clear();
  }, [getQueue]);

  return {
    /** Whether the browser is online */
    isOnline,
    /** Number of queued requests */
    queueCount: snapshot.count,
    /** All queued requests */
    queueItems: snapshot.items,
    /** Manually trigger queue processing */
    processQueue,
    /** Clear all queued requests */
    clearQueue,
    /** Whether there are pending offline requests */
    hasPendingRequests: snapshot.count > 0,
  };
}
