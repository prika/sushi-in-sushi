import { describe, it, expect } from "vitest";
import { createTableChannelConfig } from "@/infrastructure/realtime/channels/table";
import { createOrderChannelConfig } from "@/infrastructure/realtime/channels/order";
import { createWaiterCallChannelConfig } from "@/infrastructure/realtime/channels/waiter-call";

describe("createTableChannelConfig", () => {
  const config = createTableChannelConfig({ location: "circunvalacao" });

  it("creates channel with location suffix", () => {
    expect(config.name).toBe("rt-tables-circunvalacao");
  });

  it("subscribes to tables and sessions postgres changes", () => {
    expect(config.postgresChanges).toHaveLength(2);
    expect(config.postgresChanges![0].table).toBe("tables");
    expect(config.postgresChanges![1].table).toBe("sessions");
  });

  it("filters tables by location", () => {
    expect(config.postgresChanges![0].filter).toBe("location=eq.circunvalacao");
  });

  it("subscribes to broadcast events", () => {
    expect(config.broadcasts).toContainEqual({ event: "table:open_requested" });
    expect(config.broadcasts).toContainEqual({ event: "table:preferences_updated" });
  });

  describe("mapEvent", () => {
    it("maps broadcast table:open_requested", () => {
      const result = config.mapEvent(
        { payload: { tableId: "t1", tableNumber: 5 } },
        "broadcast",
        "table:open_requested",
      );
      expect(result?.event).toBe("table:open_requested");
      expect(result?.source).toBe("broadcast");
    });

    it("maps table status change from postgres", () => {
      const result = config.mapEvent(
        {
          table: "tables",
          eventType: "UPDATE",
          new: { id: "t1", number: 5, status: "occupied" },
          old: { id: "t1", number: 5, status: "available" },
        },
        "postgres",
      );
      expect(result?.event).toBe("table:status_changed");
      expect(result?.payload).toMatchObject({
        tableId: "t1",
        status: "occupied",
        previousStatus: "available",
      });
    });

    it("maps customer preference update from postgres", () => {
      const result = config.mapEvent(
        {
          table: "tables",
          eventType: "UPDATE",
          new: { id: "t1", number: 5, status: "occupied", customer_requested_rodizio: true, customer_requested_num_people: 4 },
          old: { id: "t1", number: 5, status: "occupied", customer_requested_rodizio: null, customer_requested_num_people: null },
        },
        "postgres",
      );
      expect(result?.event).toBe("table:preferences_updated");
      expect(result?.payload).toMatchObject({
        requestedRodizio: true,
        requestedNumPeople: 4,
      });
    });

    it("maps session INSERT as session_opened", () => {
      const result = config.mapEvent(
        {
          table: "sessions",
          eventType: "INSERT",
          new: { id: "s1", table_id: "t1", is_rodizio: true, num_people: 3 },
        },
        "postgres",
      );
      expect(result?.event).toBe("table:session_opened");
      expect(result?.payload).toMatchObject({
        sessionId: "s1",
        isRodizio: true,
        numPeople: 3,
      });
    });

    it("maps session UPDATE to closed as session_closed", () => {
      const result = config.mapEvent(
        {
          table: "sessions",
          eventType: "UPDATE",
          new: { id: "s1", table_id: "t1", status: "closed" },
          old: { id: "s1", table_id: "t1", status: "active" },
        },
        "postgres",
      );
      expect(result?.event).toBe("table:session_closed");
    });

    it("returns null for irrelevant updates", () => {
      const result = config.mapEvent(
        {
          table: "tables",
          eventType: "UPDATE",
          new: { id: "t1", status: "occupied", customer_requested_rodizio: null, customer_requested_num_people: null },
          old: { id: "t1", status: "occupied", customer_requested_rodizio: null, customer_requested_num_people: null },
        },
        "postgres",
      );
      expect(result).toBeNull();
    });
  });
});

