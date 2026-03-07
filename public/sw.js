/**
 * Service Worker — Sushi in Sushi
 *
 * Handles:
 * 1. Background Sync — replays queued offline requests when connectivity returns
 * 2. Offline fallback — serves cached shell when network unavailable
 * 3. API caching — stale-while-revalidate for product/category data
 */

const CACHE_NAME = "sushi-v1";
const SYNC_TAG = "offline-queue-sync";

// Static assets to precache (app shell)
const PRECACHE_URLS = [
  "/offline",
];

// ── Install ──────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations handled by OfflineQueue in app code)
  if (request.method !== "GET") return;

  // API routes: stale-while-revalidate for product/category data
  if (url.pathname.startsWith("/api/products") || url.pathname.startsWith("/api/categories")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline"))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.match(/\.(js|css|woff2?|png|jpg|webp|avif|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

// ── Background Sync ──────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

/**
 * Process queued requests from IndexedDB.
 * This runs in the Service Worker context when connectivity is restored.
 */
async function processOfflineQueue() {
  const DB_NAME = "sushi-offline-queue";
  const STORE_NAME = "requests";

  try {
    const db = await openIDB(DB_NAME, 1);
    const items = await getAllFromStore(db, STORE_NAME);

    const pending = items.filter((item) => item.status !== "failed");

    for (const item of pending) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body || undefined,
        });

        if (response.ok || (response.status >= 400 && response.status < 500)) {
          await deleteFromStore(db, STORE_NAME, item.id);
          notifyClients("queue:processed", { id: item.id, label: item.label });
        } else {
          await retryItem(db, STORE_NAME, item);
        }
      } catch {
        await retryItem(db, STORE_NAME, item);
      }
    }

    // Notify app about queue changes
    notifyClients("queue:updated", { remaining: pending.length });
  } catch (error) {
    console.error("[SW] Error processing offline queue:", error);
  }
}

// ── Cache Strategies ─────────────────────────────────────────────────

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

// ── IndexedDB helpers (Service Worker context) ───────────────────────

function openIDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("requests")) {
        const store = db.createObjectStore("requests", { keyPath: "id" });
        store.createIndex("status", "status");
        store.createIndex("priority", "priority");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).index("priority").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function putInStore(db, storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function retryItem(db, storeName, item) {
  if (item.retries >= item.maxRetries) {
    item.status = "failed";
  } else {
    item.retries++;
    item.status = "retrying";
  }
  await putInStore(db, storeName, item);
}

// ── Client Communication ─────────────────────────────────────────────

function notifyClients(event, data) {
  self.clients.matchAll({ type: "window" }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: event, ...data });
    }
  });
}
