import { describe, it, expect, vi, beforeEach } from "vitest";
import { offlineFetch, isOfflineResponse } from "@/infrastructure/offline/offlineFetch";

// ── Mock the OfflineQueue singleton ─────────────────────────────────

const mockEnqueue = vi.fn().mockResolvedValue("oq-mock-123");

vi.mock("@/infrastructure/offline/OfflineQueue", () => ({
  getOfflineQueue: () => ({
    enqueue: mockEnqueue,
  }),
}));

describe("offlineFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEnqueue.mockClear();
  });

  describe("when online (fetch succeeds)", () => {
    it("returns the actual response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 })),
      );

      const response = await offlineFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items: [1] }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    it("passes through 5xx errors (does not queue)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("Server error", { status: 500 })),
      );

      const response = await offlineFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(500);
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe("when offline (fetch throws)", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      );
    });

    it("queues POST requests and returns 202", async () => {
      const response = await offlineFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items: [1] }),
        offlineLabel: "Pedido: 1 item",
      });

      expect(response.status).toBe(202);
      expect(isOfflineResponse(response)).toBe(true);

      const body = await response.json();
      expect(body.queued).toBe(true);
      expect(body.queueId).toBe("oq-mock-123");
    });

    it("queues PUT requests", async () => {
      const response = await offlineFetch("/api/orders/1", {
        method: "PUT",
        body: JSON.stringify({ status: "ready" }),
        offlineLabel: "Update order",
      });

      expect(response.status).toBe(202);
      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/api/orders/1",
          method: "PUT",
        }),
      );
    });

    it("queues PATCH requests", async () => {
      await offlineFetch("/api/orders/1", {
        method: "PATCH",
        body: JSON.stringify({ status: "ready" }),
        offlineLabel: "Patch",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("queues DELETE requests", async () => {
      await offlineFetch("/api/orders/1", {
        method: "DELETE",
        offlineLabel: "Delete",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("throws for GET requests (does not queue)", async () => {
      await expect(
        offlineFetch("/api/products", { method: "GET" }),
      ).rejects.toThrow("Failed to fetch");

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("throws for requests with no method (defaults to GET)", async () => {
      await expect(offlineFetch("/api/products")).rejects.toThrow(
        "Failed to fetch",
      );

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("passes offlineLabel to queue", async () => {
      await offlineFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
        offlineLabel: "Pedido: 3x Salmao",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ label: "Pedido: 3x Salmao" }),
      );
    });

    it("uses default label when offlineLabel not provided", async () => {
      await offlineFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ label: "POST /api/orders" }),
      );
    });

    it("passes priority and maxRetries", async () => {
      await offlineFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({}),
        offlinePriority: 1,
        offlineMaxRetries: 3,
        offlineLabel: "Test",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 1,
          maxRetries: 3,
        }),
      );
    });

    it("extracts Headers object to plain object", async () => {
      const headers = new Headers({ Authorization: "Bearer token" });

      await offlineFetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
        offlineLabel: "Test",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ authorization: "Bearer token" }),
        }),
      );
    });

    it("extracts array headers to plain object", async () => {
      await offlineFetch("/api/orders", {
        method: "POST",
        headers: [["X-Custom", "value"]],
        body: JSON.stringify({}),
        offlineLabel: "Test",
      });

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { "X-Custom": "value" },
        }),
      );
    });
  });
});

describe("isOfflineResponse", () => {
  it("returns true for offline-queued responses", () => {
    const response = new Response("{}", {
      headers: { "X-Offline-Queued": "true" },
    });
    expect(isOfflineResponse(response)).toBe(true);
  });

  it("returns false for normal responses", () => {
    const response = new Response("{}", { status: 200 });
    expect(isOfflineResponse(response)).toBe(false);
  });
});