describe("createOrderChannelConfig", () => {
  const config = createOrderChannelConfig({
    sessionId: "session-123",
  });

  it("creates channel with session suffix", () => {
    expect(config.name).toBe("rt-orders-session-123");
  });

  it("filters orders by session_id", () => {
    expect(config.postgresChanges![0].filter).toBe("session_id=eq.session-123");
  });

  describe("mapEvent", () => {
    it("maps INSERT as order:created", () => {
      const result = config.mapEvent(
        {
          eventType: "INSERT",
          new: { id: "o1", session_id: "s1", product_id: 42, quantity: 2, status: "pending" },
        },
        "postgres",
      );
      expect(result?.event).toBe("order:created");
      expect(result?.payload).toMatchObject({ orderId: "o1", quantity: 2 });
    });

    it("maps status change as order:status_changed", () => {
      const result = config.mapEvent(
        {
          eventType: "UPDATE",
          new: { id: "o1", session_id: "s1", product_id: 42, status: "preparing" },
          old: { id: "o1", session_id: "s1", product_id: 42, status: "pending" },
        },
        "postgres",
      );
      expect(result?.event).toBe("order:status_changed");
      expect(result?.payload).toMatchObject({
        status: "preparing",
        previousStatus: "pending",
      });
    });

    it("maps cancellation as order:cancelled", () => {
      const result = config.mapEvent(
        {
          eventType: "UPDATE",
          new: { id: "o1", session_id: "s1", product_id: 42, status: "cancelled" },
          old: { id: "o1", session_id: "s1", product_id: 42, status: "pending" },
        },
        "postgres",
      );
      expect(result?.event).toBe("order:cancelled");
    });

    it("maps broadcast order:created", () => {
      const result = config.mapEvent(
        { payload: { sessionId: "s1", itemCount: 3 } },
        "broadcast",
        "order:created",
      );
      expect(result?.event).toBe("order:created");
      expect(result?.source).toBe("broadcast");
    });
  });

  describe("status filtering", () => {
    const kitchenConfig = createOrderChannelConfig({
      statuses: ["pending", "preparing", "ready"],
    });

    it("passes events with matching status", () => {
      const result = kitchenConfig.mapEvent(
        {
          eventType: "INSERT",
          new: { id: "o1", session_id: "s1", product_id: 1, status: "pending" },
        },
        "postgres",
      );
      expect(result).not.toBeNull();
    });

    it("filters out events with non-matching status", () => {
      const result = kitchenConfig.mapEvent(
        {
          eventType: "INSERT",
          new: { id: "o1", session_id: "s1", product_id: 1, status: "delivered" },
        },
        "postgres",
      );
      expect(result).toBeNull();
    });
  });
});

describe("createWaiterCallChannelConfig", () => {
  const config = createWaiterCallChannelConfig({ location: "boavista" });

  it("creates channel with location suffix", () => {
    expect(config.name).toBe("rt-calls-boavista");
  });

  describe("mapEvent", () => {
    it("maps INSERT as call:created", () => {
      const result = config.mapEvent(
        {
          eventType: "INSERT",
          new: { id: "c1", table_id: "t1", type: "bill" },
        },
        "postgres",
      );
      expect(result?.event).toBe("call:created");
      expect(result?.payload).toMatchObject({ callId: "c1", callType: "bill" });
    });

    it("maps UPDATE to acknowledged as call:acknowledged", () => {
      const result = config.mapEvent(
        {
          eventType: "UPDATE",
          new: { id: "c1", table_id: "t1", type: "assistance", status: "acknowledged" },
        },
        "postgres",
      );
      expect(result?.event).toBe("call:acknowledged");
    });

    it("maps UPDATE to resolved as call:resolved", () => {
      const result = config.mapEvent(
        {
          eventType: "UPDATE",
          new: { id: "c1", table_id: "t1", type: "assistance", status: "resolved" },
        },
        "postgres",
      );
      expect(result?.event).toBe("call:resolved");
    });

    it("maps broadcast call:created", () => {
      const result = config.mapEvent(
        { payload: { tableId: "t1", tableNumber: 3, callType: "assistance" } },
        "broadcast",
        "call:created",
      );
      expect(result?.event).toBe("call:created");
      expect(result?.source).toBe("broadcast");
    });
  });
});
