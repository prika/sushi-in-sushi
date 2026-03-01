/**
 * Vendus Table Import & Mapping Tests
 *
 * Tests cover:
 * - importTablesFromVendus: rooms→tables→match/create
 * - getTableMapping: query with location filter
 * - mapTableToVendus / unmapTableFromVendus
 * - getVendusTables: rooms + tables grouped by room
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  importTablesFromVendus,
  getTableMapping,
  mapTableToVendus,
  unmapTableFromVendus,
  getVendusTables,
} from "../tables";
import type { VendusRoomsResponse, VendusTablesResponse } from "../types";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("../client", () => ({
  getVendusClient: vi.fn(),
  VendusApiError: class extends Error {
    constructor(
      public _code: string,
      message: string,
      public _details?: Record<string, unknown>,
      public _statusCode?: number,
    ) {
      super(message);
      this.name = "VendusApiError";
    }
    getUserMessage() {
      return `Erro: ${this.message}`;
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

function createVendusClientMock(config: {
  rooms?: VendusRoomsResponse;
  tablesByRoom?: Record<string, VendusTablesResponse>;
}) {
  return {
    get: vi.fn().mockImplementation((endpoint: string) => {
      if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
        return Promise.resolve(
          config.rooms ?? { rooms: [] },
        );
      }
      // Match /rooms/{id}/tables
      const roomMatch = endpoint.match(/\/rooms\/([^/]+)\/tables/);
      if (roomMatch) {
        const roomId = roomMatch[1];
        return Promise.resolve(
          config.tablesByRoom?.[roomId] ?? { tables: [] },
        );
      }
      return Promise.resolve({});
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

function createTablesSupabaseMock(config: {
  existingByVendusId?: Record<string, { id: string }>;
  existingByNumber?: Record<string, { id: string }>;
  onInsert?: (_data: unknown) => void;
  onUpdate?: (_data: unknown) => void;
  insertError?: boolean;
  // For getTableMapping
  tables?: unknown[];
  tablesError?: boolean;
  // For map/unmap
  updateError?: boolean;
}) {
  return {
    from: (table: string) => {
      if (table === "tables") {
        return {
          select: (_cols?: string) => ({
            eq: (col: string, val: unknown) => {
              // Match by vendus_table_id
              if (col === "vendus_table_id") {
                const key = String(val);
                return {
                  single: () =>
                    Promise.resolve({
                      data: config.existingByVendusId?.[key] ?? null,
                      error: null,
                    }),
                };
              }
              // Match by number (chained with location + is null)
              if (col === "number") {
                return {
                  eq: (col2: string, val2: unknown) => ({
                    is: () => ({
                      single: () => {
                        const key = `${val}-${val2}`;
                        return Promise.resolve({
                          data: config.existingByNumber?.[key] ?? null,
                          error: null,
                        });
                      },
                    }),
                  }),
                };
              }
              // getTableMapping: .eq("location", slug)
              if (col === "location") {
                return {
                  order: () =>
                    Promise.resolve({
                      data: config.tablesError ? null : (config.tables ?? []),
                      error: config.tablesError
                        ? { message: "error" }
                        : null,
                    }),
                };
              }
              return {
                single: () =>
                  Promise.resolve({ data: null, error: null }),
              };
            },
          }),
          insert: (data: unknown) => {
            config.onInsert?.(data);
            if (config.insertError) {
              return Promise.resolve({
                data: null,
                error: { message: "insert error" },
              });
            }
            return Promise.resolve({ data: null, error: null });
          },
          update: (data: unknown) => ({
            eq: (_col: string, _val: unknown) => {
              config.onUpdate?.(data);
              if (config.updateError) {
                return Promise.resolve({
                  data: null,
                  error: { message: "update error" },
                });
              }
              return Promise.resolve({ data: null, error: null });
            },
          }),
        };
      }

      if (table === "vendus_sync_log") {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: "log-1" }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
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
// TESTS: importTablesFromVendus
// =============================================

describe("importTablesFromVendus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Vendus not configured", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    await expect(
      importTablesFromVendus({ locationSlug: "test" }),
    ).rejects.toThrow("Vendus nao configurado");
  });

  it("fetches rooms then tables per room", async () => {
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
          { id: "room-2", name: "Sala 2", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-1", name: "Mesa 1", number: 1, room_id: "room-1", is_active: true },
          ],
        },
        "room-2": {
          tables: [
            { id: "vt-2", name: "Mesa 2", number: 2, room_id: "room-2", is_active: true },
          ],
        },
      },
    });

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(vendusClient.get).toHaveBeenCalledWith("/stores/store-1/rooms");
    expect(vendusClient.get).toHaveBeenCalledWith("/rooms/room-1/tables");
    expect(vendusClient.get).toHaveBeenCalledWith("/rooms/room-2/tables");
    expect(result.recordsProcessed).toBe(2);
  });

  it("updates existing table matched by vendus_table_id", async () => {
    let updateCount = 0;
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-existing", name: "Mesa 5", number: 5, room_id: "room-1", is_active: true },
          ],
        },
      },
    });

    const supabase = createTablesSupabaseMock({
      existingByVendusId: { "vt-existing": { id: "local-5" } },
      onUpdate: () => updateCount++,
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsUpdated).toBe(1);
    expect(result.recordsCreated).toBe(0);
    expect(updateCount).toBeGreaterThan(0);
  });

  it("links local table matched by number and location", async () => {
    let updateCount = 0;
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-new", name: "Mesa 3", number: 3, room_id: "room-1", is_active: true },
          ],
        },
      },
    });

    const supabase = createTablesSupabaseMock({
      existingByVendusId: {}, // No vendus_id match
      existingByNumber: { "3-circunvalacao": { id: "local-3" } },
      onUpdate: () => updateCount++,
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsUpdated).toBe(1);
    expect(result.recordsCreated).toBe(0);
    expect(updateCount).toBeGreaterThan(0);
  });

  it("creates new table when no match found", async () => {
    let inserted = false;
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-brand-new", name: "Mesa 99", number: 99, room_id: "room-1", is_active: true },
          ],
        },
      },
    });

    const supabase = createTablesSupabaseMock({
      existingByVendusId: {},
      existingByNumber: {},
      onInsert: () => (inserted = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsCreated).toBe(1);
    expect(inserted).toBe(true);
  });

  it("handles empty rooms response", async () => {
    const vendusClient = createVendusClientMock({ rooms: { rooms: [] } });
    const supabase = createTablesSupabaseMock({});

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsProcessed).toBe(0);
    expect(result.success).toBe(true);
  });

  it("records error when table insert fails", async () => {
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-fail", name: "Mesa 10", number: 10, room_id: "room-1", is_active: true },
          ],
        },
      },
    });

    const supabase = createTablesSupabaseMock({
      existingByVendusId: {},
      existingByNumber: {},
      insertError: true,
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsFailed).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.success).toBe(false);
  });

  it("calculates positive duration", async () => {
    const vendusClient = createVendusClientMock({ rooms: { rooms: [] } });
    const supabase = createTablesSupabaseMock({});

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("records error when fetching tables for a room fails", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve({
            rooms: [
              { id: "room-1", name: "Sala Falha", store_id: "s1", is_active: true },
            ],
          });
        }
        // Tables fetch for room-1 fails
        if (endpoint.includes("/rooms/room-1/tables")) {
          return Promise.reject(new Error("Connection timeout"));
        }
        return Promise.resolve({});
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain("Sala Falha");
  });

  it("handles VendusApiError in global rooms fetch", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = {
      get: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "Vendus offline", undefined, 500),
      ),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].id).toBe("global");
  });

  it("handles plain Error (not VendusApiError) in global catch", async () => {
    const vendusClient = {
      get: vi.fn().mockRejectedValue(new Error("plain connection error")),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toBe("plain connection error");
  });

  it("handles non-Error thrown value in per-table catch", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve({
            rooms: [
              { id: "room-1", name: "Sala", store_id: "s1", is_active: true },
            ],
          });
        }
        return Promise.resolve({
          tables: [
            { id: "vt-1", name: "Mesa 1", number: 1, room_id: "room-1", is_active: true },
          ],
        });
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    // Custom mock where processVendusTable triggers a non-Error throw
    const supabase = {
      from: (table: string) => {
        if (table === "tables") {
          return {
            select: () => ({
              eq: () => ({
                single: () => {
                  throw "non-error value"; // eslint-disable-line no-throw-literal
                },
              }),
            }),
          };
        }
        if (table === "vendus_sync_log") {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "log-1" }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        return {};
      },
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsFailed).toBe(1);
    expect(result.errors[0].error).toBe("Erro desconhecido");
  });

  it("skips sync log update when logEntry is null", async () => {
    const vendusClient = createVendusClientMock({ rooms: { rooms: [] } });

    // Custom mock where sync log insert returns null data
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_sync_log") {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
            update: vi.fn(() => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            })),
          };
        }
        return {};
      },
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    // Should succeed without trying to update the sync log
    expect(result.success).toBe(true);
  });

  it("returns empty from getTableMapping when data is null without error", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getTableMapping("circunvalacao");
    expect(result).toEqual([]);
  });

  it("handles rooms || [] fallback when rooms property is undefined", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve({ rooms: undefined });
        }
        return Promise.resolve({});
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsProcessed).toBe(0);
    expect(result.success).toBe(true);
  });

  it("handles tables || [] fallback when tables property is undefined", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve({
            rooms: [{ id: "room-1", name: "Sala", store_id: "s1", is_active: true }],
          });
        }
        // Return object with undefined tables
        return Promise.resolve({ tables: undefined });
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsProcessed).toBe(0);
  });

  it("handles rooms returned as array directly", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          // Return array directly instead of { rooms: [...] }
          return Promise.resolve([
            { id: "room-1", name: "Sala Array", store_id: "s1", is_active: true },
          ]);
        }
        if (endpoint.includes("/rooms/room-1/tables")) {
          // Return array directly
          return Promise.resolve([
            { id: "vt-1", name: "Mesa 1", number: 1, room_id: "room-1", is_active: true },
          ]);
        }
        return Promise.resolve({});
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const supabase = createTablesSupabaseMock({});
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await importTablesFromVendus({
      locationSlug: "circunvalacao",
    });

    expect(result.recordsProcessed).toBe(1);
  });
});

// =============================================
// TESTS: getTableMapping
// =============================================

describe("getTableMapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tables with vendus mapping for location", async () => {
    const mockTables = [
      {
        id: "t1",
        number: 1,
        name: "Mesa 1",
        vendus_table_id: "vt-1",
        vendus_room_id: "vr-1",
        vendus_synced_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "t2",
        number: 2,
        name: "Mesa 2",
        vendus_table_id: null,
        vendus_room_id: null,
        vendus_synced_at: null,
      },
    ];

    const supabase = createTablesSupabaseMock({ tables: mockTables });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getTableMapping("circunvalacao");

    expect(result).toEqual(mockTables);
  });

  it("returns empty array on error", async () => {
    const supabase = createTablesSupabaseMock({ tablesError: true });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getTableMapping("circunvalacao");

    expect(result).toEqual([]);
  });
});

// =============================================
// TESTS: mapTableToVendus / unmapTableFromVendus
// =============================================

describe("mapTableToVendus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates table with vendus_table_id and room_id", async () => {
    let updatedData: unknown = null;
    const supabase = createTablesSupabaseMock({
      onUpdate: (data) => (updatedData = data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await mapTableToVendus("t1", "vt-1", "vr-1");

    expect(result.success).toBe(true);
    expect(updatedData).toEqual(
      expect.objectContaining({
        vendus_table_id: "vt-1",
        vendus_room_id: "vr-1",
      }),
    );
  });

  it("sets vendus_room_id to null when not provided", async () => {
    let updatedData: unknown = null;
    const supabase = createTablesSupabaseMock({
      onUpdate: (data) => (updatedData = data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await mapTableToVendus("t1", "vt-1");

    expect(result.success).toBe(true);
    expect(updatedData).toEqual(
      expect.objectContaining({
        vendus_table_id: "vt-1",
        vendus_room_id: null,
      }),
    );
  });

  it("returns error on DB failure", async () => {
    const supabase = createTablesSupabaseMock({ updateError: true });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await mapTableToVendus("t1", "vt-1");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("unmapTableFromVendus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets vendus fields to null", async () => {
    let updatedData: unknown = null;
    const supabase = createTablesSupabaseMock({
      onUpdate: (data) => (updatedData = data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await unmapTableFromVendus("t1");

    expect(result.success).toBe(true);
    expect(updatedData).toEqual({
      vendus_table_id: null,
      vendus_room_id: null,
      vendus_synced_at: null,
    });
  });

  it("returns error on DB failure", async () => {
    const supabase = createTablesSupabaseMock({ updateError: true });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await unmapTableFromVendus("t1");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// =============================================
// TESTS: getVendusTables
// =============================================

describe("getVendusTables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Vendus not configured", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    await expect(getVendusTables("test")).rejects.toThrow(
      "Vendus nao configurado",
    );
  });

  it("handles rooms returned as array in getVendusTables", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve([
            { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
          ]);
        }
        return Promise.resolve([
          { id: "vt-1", name: "Mesa 1", number: 1, room_id: "room-1", is_active: true },
        ]);
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getVendusTables("circunvalacao");

    expect(result.rooms).toHaveLength(1);
    expect(result.tables["room-1"]).toHaveLength(1);
  });

  it("handles rooms || [] fallback in getVendusTables", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve({ rooms: undefined });
        }
        return Promise.resolve({ tables: undefined });
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getVendusTables("circunvalacao");

    expect(result.rooms).toEqual([]);
  });

  it("handles tables || [] fallback in getVendusTables", async () => {
    const vendusClient = {
      get: vi.fn().mockImplementation((endpoint: string) => {
        if (endpoint.includes("/rooms") && !endpoint.includes("/tables")) {
          return Promise.resolve({
            rooms: [{ id: "room-1", name: "Sala", store_id: "s1", is_active: true }],
          });
        }
        return Promise.resolve({});
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getVendusTables("circunvalacao");

    expect(result.tables["room-1"]).toEqual([]);
  });

  it("returns rooms and tables grouped by room id", async () => {
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala 1", store_id: "s1", is_active: true },
          { id: "room-2", name: "Terraco", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-1", name: "Mesa 1", number: 1, room_id: "room-1", is_active: true },
            { id: "vt-2", name: "Mesa 2", number: 2, room_id: "room-1", is_active: true },
          ],
        },
        "room-2": {
          tables: [
            { id: "vt-3", name: "Mesa 3", number: 3, room_id: "room-2", is_active: true },
          ],
        },
      },
    });

    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getVendusTables("circunvalacao");

    expect(result.rooms).toHaveLength(2);
    expect(result.tables["room-1"]).toHaveLength(2);
    expect(result.tables["room-2"]).toHaveLength(1);
  });
});

// =============================================
// ADDITIONAL BRANCH COVERAGE
// =============================================

describe("importTablesFromVendus - remaining branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses fallback name 'Mesa N' when vTable.name is falsy", async () => {
    const vendusClient = createVendusClientMock({
      rooms: {
        rooms: [
          { id: "room-1", name: "Sala", store_id: "s1", is_active: true },
        ],
      },
      tablesByRoom: {
        "room-1": {
          tables: [
            { id: "vt-1", name: "", number: 5, room_id: "room-1", is_active: true },
          ],
        },
      },
    });

    const inserts: unknown[] = [];
    const supabase = createTablesSupabaseMock({
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await importTablesFromVendus({ locationSlug: "circunvalacao" });

    expect(inserts.length).toBeGreaterThan(0);
    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.name).toBe("Mesa 5");
  });

});
