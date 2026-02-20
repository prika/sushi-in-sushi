/**
 * Vendus Kitchen Printing Tests
 *
 * Tests cover:
 * - sendOrderToKitchen: optional feature, graceful error handling
 * - sendOrdersToKitchen: batch delegation
 * - getKitchenPrinters: list or empty fallback
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendOrderToKitchen,
  sendOrdersToKitchen,
  getKitchenPrinters,
} from "../kitchen";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("../client", () => ({
  getVendusClient: vi.fn(),
  VendusApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: Record<string, unknown>,
      public statusCode?: number,
    ) {
      super(message);
      this.name = "VendusApiError";
    }
    getUserMessage() {
      return `Erro Vendus: ${this.message}`;
    }
  },
}));

vi.mock("../config", () => ({
  getVendusConfig: vi.fn().mockResolvedValue({
    apiKey: "test-key",
    storeId: "store-1",
    registerId: "reg-1",
    baseUrl: "https://test.vendus.pt",
    timeout: 5000,
    retryAttempts: 2,
  }),
}));

import { createAdminClient } from "@/lib/supabase/server";
import { getVendusClient } from "../client";
import { getVendusConfig } from "../config";

// =============================================
// HELPERS
// =============================================

function createVendusClientMock(overrides?: Record<string, unknown>) {
  return {
    get: vi.fn().mockResolvedValue({ printers: [] }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

function createKitchenSupabaseMock(config: {
  session?: Record<string, unknown> | null;
  orders?: Array<Record<string, unknown>> | null;
  onSyncLogInsert?: () => void;
}) {
  return {
    from: (table: string) => {
      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: config.session ?? null,
                  error: config.session === null ? { message: "not found" } : null,
                }),
            }),
          }),
        };
      }

      if (table === "orders") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: config.orders ?? null,
                error: null,
              }),
          }),
        };
      }

      if (table === "vendus_sync_log") {
        return {
          insert: (data: unknown) => {
            config.onSyncLogInsert?.();
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
  };
}

// =============================================
// TESTS: sendOrderToKitchen
// =============================================

describe("sendOrderToKitchen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success:true when Vendus not configured (optional feature)", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    const result = await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(true);
    // Should not call Supabase or Vendus
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns error when session not found", async () => {
    const supabase = createKitchenSupabaseMock({ session: null });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock() as never,
    );

    const result = await sendOrderToKitchen({
      sessionId: "sess-missing",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Sessao nao encontrada");
  });

  it("returns error when no orders found", async () => {
    const supabase = createKitchenSupabaseMock({
      session: {
        id: "sess-1",
        tables: { number: 5, name: "Mesa 5", vendus_table_id: "vt-5" },
      },
      orders: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock() as never,
    );

    const result = await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Pedidos nao encontrados");
  });

  it("builds kitchen order with correct table name and items", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createKitchenSupabaseMock({
      session: {
        id: "sess-1",
        tables: { number: 7, name: "Mesa 7" },
      },
      orders: [
        { id: "o1", quantity: 2, notes: "sem wasabi", products: { name: "Sashimi" } },
        { id: "o2", quantity: 1, notes: null, products: { name: "Miso Soup" } },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1", "o2"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(true);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/kitchen/print",
      expect.objectContaining({
        table_name: "Mesa 7",
        table_number: 7,
        items: expect.arrayContaining([
          expect.objectContaining({
            product_name: "Sashimi",
            quantity: 2,
            notes: "sem wasabi",
          }),
          expect.objectContaining({
            product_name: "Miso Soup",
            quantity: 1,
          }),
        ]),
      }),
    );
  });

  it("uses fallback table name when table info is null", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createKitchenSupabaseMock({
      session: { id: "sess-1", tables: null },
      orders: [
        { id: "o1", quantity: 1, notes: null, products: { name: "Gyoza" } },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    expect(callArg.table_name).toContain("Mesa");
  });

  it("includes printer_id when provided", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createKitchenSupabaseMock({
      session: { id: "sess-1", tables: { number: 1, name: "Mesa 1" } },
      orders: [
        { id: "o1", quantity: 1, notes: null, products: { name: "Ramen" } },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
      printerId: "printer-kitchen-1",
    });

    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    expect(callArg.printer_id).toBe("printer-kitchen-1");
  });

  it("logs success to vendus_sync_log", async () => {
    let syncLogged = false;
    const vendusClient = createVendusClientMock();
    const supabase = createKitchenSupabaseMock({
      session: { id: "sess-1", tables: { number: 1, name: "Mesa 1" } },
      orders: [
        { id: "o1", quantity: 1, notes: null, products: { name: "Edamame" } },
      ],
      onSyncLogInsert: () => (syncLogged = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(syncLogged).toBe(true);
  });

  it("returns error but does not throw on API failure", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "printer offline", undefined, 500),
      ),
    });

    let syncLogged = false;
    const supabase = createKitchenSupabaseMock({
      session: { id: "sess-1", tables: { number: 1, name: "Mesa 1" } },
      orders: [
        { id: "o1", quantity: 1, notes: null, products: { name: "Sake" } },
      ],
      onSyncLogInsert: () => (syncLogged = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    // Should NOT throw - kitchen printing is non-blocking
    const result = await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("impressora");
    expect(syncLogged).toBe(true); // Error logged too
  });
});

// =============================================
// TESTS: sendOrdersToKitchen
// =============================================

describe("sendOrdersToKitchen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to sendOrderToKitchen", async () => {
    // When Vendus is not configured, sendOrderToKitchen returns success immediately
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    const result = await sendOrdersToKitchen(
      "sess-1",
      ["o1", "o2"],
      "circunvalacao",
    );

    expect(result.success).toBe(true);
  });
});

// =============================================
// TESTS: getKitchenPrinters
// =============================================

describe("getKitchenPrinters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when Vendus not configured", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    const result = await getKitchenPrinters("circunvalacao");

    expect(result).toEqual([]);
  });

  it("returns printer list from Vendus API", async () => {
    const printers = [
      { id: "p1", name: "Cozinha Principal", type: "kitchen" },
      { id: "p2", name: "Bar", type: "bar" },
    ];

    const vendusClient = createVendusClientMock({
      get: vi.fn().mockResolvedValue({ printers }),
    });

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getKitchenPrinters("circunvalacao");

    expect(result).toEqual(printers);
    expect(vendusClient.get).toHaveBeenCalledWith("/stores/store-1/printers");
  });

  it("returns empty array on API error", async () => {
    const vendusClient = createVendusClientMock({
      get: vi.fn().mockRejectedValue(new Error("connection failed")),
    });

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getKitchenPrinters("circunvalacao");

    expect(result).toEqual([]);
  });

  it("handles printers returned as array directly", async () => {
    const printers = [
      { id: "p1", name: "Cozinha", type: "kitchen" },
    ];

    const vendusClient = createVendusClientMock({
      get: vi.fn().mockResolvedValue(printers),
    });

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getKitchenPrinters("circunvalacao");

    expect(result).toEqual(printers);
  });

  it("returns empty array when raw.printers is falsy", async () => {
    const vendusClient = createVendusClientMock({
      get: vi.fn().mockResolvedValue({}),
    });

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getKitchenPrinters("circunvalacao");

    expect(result).toEqual([]);
  });

  it("handles plain Error (not VendusApiError) in catch", async () => {
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(new Error("plain error")),
    });

    const supabase = createKitchenSupabaseMock({
      session: { id: "sess-1", tables: { number: 1, name: "Mesa 1" } },
      orders: [
        { id: "o1", quantity: 1, notes: null, products: { name: "Sake" } },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("plain error");
  });

  it("uses fallback product name when order.products is null", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createKitchenSupabaseMock({
      session: { id: "sess-1", tables: { number: 1, name: "Mesa 1" } },
      orders: [
        { id: "o1", quantity: 1, notes: null, products: null },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await sendOrderToKitchen({
      sessionId: "sess-1",
      orderIds: ["o1"],
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(true);
    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    const items = callArg.items as Array<Record<string, unknown>>;
    expect(items[0].product_name).toBe("Produto");
  });
});
