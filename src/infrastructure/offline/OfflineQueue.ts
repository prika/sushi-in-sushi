/**
 * OfflineQueue — Platform-agnostic offline request queue.
 *
 * Stores failed/offline requests in IndexedDB and replays them
 * when connectivity is restored. Works with both Service Worker
 * Background Sync and manual polling fallback.
 *
 * Zero React dependencies — portable to React Native (swap IndexedDB
 * for AsyncStorage/SQLite via the StorageAdapter interface).
 */

// ── Storage Adapter (swappable for React Native) ─────────────────────

export interface StorageAdapter {
  getAll(): Promise<QueuedRequest[]>;
  add(_request: QueuedRequest): Promise<void>;
  remove(_id: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

// ── Types ────────────────────────────────────────────────────────────

export type QueuedRequestStatus = "pending" | "retrying" | "failed";

export interface QueuedRequest {
  id: string;
  /** API endpoint (relative, e.g. "/api/orders") */
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body: string;
  /** ISO timestamp when queued */
  createdAt: string;
  /** Number of retry attempts */
  retries: number;
  /** Max retries before marking as failed */
  maxRetries: number;
  status: QueuedRequestStatus;
  /** Human-readable label for UI (e.g. "Pedido: 3x Salmão") */
  label: string;
  /** Priority: lower = higher priority */
  priority: number;
}

// ── IndexedDB Storage Adapter ────────────────────────────────────────

const DB_NAME = "sushi-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "requests";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status");
        store.createIndex("priority", "priority");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDBStorageAdapter implements StorageAdapter {
  async getAll(): Promise<QueuedRequest[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.index("priority").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(item: QueuedRequest): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async remove(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// ── Queue Manager ────────────────────────────────────────────────────

type QueueListener = () => void;

const MAX_RETRIES_DEFAULT = 5;

export class OfflineQueue {
  private storage: StorageAdapter;
  private listeners = new Set<QueueListener>();
  private processing = false;
  private onlineListener: (() => void) | null = null;

  constructor(storage?: StorageAdapter) {
    this.storage = storage ?? new IndexedDBStorageAdapter();
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Enqueue a request for later replay.
   * Call this when a fetch fails due to network error.
   */
  async enqueue(params: {
    url: string;
    method: "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: unknown;
    label: string;
    priority?: number;
    maxRetries?: number;
  }): Promise<string> {
    const id = `oq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const request: QueuedRequest = {
      id,
      url: params.url,
      method: params.method,
      headers: {
        "Content-Type": "application/json",
        ...params.headers,
      },
      body: params.body ? JSON.stringify(params.body) : "",
      createdAt: new Date().toISOString(),
      retries: 0,
      maxRetries: params.maxRetries ?? MAX_RETRIES_DEFAULT,
      status: "pending",
      label: params.label,
      priority: params.priority ?? 10,
    };

    await this.storage.add(request);
    this.notifyListeners();
    return id;
  }

  /**
   * Process all pending requests. Called on reconnect or by Background Sync.
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.processing) return { processed: 0, failed: 0 };
    this.processing = true;

    let processed = 0;
    let failed = 0;

    try {
      const items = await this.storage.getAll();
      const pending = items.filter((i) => i.status !== "failed");

      for (const item of pending) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body || undefined,
          });

          if (response.ok || (response.status >= 400 && response.status < 500)) {
            // Success or client error (don't retry 4xx)
            await this.storage.remove(item.id);
            processed++;
          } else {
            // Server error — retry later
            await this.markRetry(item);
            failed++;
          }
        } catch {
          // Network error — retry later
          await this.markRetry(item);
          failed++;
        }
      }
    } finally {
      this.processing = false;
      this.notifyListeners();
    }

    return { processed, failed };
  }

  /**
   * Get all queued requests.
   */
  async getAll(): Promise<QueuedRequest[]> {
    return this.storage.getAll();
  }

  /**
   * Get count of pending requests.
   */
  async count(): Promise<number> {
    return this.storage.count();
  }

  /**
   * Remove a specific request from the queue.
   */
  async remove(id: string): Promise<void> {
    await this.storage.remove(id);
    this.notifyListeners();
  }

  /**
   * Clear all queued requests.
   */
  async clear(): Promise<void> {
    await this.storage.clear();
    this.notifyListeners();
  }

  /**
   * Subscribe to queue changes (for UI updates).
   */
  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Start listening for online events and auto-process.
   * Call once on app startup.
   */
  startAutoSync(): void {
    if (typeof window === "undefined") return;
    if (this.onlineListener) return;

    this.onlineListener = () => {
      this.processQueue();
    };

    window.addEventListener("online", this.onlineListener);

    // Process any stale items from previous sessions
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Stop listening for online events.
   */
  stopAutoSync(): void {
    if (this.onlineListener) {
      window.removeEventListener("online", this.onlineListener);
      this.onlineListener = null;
    }
  }

  // ── Internals ────────────────────────────────────────────────────

  private async markRetry(item: QueuedRequest): Promise<void> {
    if (item.retries >= item.maxRetries) {
      item.status = "failed";
    } else {
      item.retries++;
      item.status = "retrying";
    }
    await this.storage.add(item);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────

let instance: OfflineQueue | null = null;

export function getOfflineQueue(): OfflineQueue {
  if (!instance) {
    instance = new OfflineQueue();
  }
  return instance;
}
