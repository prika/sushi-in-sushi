import { describe, it, expect, vi, beforeEach } from "vitest";
import { RealtimeStore, type ChannelConfig } from "@/infrastructure/realtime/RealtimeStore";

// ── Mock Supabase ────────────────────────────────────────────────────

function createMockSupabase(channel: ReturnType<typeof createMockChannelSimple>) {
  return {
    channel: vi.fn(() => channel),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// Simplified mock that doesn't need self-reference tricks
function createMockChannelSimple() {
  const handlers: Record<string, Array<(_payload: unknown) => void>> = {};
  const channel = {
    on(type: string, opts: Record<string, string>, cb: (_payload: unknown) => void) {
      const key = type === "broadcast" ? `broadcast:${opts.event}` : `pg:${opts.table || "*"}`;
      if (!handlers[key]) handlers[key] = [];
      handlers[key].push(cb);
      return channel;
    },
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(),
    send: vi.fn(),
    _emit(key: string, payload: unknown) {
      handlers[key]?.forEach((cb) => cb(payload));
    },
    _handlers: handlers,
  };
  return channel;
}

// ── Test config ──────────────────────────────────────────────────────

function createTestConfig(): ChannelConfig<"test:event"> {
  return {
    name: "test-channel",
    postgresChanges: [{ table: "test_table", event: "*" }],
    broadcasts: [{ event: "test:broadcast" }],
    mapEvent(raw, source, _broadcastEvent) {
      if (source === "broadcast") {
        return {
          event: "test:event" as const,
          payload: (raw as Record<string, unknown>).payload ?? raw,
          source,
          timestamp: new Date().toISOString(),
        };
      }
      return {
        event: "test:event" as const,
        payload: raw,
        source,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("RealtimeStore", () => {
  let store: RealtimeStore<"test:event">;
  let mockChannel: ReturnType<typeof createMockChannelSimple>;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    store = new RealtimeStore();
    mockChannel = createMockChannelSimple();
    mockSupabase = createMockSupabase(mockChannel);
  });

  describe("initial state", () => {
    it("getSnapshot returns null before any events", () => {
      expect(store.getSnapshot()).toBeNull();
    });

    it("getServerSnapshot returns null (SSR)", () => {
      expect(store.getServerSnapshot()).toBeNull();
    });

    it("getEvents returns empty array", () => {
      expect(store.getEvents()).toEqual([]);
    });

    it("isConnected returns false before connect", () => {
      expect(store.isConnected()).toBe(false);
    });
  });

  describe("connect/disconnect", () => {
    it("connects to supabase channel", () => {
      store.connect(mockSupabase, createTestConfig());

      expect(mockSupabase.channel).toHaveBeenCalledWith("test-channel");
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(store.isConnected()).toBe(true);
    });

    it("registers postgres_changes listeners", () => {
      store.connect(mockSupabase, createTestConfig());
      expect(mockChannel._handlers["pg:test_table"]).toBeDefined();
      expect(mockChannel._handlers["pg:test_table"]).toHaveLength(1);
    });

    it("registers broadcast listeners", () => {
      store.connect(mockSupabase, createTestConfig());
      expect(mockChannel._handlers["broadcast:test:broadcast"]).toBeDefined();
    });

    it("is idempotent — second connect is a no-op", () => {
      store.connect(mockSupabase, createTestConfig());
      store.connect(mockSupabase, createTestConfig());
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
    });

    it("disconnect cleans up", () => {
      store.connect(mockSupabase, createTestConfig());
      store.disconnect();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(store.isConnected()).toBe(false);
    });

    it("disconnect is safe to call when not connected", () => {
      expect(() => store.disconnect()).not.toThrow();
    });
  });

  describe("event handling", () => {
    it("updates snapshot when postgres event arrives", () => {
      store.connect(mockSupabase, createTestConfig());

      mockChannel._emit("pg:test_table", { id: "123", status: "active" });

      const snapshot = store.getSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.event).toBe("test:event");
      expect(snapshot!.source).toBe("postgres");
    });

    it("updates snapshot when broadcast event arrives", () => {
      store.connect(mockSupabase, createTestConfig());

      mockChannel._emit("broadcast:test:broadcast", {
        payload: { message: "hello" },
      });

      const snapshot = store.getSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.source).toBe("broadcast");
    });

    it("events buffer grows and is capped at 50", () => {
      store.connect(mockSupabase, createTestConfig());

      for (let i = 0; i < 60; i++) {
        mockChannel._emit("pg:test_table", { id: `${i}` });
      }

      expect(store.getEvents()).toHaveLength(50);
    });

    it("newest event is first in the buffer", () => {
      store.connect(mockSupabase, createTestConfig());

      mockChannel._emit("pg:test_table", { id: "first" });
      mockChannel._emit("pg:test_table", { id: "second" });

      const events = store.getEvents();
      expect((events[0].payload as Record<string, unknown>).id).toBe("second");
      expect((events[1].payload as Record<string, unknown>).id).toBe("first");
    });
  });

  describe("subscribe / notify", () => {
    it("notifies listeners when event arrives", () => {
      const listener = vi.fn();
      store.subscribe(listener);
      store.connect(mockSupabase, createTestConfig());

      mockChannel._emit("pg:test_table", { id: "123" });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies multiple listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store.subscribe(listener1);
      store.subscribe(listener2);
      store.connect(mockSupabase, createTestConfig());

      mockChannel._emit("pg:test_table", { id: "123" });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe stops notifications", () => {
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      store.connect(mockSupabase, createTestConfig());

      unsub();
      mockChannel._emit("pg:test_table", { id: "123" });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("broadcast (send)", () => {
    it("sends broadcast through channel", () => {
      store.connect(mockSupabase, createTestConfig());

      store.broadcast("order:created", { orderId: "abc" });

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "order:created",
        payload: { orderId: "abc" },
      });
    });

    it("is a no-op when not connected", () => {
      expect(() => store.broadcast("order:created", {})).not.toThrow();
    });
  });

  describe("event filtering (mapEvent returns null)", () => {
    it("does not push events when mapEvent returns null", () => {
      const listener = vi.fn();
      const filterConfig: ChannelConfig<"test:event"> = {
        name: "filter-test",
        postgresChanges: [{ table: "orders", event: "*" }],
        mapEvent(raw) {
          const r = raw as { new?: { status?: string } };
          if (r.new?.status === "cancelled") return null;
          return {
            event: "test:event" as const,
            payload: raw,
            source: "postgres",
            timestamp: new Date().toISOString(),
          };
        },
      };

      store.subscribe(listener);
      store.connect(mockSupabase, filterConfig);

      // Should be filtered out
      mockChannel._emit("pg:orders", { new: { status: "cancelled" } });
      expect(listener).not.toHaveBeenCalled();
      expect(store.getSnapshot()).toBeNull();

      // Should pass through
      mockChannel._emit("pg:orders", { new: { status: "pending" } });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot()).not.toBeNull();
    });
  });

  describe("snapshot referential stability", () => {
    it("returns same reference when no new events arrive", () => {
      store.connect(mockSupabase, createTestConfig());
      mockChannel._emit("pg:test_table", { id: "1" });

      const snap1 = store.getSnapshot();
      const snap2 = store.getSnapshot();
      expect(snap1).toBe(snap2);
    });

    it("returns new reference when new event arrives", () => {
      store.connect(mockSupabase, createTestConfig());

      mockChannel._emit("pg:test_table", { id: "1" });
      const snap1 = store.getSnapshot();

      mockChannel._emit("pg:test_table", { id: "2" });
      const snap2 = store.getSnapshot();

      expect(snap1).not.toBe(snap2);
    });
  });
});
