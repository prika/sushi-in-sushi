import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OfflineQueue,
  type StorageAdapter,
  type QueuedRequest,
} from "@/infrastructure/offline/OfflineQueue";

// ── In-memory StorageAdapter for testing ────────────────────────────

function createMemoryStorage(): StorageAdapter & { items: QueuedRequest[] } {
  const storage = {
    items: [] as QueuedRequest[],
    async getAll() {
      return [...storage.items].sort((a, b) => a.priority - b.priority);
    },
    async add(request: QueuedRequest) {
      const idx = storage.items.findIndex((i) => i.id === request.id);
      if (idx >= 0) storage.items[idx] = request;
      else storage.items.push(request);
    },
    async remove(id: string) {
      storage.items = storage.items.filter((i) => i.id !== id);
    },
    async clear() {
      storage.items = [];
    },
    async count() {
      return storage.items.length;
    },
  };
  return storage;
}

// ── Tests ───────────────────────────────────────────────────────────

describe("OfflineQueue", () => {
  let storage: ReturnType<typeof createMemoryStorage>;
  let queue: OfflineQueue;

  beforeEach(() => {
    storage = createMemoryStorage();
    queue = new OfflineQueue(storage);
    vi.restoreAllMocks();
  });

  describe("enqueue", () => {
    it("adds a request to storage", async () => {
      const id = await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        body: { items: [1, 2] },
        label: "Pedido: 2 items",
      });

      expect(id).toMatch(/^oq-/);
      expect(storage.items).toHaveLength(1);
      expect(storage.items[0].url).toBe("/api/orders");
      expect(storage.items[0].method).toBe("POST");
      expect(storage.items[0].status).toBe("pending");
    });

    it("serializes body to JSON string", async () => {
      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        body: { foo: "bar" },
        label: "Test",
      });

      expect(storage.items[0].body).toBe('{"foo":"bar"}');
    });

    it("uses default Content-Type header", async () => {
      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        label: "Test",
      });

      expect(storage.items[0].headers["Content-Type"]).toBe("application/json");
    });

    it("merges custom headers", async () => {
      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        headers: { Authorization: "Bearer xxx" },
        label: "Test",
      });

      expect(storage.items[0].headers["Authorization"]).toBe("Bearer xxx");
      expect(storage.items[0].headers["Content-Type"]).toBe("application/json");
    });

    it("uses default priority 10 and maxRetries 5", async () => {
      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        label: "Test",
      });

      expect(storage.items[0].priority).toBe(10);
      expect(storage.items[0].maxRetries).toBe(5);
    });

    it("accepts custom priority and maxRetries", async () => {
      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        label: "Test",
        priority: 1,
        maxRetries: 3,
      });

      expect(storage.items[0].priority).toBe(1);
      expect(storage.items[0].maxRetries).toBe(3);
    });

    it("notifies listeners on enqueue", async () => {
      const listener = vi.fn();
      queue.subscribe(listener);

      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        label: "Test",
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("processQueue", () => {
    it("processes pending requests with successful fetch", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));

      await queue.enqueue({ url: "/api/orders", method: "POST", label: "Test" });

      const result = await queue.processQueue();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(storage.items).toHaveLength(0);
    });

    it("removes 4xx client errors (no retry)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 422 }),
      );

      await queue.enqueue({ url: "/api/orders", method: "POST", label: "Test" });

      const result = await queue.processQueue();

      expect(result.processed).toBe(1);
      expect(storage.items).toHaveLength(0);
    });

    it("retries on 5xx server error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );

      await queue.enqueue({ url: "/api/orders", method: "POST", label: "Test" });

      const result = await queue.processQueue();

      expect(result.failed).toBe(1);
      expect(storage.items).toHaveLength(1);
      expect(storage.items[0].retries).toBe(1);
      expect(storage.items[0].status).toBe("retrying");
    });

    it("retries on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await queue.enqueue({ url: "/api/orders", method: "POST", label: "Test" });

      const result = await queue.processQueue();

      expect(result.failed).toBe(1);
      expect(storage.items[0].retries).toBe(1);
    });

    it("marks as failed after maxRetries exceeded", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

      await queue.enqueue({
        url: "/api/orders",
        method: "POST",
        label: "Test",
        maxRetries: 2,
      });

      // First process: retries 0→1
      await queue.processQueue();
      expect(storage.items[0].retries).toBe(1);
      expect(storage.items[0].status).toBe("retrying");

      // Second process: retries 1→2 (still < check happens before increment)
      await queue.processQueue();
      expect(storage.items[0].retries).toBe(2);
      expect(storage.items[0].status).toBe("retrying");

      // Third process: retries=2 >= maxRetries=2 → failed
      await queue.processQueue();
      expect(storage.items[0].status).toBe("failed");

      // Fourth process: skips failed items
      const result = await queue.processQueue();
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("skips already-failed items", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));

      storage.items.push({
        id: "oq-1",
        url: "/api/x",
        method: "POST",
        headers: {},
        body: "",
        createdAt: new Date().toISOString(),
        retries: 5,
        maxRetries: 5,
        status: "failed",
        label: "Failed",
        priority: 10,
      });

      const result = await queue.processQueue();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(storage.items).toHaveLength(1);
    });

    it("is non-reentrant (prevents concurrent processing)", async () => {
      let resolveFirst: () => void;
      const blockingPromise = new Promise<void>((r) => { resolveFirst = r; });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => {
          await blockingPromise;
          return { ok: true, status: 200 };
        }),
      );

      await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });

      const p1 = queue.processQueue();
      const p2 = queue.processQueue();

      resolveFirst!();

      const r1 = await p1;
      const r2 = await p2;

      expect(r1.processed).toBe(1);
      // Second call returns early with zeros
      expect(r2.processed).toBe(0);
      expect(r2.failed).toBe(0);
    });

    it("notifies listeners after processing", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));

      await queue.enqueue({ url: "/api/x", method: "POST", label: "X" });

      const listener = vi.fn();
      queue.subscribe(listener);

      await queue.processQueue();

      // notified at least once (end of processQueue)
      expect(listener).toHaveBeenCalled();
    });
  });

  describe("getAll / count", () => {
    it("returns all queued items", async () => {
      await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });
      await queue.enqueue({ url: "/api/b", method: "PUT", label: "B" });

      const all = await queue.getAll();
      expect(all).toHaveLength(2);
    });

    it("count returns number of items", async () => {
      await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });
      await queue.enqueue({ url: "/api/b", method: "PUT", label: "B" });

      expect(await queue.count()).toBe(2);
    });
  });

  describe("remove", () => {
    it("removes a specific item", async () => {
      const id = await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });
      await queue.enqueue({ url: "/api/b", method: "PUT", label: "B" });

      await queue.remove(id);

      expect(storage.items).toHaveLength(1);
      expect(storage.items[0].url).toBe("/api/b");
    });

    it("notifies listeners", async () => {
      const id = await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });
      const listener = vi.fn();
      queue.subscribe(listener);

      await queue.remove(id);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("removes all items", async () => {
      await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });
      await queue.enqueue({ url: "/api/b", method: "PUT", label: "B" });

      await queue.clear();

      expect(storage.items).toHaveLength(0);
    });
  });

  describe("subscribe", () => {
    it("returns an unsubscribe function", async () => {
      const listener = vi.fn();
      const unsub = queue.subscribe(listener);

      await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      await queue.enqueue({ url: "/api/b", method: "POST", label: "B" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("supports multiple listeners", async () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      queue.subscribe(l1);
      queue.subscribe(l2);

      await queue.enqueue({ url: "/api/a", method: "POST", label: "A" });

      expect(l1).toHaveBeenCalledTimes(1);
      expect(l2).toHaveBeenCalledTimes(1);
    });
  });
});
