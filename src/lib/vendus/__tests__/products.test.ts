/**
 * Vendus Product Sync Tests
 *
 * Tests cover:
 * - Pull: create new products from Vendus
 * - Pull: update existing (by vendus_id, by name)
 * - Pull: conflict resolution (timestamp)
 * - Pull: preview mode (no DB writes)
 * - Push: create/update products in Vendus
 * - Push: category mapping, error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  syncProducts,
  getProductSyncStatus,
  markProductForSync,
  getProductsWithSyncStatus,
  getProductSyncStats,
} from "../products";
import type { VendusProductsResponse } from "../types";

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
    isRetryable() {
      return this.statusCode ? this.statusCode >= 500 : false;
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
  VENDUS_TAX_RATES: { NORMAL: "1" },
}));

import { createAdminClient } from "@/lib/supabase/server";
import { getVendusClient } from "../client";

/**
 * Creates a chainable Supabase mock for sync tests.
 *
 * allProducts: all local products returned by the pre-fetch query.
 * firstCategory: default category for new product creation.
 * onUpdate/onInsert: callbacks to track DB writes.
 */
function createSupabaseMock(config: {
  syncLogInsert?: { id: string };
  firstCategory?: { id: string } | null;
  localCategories?: Array<{ id: string; name: string }>;
  allProducts?: Array<Record<string, unknown>>;
  onUpdate?: () => void;
  onInsert?: (data: unknown) => void;
}) {
  // Resolve local categories: explicit list, from firstCategory, or empty
  const resolvedLocalCats: Array<{ id: string; name: string }> =
    config.localCategories ??
    (config.firstCategory
      ? [{ id: config.firstCategory.id, name: "Default" }]
      : []);

  const from = (table: string) => {
    return {
      select: (cols?: string) => {
        // Pre-fetch all products query
        if (
          table === "products" &&
          cols &&
          cols.includes("vendus_id") &&
          cols.includes("updated_at")
        ) {
          return Promise.resolve({
            data: config.allProducts ?? [],
            error: null,
          });
        }

        return {
          eq: (col: string, val: unknown) => {
            if (table === "products" && col === "is_available") {
              return {
                in: () => Promise.resolve({ data: [], error: null }),
                or: () => Promise.resolve({ data: [], error: null }),
              };
            }
            return {
              single: () =>
                Promise.resolve({ data: null, error: null }),
            };
          },
          order: (orderCol: string) => {
            if (table === "categories") {
              // New pattern: select("id, name").order("sort_order") -> array
              return Promise.resolve({
                data: resolvedLocalCats,
                error: null,
              });
            }
            return Promise.resolve({ data: [], error: null });
          },
          in: () => Promise.resolve({ data: [], error: null }),
        };
      },
      insert: (data: unknown) => {
        if (table === "products") {
          config.onInsert?.(data);
          return Promise.resolve({ data: null, error: null });
        }
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: config.syncLogInsert ?? { id: "log-1" },
                error: null,
              }),
          }),
        };
      },
      update: (data: unknown) => ({
        eq: (col: string, val: unknown) => {
          config.onUpdate?.();
          return Promise.resolve({ data: null, error: null });
        },
      }),
    };
  };
  return { from };
}

function createVendusClientMock(
  products: VendusProductsResponse,
  vendusCategories?: Array<{ id: string; name: string }>,
) {
  return {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/products/categories")) {
        return Promise.resolve(vendusCategories ?? []);
      }
      return Promise.resolve(products);
    }),
    post: vi.fn(),
    put: vi.fn(),
  };
}

// Suppress noisy console output from Vendus sync functions
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe("syncProducts - pull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Vendus is not configured", async () => {
    const { getVendusConfig } = await import("../config");
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    await expect(
      syncProducts({ locationSlug: "test", direction: "pull" }),
    ).rejects.toThrow("Vendus nao configurado");
  });

  it("creates new products from Vendus when no match exists", async () => {
    const vendusProducts = {
      products: [
        {
          id: 1001,
          reference: "ref-1",
          title: "Novo Produto",
          gross_price: "12.50",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
        },
      ],
    };

    let insertCalled = false;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [], // No local products
      onInsert: () => { insertCalled = true; },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
      previewOnly: false,
    });

    expect(result.recordsCreated).toBe(1);
    expect(result.recordsProcessed).toBe(1);
    expect(result.success).toBe(true);
    expect(insertCalled).toBe(true);
  });

  it("preview mode returns planned actions without writing", async () => {
    const vendusProducts = {
      products: [
        {
          id: 1002,
          reference: "r",
          title: "Produto Novo",
          gross_price: "5.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    let insertCalled = false;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [], // No local products
      onInsert: () => { insertCalled = true; },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: true,
      defaultCategoryId: "cat-1",
    });

    expect(result.preview).toBeDefined();
    expect(result.preview?.toCreate).toHaveLength(1);
    expect(result.preview?.toCreate[0].name).toBe("Produto Novo");
    expect(result.recordsCreated).toBe(0); // Preview doesn't create
    expect(insertCalled).toBe(false); // No actual insert in preview
  });

  it("adds warning when no default category and products to create", async () => {
    const vendusProducts = {
      products: [
        {
          id: 1003,
          reference: "r",
          title: "Novo",
          gross_price: "1.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: null,
      allProducts: [], // No local products
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: true,
      defaultCategoryId: undefined,
    });

    // Should have error for missing category
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain("Sem categoria por defeito");
    // Preview should include warning about category
    expect(result.preview?.warnings).toBeDefined();
    expect(
      result.preview?.warnings?.some(
        (w) => w.id === "no_category" || w.message.includes("categoria"),
      ),
    ).toBe(true);
  });

  it("updates existing product matched by vendus_id", async () => {
    const vendusProducts = {
      products: [
        {
          id: 1004,
          reference: "ref",
          title: "Produto Atualizado",
          gross_price: "15.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-20T12:00:00Z",
          updated_at: "2024-01-20T12:00:00Z",
        },
      ],
    };

    let updated = false;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-1",
          name: "Produto Antigo",
          price: 10,
          description: undefined,
          is_available: true,
          vendus_id: "1004",
          vendus_ids: { dine_in: "1004" },
          updated_at: "2024-01-10T00:00:00Z",
          vendus_synced_at: "2024-01-05T00:00:00Z",
        },
      ],
      onUpdate: () => (updated = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: false,
    });

    expect(result.recordsUpdated).toBe(1);
    expect(result.success).toBe(true);
    expect(updated).toBe(true);
  });

  it("detects conflict when both local and Vendus changed since last sync", async () => {
    const vendusProducts = {
      products: [
        {
          id: 1005,
          reference: "r",
          title: "Produto Conflito",
          gross_price: "20.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-25T15:00:00Z",
          updated_at: "2024-01-25T15:00:00Z", // Vendus newer
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-1",
          name: "Produto Conflito",
          price: 18,
          description: undefined,
          is_available: true,
          vendus_id: "1005",
          vendus_ids: { dine_in: "1005" },
          updated_at: "2024-01-20T10:00:00Z", // Local changed
          vendus_synced_at: "2024-01-15T00:00:00Z", // Last sync
        },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: false,
    });

    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);
    expect(result.warnings?.some((w) => w.type === "conflict_resolved")).toBe(
      true,
    );
    expect(result.warnings?.some((w) => w.message.includes("Vendus"))).toBe(
      true,
    );
  });
});

// =============================================
// PUSH SYNC TESTS
// =============================================

import { getVendusConfig } from "../config";

/**
 * Creates a Supabase mock tailored for push sync tests.
 * Push queries differ from pull (no updated_at in select, uses category_id).
 */
function createPushSupabaseMock(config: {
  pushProducts?: Array<Record<string, unknown>>;
  categories?: Array<{ id: string; vendus_id: string | null }>;
  onProductUpdate?: (data: unknown) => void;
  syncLogInsert?: { id: string };
}) {
  return {
    from: (table: string) => {
      if (table === "products") {
        return {
          select: (cols?: string) => {
            // Pull pre-fetch: cols include "updated_at"
            if (cols && cols.includes("updated_at")) {
              return Promise.resolve({ data: [], error: null });
            }
            // Push product fetch: cols include "category_id"
            return {
              eq: (col: string, val: unknown) => ({
                in: () =>
                  Promise.resolve({
                    data: config.pushProducts ?? [],
                    error: null,
                  }),
                or: () =>
                  Promise.resolve({
                    data: config.pushProducts ?? [],
                    error: null,
                  }),
              }),
            };
          },
          insert: () => Promise.resolve({ data: null, error: null }),
          update: (data: unknown) => ({
            eq: (col: string, val: unknown) => {
              config.onProductUpdate?.(data);
              return Promise.resolve({ data: null, error: null });
            },
          }),
        };
      }

      if (table === "categories") {
        return {
          select: (cols?: string) => {
            // Push: fetch category vendus_id map
            if (cols && cols.includes("vendus_id")) {
              return {
                in: () =>
                  Promise.resolve({
                    data: config.categories ?? [],
                    error: null,
                  }),
              };
            }
            // Pull: first category query
            return {
              order: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { id: "cat-default" },
                      error: null,
                    }),
                }),
              }),
              in: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      }

      if (table === "vendus_sync_log") {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: config.syncLogInsert ?? { id: "log-1" },
                  error: null,
                }),
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

function createPushVendusClientMock(overrides?: Record<string, unknown>) {
  return {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/products/categories")) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ products: [] });
    }),
    post: vi.fn().mockResolvedValue({ id: "vendus-new-1" }),
    put: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("syncProducts - push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Vendus is not configured", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    await expect(
      syncProducts({ locationSlug: "test", direction: "push" }),
    ).rejects.toThrow("Vendus nao configurado");
  });

  it("creates new product in Vendus when no vendus_id", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "local-1",
          name: "Sashimi Mix",
          description: "Variedade de sashimi",
          price: 18.5,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [{ id: "cat-1", vendus_id: "vcat-1" }],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsCreated).toBe(1);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({
        title: "Sashimi Mix",
        gross_price: "18.5",
      }),
    );
  });

  it("updates existing product in Vendus when vendus_id present", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "local-2",
          name: "Miso Soup",
          description: undefined,
          price: 4.5,
          is_available: true,
          vendus_id: "vendus-existing-2",
          vendus_ids: { dine_in: "vendus-existing-2" },
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [{ id: "cat-1", vendus_id: null }],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsUpdated).toBe(1);
    expect(vendusClient.put).toHaveBeenCalledWith(
      "/products/vendus-existing-2",
      expect.objectContaining({ title: "Miso Soup", gross_price: "4.5" }),
    );
  });

  it("saves vendus_id and sync metadata locally after push", async () => {
    const updates: unknown[] = [];
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "local-3",
          name: "Gyoza",
          description: undefined,
          price: 7,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
      onProductUpdate: (data) => updates.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    // Should save vendus_id, vendus_ids and sync status
    const syncUpdate = updates.find(
      (u) => (u as Record<string, unknown>).vendus_sync_status === "synced",
    );
    expect(syncUpdate).toBeDefined();
    expect((syncUpdate as Record<string, unknown>).vendus_id).toBe(
      "vendus-new-1",
    );
    expect((syncUpdate as Record<string, unknown>).vendus_ids).toEqual(
      { dine_in: "vendus-new-1" },
    );
  });

  it("marks product as error on push failure", async () => {
    const updates: unknown[] = [];
    const vendusClient = createPushVendusClientMock({
      post: vi.fn().mockRejectedValue(new Error("API error")),
    });
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "local-fail",
          name: "Tempura",
          description: undefined,
          price: 12,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
      onProductUpdate: (data) => updates.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsFailed).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    // Should mark product with error status
    const errorUpdate = updates.find(
      (u) => (u as Record<string, unknown>).vendus_sync_status === "error",
    );
    expect(errorUpdate).toBeDefined();
  });

  it("handles empty product list (nothing to push)", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({ pushProducts: [] });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsProcessed).toBe(0);
    expect(vendusClient.post).not.toHaveBeenCalled();
    expect(vendusClient.put).not.toHaveBeenCalled();
  });

  it("uses reference from product.id with mode suffix", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "abcdefghij1234567890-extra-long-id",
          name: "Test",
          description: undefined,
          price: 5,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: ["dine_in"],
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    const postArgs = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    // Reference format: {id_prefix(14)}_{mode_prefix(5)} = max 20 chars
    expect(postArgs.reference).toBe("abcdefghij1234_dine_");
    expect((postArgs.reference as string).length).toBeLessThanOrEqual(20);
  });
});

// =============================================
// SERVICE MODE + CATEGORY MATCHING TESTS
// =============================================

describe("syncProducts - service modes and category matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets service_modes from Vendus category (Delivery)", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2001,
          reference: "d1",
          title: "Sushi Delivery Box",
          gross_price: "20.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [
      { id: "10", name: "Delivery" },
      { id: "20", name: "Take away" },
    ];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-default" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-default",
    });

    expect(result.recordsCreated).toBe(1);
    expect(inserts).toHaveLength(1);
    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.service_modes).toEqual(["delivery"]);
  });

  it("sets service_modes to takeaway for Take away category", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2002,
          reference: "t1",
          title: "Combo Take Away",
          gross_price: "15.00",
          tax_id: "1",
          status: "on",
          category_id: 20,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [
      { id: "10", name: "Delivery" },
      { id: "20", name: "Take away" },
    ];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-default" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-default",
    });

    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.service_modes).toEqual(["takeaway"]);
  });

  it("defaults to dine_in when no Vendus category", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2003,
          reference: "n1",
          title: "Produto Sem Categoria",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          // No category_id
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-default" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-default",
    });

    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.service_modes).toEqual(["dine_in"]);
  });

  it("auto-matches product to local category by name", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2004,
          reference: "s1",
          title: "Sushi California Roll",
          gross_price: "12.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [{ id: "10", name: "Delivery" }];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      localCategories: [
        { id: "cat-sushi", name: "Sushi" },
        { id: "cat-bebidas", name: "Bebidas" },
        { id: "cat-sobremesas", name: "Sobremesas" },
      ],
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    expect(inserts).toHaveLength(1);
    const inserted = inserts[0] as Record<string, unknown>;
    // Should match "Sushi" category by name
    expect(inserted.category_id).toBe("cat-sushi");
    // Should have delivery service mode
    expect(inserted.service_modes).toEqual(["delivery"]);
  });

  it("uses default category when no name match", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2005,
          reference: "x1",
          title: "Special Combo",
          gross_price: "25.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [{ id: "10", name: "Delivery" }];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      localCategories: [
        { id: "cat-sushi", name: "Sushi" },
        { id: "cat-bebidas", name: "Bebidas" },
      ],
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    const inserted = inserts[0] as Record<string, unknown>;
    // No name match for "Special Combo" → falls back to first local category
    expect(inserted.category_id).toBe("cat-sushi");
  });

  it("preview includes service mode and category info", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2006,
          reference: "p1",
          title: "Sushi Mix Delivery",
          gross_price: "18.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [{ id: "10", name: "Delivery" }];

    const supabase = createSupabaseMock({
      localCategories: [
        { id: "cat-sushi", name: "Sushi" },
      ],
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: true,
    });

    expect(result.preview?.toCreate).toHaveLength(1);
    const item = result.preview!.toCreate[0];
    expect(item.serviceModes).toEqual(["delivery"]);
    expect(item.vendusCategory).toBe("Delivery");
    expect(item.categoryAutoMatched).toBe(true);
  });

  it("longest category name wins in name matching", async () => {
    const vendusProducts = {
      products: [
        {
          id: 2007,
          reference: "l1",
          title: "Sushi Especial de Salmao",
          gross_price: "22.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      localCategories: [
        { id: "cat-sushi", name: "Sushi" },
        { id: "cat-sushi-especial", name: "Sushi Especial" },
        { id: "cat-bebidas", name: "Bebidas" },
      ],
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    const inserted = inserts[0] as Record<string, unknown>;
    // "Sushi Especial" (14 chars) should win over "Sushi" (5 chars)
    expect(inserted.category_id).toBe("cat-sushi-especial");
  });
});

// =============================================
// ADDITIONAL PULL COVERAGE
// =============================================

describe("syncProducts - pull edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches product by name when no vendus_id match", async () => {
    const vendusProducts = {
      products: [
        {
          id: 3001,
          reference: "r1",
          title: "Gyoza",
          gross_price: "8.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      ],
    };

    let updated = false;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      // Product has no vendus_id so will match by name
      allProducts: [
        {
          id: "local-gyoza",
          name: "Gyoza",
          price: 7,
          description: undefined,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          updated_at: "2024-01-01T00:00:00Z",
          vendus_synced_at: null,
        },
      ],
      onUpdate: () => (updated = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: false,
    });

    expect(result.recordsUpdated).toBe(1);
    expect(updated).toBe(true);
  });

  it("preview mode with vendus_id match shows update", async () => {
    const vendusProducts = {
      products: [
        {
          id: 3002,
          reference: "r1",
          title: "Tempura",
          gross_price: "12.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-tempura",
          name: "Tempura Old",
          price: 10,
          description: undefined,
          is_available: true,
          vendus_id: "3002",
          vendus_ids: { dine_in: "3002" },
          updated_at: "2024-01-05T00:00:00Z",
          vendus_synced_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: true,
    });

    expect(result.preview?.toUpdate).toHaveLength(1);
    expect(result.preview!.toUpdate[0].name).toBe("Tempura");
    expect(result.preview!.toUpdate[0].localId).toBe("local-tempura");
  });

  it("preview mode with name match shows update", async () => {
    const vendusProducts = {
      products: [
        {
          id: 3003,
          reference: "r1",
          title: "Udon",
          gross_price: "9.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-udon",
          name: "Udon",
          price: 8,
          description: undefined,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          updated_at: "2024-01-05T00:00:00Z",
          vendus_synced_at: null,
        },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: true,
    });

    expect(result.preview?.toUpdate).toHaveLength(1);
    expect(result.preview!.toUpdate[0].name).toBe("Udon");
    expect(result.preview!.toUpdate[0].localId).toBe("local-udon");
  });

  it("merges same-name Vendus products from different categories", async () => {
    const vendusProducts = {
      products: [
        {
          id: 4001,
          reference: "s1",
          title: "Sushi Mix",
          gross_price: "15.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          description: undefined,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 4002,
          reference: "s2",
          title: "Sushi Mix",
          gross_price: "18.00",
          tax_id: "1",
          status: "on",
          category_id: 20,
          description: "Variedade de sushi com 12 pecas",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [
      { id: "10", name: "Dine In" },
      { id: "20", name: "Delivery" },
    ];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-default" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-default",
    });

    // Should merge into one product with both service modes
    expect(result.recordsProcessed).toBe(1);
    expect(result.recordsCreated).toBe(1);
    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.service_modes).toContain("dine_in");
    expect(inserted.service_modes).toContain("delivery");
    // Base price should be the minimum
    expect(inserted.price).toBe(15);
    // Description should come from second product (first was null)
    expect(inserted.description).toBe("Variedade de sushi com 12 pecas");
    // Should have vendus_ids map for both modes
    expect(inserted.vendus_ids).toEqual({
      dine_in: "4001",
      delivery: "4002",
    });
  });

  it("resolves conflict with local winning when local timestamp is more recent", async () => {
    const vendusProducts = {
      products: [
        {
          id: 7001,
          reference: "r1",
          title: "Produto Local Wins",
          gross_price: "20.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-15T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z", // Vendus older
        },
      ],
    };

    const updateData: unknown = null;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-lw",
          name: "Produto Local Wins",
          price: 25,
          description: undefined,
          is_available: true,
          vendus_id: "7001",
          vendus_ids: { dine_in: "7001" },
          updated_at: "2024-01-20T10:00:00Z", // Local NEWER
          vendus_synced_at: "2024-01-10T00:00:00Z", // Last sync
        },
      ],
      onUpdate: () => {},
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: false,
    });

    expect(result.warnings).toBeDefined();
    // Conflict detected, "local" wins
    expect(result.warnings?.some((w) => w.message.includes("local"))).toBe(true);
    expect(result.warnings?.some((w) => w.details?.resolution === "local_wins")).toBe(true);
  });

  it("resolves conflict with name match and local winning", async () => {
    const vendusProducts = {
      products: [
        {
          id: 7002,
          reference: "r1",
          title: "Name Conflict",
          gross_price: "15.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-10T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z", // Vendus older
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-nc",
          name: "Name Conflict",
          price: 18,
          description: undefined,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          updated_at: "2024-01-20T10:00:00Z", // Local NEWER
          vendus_synced_at: "2024-01-05T00:00:00Z", // Last sync before both changes
        },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: false,
    });

    expect(result.warnings).toBeDefined();
    // Name match conflict detected with suffix
    expect(result.warnings?.some((w) => w.message.includes("match por nome"))).toBe(true);
    expect(result.warnings?.some((w) => w.details?.resolution === "local_wins")).toBe(true);
  });

  it("handles local product with null updated_at in conflict", async () => {
    const vendusProducts = {
      products: [
        {
          id: 7003,
          reference: "r1",
          title: "Null Updated",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-15T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-null-ua",
          name: "Null Updated Old",
          price: 8,
          description: undefined,
          is_available: true,
          vendus_id: "7003",
          vendus_ids: { dine_in: "7003" },
          updated_at: undefined,
          vendus_synced_at: null,
        },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    expect(result.recordsUpdated).toBe(1);
  });

  it("handles Vendus products returned as array directly", async () => {
    // Return products as a direct array, not { products: [...] }
    const vendusProducts = [
      {
        id: 7004,
        reference: "arr1",
        title: "Array Product",
        gross_price: "10.00",
        tax_id: "1",
        status: "on",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ] as unknown as VendusProductsResponse;

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles Vendus product with zero price and no gross_price", async () => {
    const vendusProducts = {
      products: [
        {
          id: 7005,
          reference: "z1",
          title: "Zero Price",
          gross_price: "",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.price).toBe(0);
  });

  it("handles vendus category_id not in category map", async () => {
    const vendusProducts = {
      products: [
        {
          id: 7006,
          reference: "u1",
          title: "Unknown Cat",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          category_id: 999, // Not in category map
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const vendusCategories = [{ id: "10", name: "Sala" }];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    // Should default to dine_in since category not found
    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.service_modes).toEqual(["dine_in"]);
  });

  it("handles same-name products with duplicate service mode, older timestamp, and inactive status", async () => {
    const vendusProducts = {
      products: [
        {
          id: 8001,
          reference: "d1",
          title: "Duplicate",
          gross_price: "15.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          description: "First desc",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-05T00:00:00Z",
        },
        {
          id: 8002,
          reference: "d2",
          title: "Duplicate",
          gross_price: "15.00",
          tax_id: "1",
          status: "off",
          category_id: 10,
          description: undefined,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z", // Older than first
        },
        {
          id: 8003,
          reference: "d3",
          title: "Duplicate",
          gross_price: "15.00",
          tax_id: "1",
          status: "on",
          category_id: 10,
          description: undefined,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: undefined, // No updated_at
        },
      ],
    };

    const vendusCategories = [{ id: "10", name: "Dine In" }];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    // All merge into one product
    expect(result.recordsProcessed).toBe(1);
    expect(result.recordsCreated).toBe(1);
    const inserted = inserts[0] as Record<string, unknown>;
    // isActive should be true (from the first "on" product)
    expect(inserted.is_available).toBe(true);
    // Description from first product
    expect(inserted.description).toBe("First desc");
    // Only one service mode (all same category = dine_in)
    expect(inserted.service_modes).toEqual(["dine_in"]);
  });

  it("handles vendus_ids with falsy value in map", async () => {
    const vendusProducts = {
      products: [
        {
          id: 8004,
          reference: "v1",
          title: "Falsy Vid",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-falsy",
          name: "Other",
          price: 10,
          description: undefined,
          is_available: true,
          vendus_id: null,
          vendus_ids: { dine_in: "" }, // Falsy value
          updated_at: "2024-01-01T00:00:00Z",
          vendus_synced_at: null,
        },
      ],
      onInsert: () => {},
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    // Product should be created (no valid vendus_id match for "8004")
    expect(result.recordsCreated).toBe(1);
  });

  it("handles allLocalProducts being null", async () => {
    const vendusProducts = {
      products: [
        {
          id: 8005,
          reference: "n1",
          title: "Null Products",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    // Custom mock that returns null for allLocalProducts
    const from = (table: string) => {
      return {
        select: (cols?: string) => {
          if (
            table === "products" &&
            cols &&
            cols.includes("vendus_id") &&
            cols.includes("updated_at")
          ) {
            return Promise.resolve({ data: null, error: null });
          }
          return {
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            order: () => {
              if (table === "categories") {
                return Promise.resolve({
                  data: [{ id: "cat-1", name: "Default" }],
                  error: null,
                });
              }
              return Promise.resolve({ data: [], error: null });
            },
            in: () => Promise.resolve({ data: [], error: null }),
          };
        },
        insert: (data: unknown) => {
          if (table === "products") {
            return Promise.resolve({ data: null, error: null });
          }
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: "log-1" }, error: null }),
            }),
          };
        },
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles non-Error thrown value in outer catch", async () => {
    // Use direction "push" because pullProductsFromVendus re-wraps all errors
    // as new Error(), so syncProducts outer catch always sees an Error from pull.
    // Push path doesn't have its own outer try-catch, so a non-Error throw
    // propagates directly to syncProducts outer catch.
    const from = (table: string) => {
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
      if (table === "products") {
        // Throw non-Error from the push path's first supabase call
        throw "non-error string"; // eslint-disable-line no-throw-literal
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      { get: vi.fn(), post: vi.fn(), put: vi.fn() } as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toBe("Erro desconhecido");
  });

  it("handles sync log insert returning null (logEntry is null)", async () => {
    const vendusProducts = { products: [] };

    const from = (table: string) => {
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
      return {
        select: (cols?: string) => {
          if (cols && cols.includes("updated_at")) {
            return Promise.resolve({ data: [], error: null });
          }
          return {
            order: () => Promise.resolve({ data: [], error: null }),
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        },
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    // Should succeed without error even though logEntry is null
    expect(result.success).toBe(true);
  });

  it("catches per-product exception in pull loop", async () => {
    const vendusProducts = {
      products: [
        {
          id: 6001,
          reference: "e1",
          title: "Error Product",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
        },
      ],
    };

    // Create a mock that throws during products update only
    const from = (table: string) => {
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
        select: (cols?: string) => {
          if (
            table === "products" &&
            cols &&
            cols.includes("vendus_id") &&
            cols.includes("updated_at")
          ) {
            // Return a product that matches by vendus_id
            return Promise.resolve({
              data: [
                {
                  id: "local-err",
                  name: "Error Product",
                  price: 8,
                  description: undefined,
                  is_available: true,
                  vendus_id: "6001",
                  vendus_ids: { dine_in: "6001" },
                  updated_at: "2024-01-01T00:00:00Z",
                  vendus_synced_at: null,
                },
              ],
              error: null,
            });
          }
          return {
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            order: () => {
              if (table === "categories") {
                return Promise.resolve({
                  data: [{ id: "cat-1", name: "Default" }],
                  error: null,
                });
              }
              return Promise.resolve({ data: [], error: null });
            },
            in: () => Promise.resolve({ data: [], error: null }),
          };
        },
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "log-1" }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => {
            // Throw an actual Error during products update
            throw new Error("Unexpected DB crash");
          },
        }),
      };
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    expect(result.recordsFailed).toBe(1);
    expect(result.errors[0].error).toContain("Unexpected DB crash");
  });

  it("handles vendusCategoryToServiceMode dine_in fallback", async () => {
    const vendusProducts = {
      products: [
        {
          id: 4003,
          reference: "n1",
          title: "Nigiri Especial",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          category_id: 30,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    // Category name that does NOT match delivery or takeaway
    const vendusCategories = [{ id: "30", name: "Normal" }];

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-default" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts, vendusCategories) as never,
    );

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-default",
    });

    const inserted = inserts[0] as Record<string, unknown>;
    expect(inserted.service_modes).toEqual(["dine_in"]);
  });

  it("handles pull error from Vendus API", async () => {
    const { VendusApiError: MockVendusError } = await import("../client");
    const vendusClient = {
      get: vi.fn().mockRejectedValue(
        new MockVendusError("SERVER_ERROR", "Vendus offline", undefined, 500),
      ),
      post: vi.fn(),
      put: vi.fn(),
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    // pullProductsFromVendus throws, which gets caught by syncProducts global catch
    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("handles insert error for new product in pull", async () => {
    const vendusProducts = {
      products: [
        {
          id: 5001,
          reference: "f1",
          title: "Falha Insert",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    // Custom mock that returns insert error for products
    const from = (table: string) => {
      return {
        select: (cols?: string) => {
          if (
            table === "products" &&
            cols &&
            cols.includes("vendus_id") &&
            cols.includes("updated_at")
          ) {
            return Promise.resolve({ data: [], error: null });
          }
          return {
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            order: () => {
              if (table === "categories") {
                return Promise.resolve({
                  data: [{ id: "cat-1", name: "Default" }],
                  error: null,
                });
              }
              return Promise.resolve({ data: [], error: null });
            },
            in: () => Promise.resolve({ data: [], error: null }),
          };
        },
        insert: () => {
          if (table === "products") {
            return Promise.resolve({
              data: null,
              error: { message: "unique constraint violation" },
            });
          }
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: "log-1" }, error: null }),
            }),
          };
        },
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.recordsFailed).toBe(1);
    expect(result.errors[0].error).toContain("unique constraint");
  });

  it("skips products with empty title", async () => {
    const vendusProducts = {
      products: [
        {
          id: 5002,
          reference: "e1",
          title: "",
          gross_price: "5.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 5003,
          reference: "e2",
          title: "Valid Product",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    // Only valid product should be processed
    expect(result.recordsProcessed).toBe(1);
    expect(inserts).toHaveLength(1);
  });
});

// =============================================
// ADDITIONAL PUSH COVERAGE
// =============================================

describe("syncProducts - push edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pushes specific products by productIds", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "specific-1",
          name: "Targeted",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

      productIds: ["specific-1"],
    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles fetch error in push", async () => {
    // Custom mock that returns fetchError
    const supabase = {
      from: (table: string) => {
        if (table === "products") {
          return {
            select: (cols?: string) => {
              if (cols && cols.includes("updated_at")) {
                return Promise.resolve({ data: [], error: null });
              }
              return {
                eq: () => ({
                  or: () =>
                    Promise.resolve({
                      data: null,
                      error: { message: "table not accessible" },
                    }),
                }),
              };
            },
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

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createPushVendusClientMock() as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toContain("produtos locais");
  });

  it("creates one Vendus product per service mode on push", async () => {
    const vendusClient = createPushVendusClientMock({
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve([
            { id: "vcat-dine", name: "Sala" },
            { id: "vcat-del", name: "Delivery" },
          ]);
        }
        return Promise.resolve({ products: [] });
      }),
      post: vi.fn()
        .mockResolvedValueOnce({ id: "vendus-dine-1" })
        .mockResolvedValueOnce({ id: "vendus-del-1" }),
    });

    const updates: unknown[] = [];
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "multi-mode-1",
          name: "Sushi Mix",
          description: undefined,
          price: 15,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: ["dine_in", "delivery"],
          service_prices: { dine_in: 15, delivery: 18 },
          category_id: "cat-1",
        },
      ],
      categories: [],
      onProductUpdate: (data) => updates.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    // Should create 2 Vendus products (one per mode)
    expect(result.recordsCreated).toBe(2);
    expect(vendusClient.post).toHaveBeenCalledTimes(2);

    // First call = dine_in with price 15
    expect(vendusClient.post.mock.calls[0][1]).toEqual(
      expect.objectContaining({ gross_price: "15", category_id: "vcat-dine" }),
    );
    // Second call = delivery with price 18
    expect(vendusClient.post.mock.calls[1][1]).toEqual(
      expect.objectContaining({ gross_price: "18", category_id: "vcat-del" }),
    );

    // Should save vendus_ids map
    const syncUpdate = updates.find(
      (u) => (u as Record<string, unknown>).vendus_sync_status === "synced",
    );
    expect(syncUpdate).toBeDefined();
    expect((syncUpdate as Record<string, unknown>).vendus_ids).toEqual({
      dine_in: "vendus-dine-1",
      delivery: "vendus-del-1",
    });
  });

  it("uses legacy vendus_id for update when vendus_ids is empty", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "legacy-1",
          name: "Legacy Product",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: "vendus-legacy-99",
          vendus_ids: null, // Legacy: no vendus_ids map
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    // Should UPDATE (not create) because legacy vendus_id maps to dine_in
    expect(result.recordsUpdated).toBe(1);
    expect(result.recordsCreated).toBe(0);
    expect(vendusClient.put).toHaveBeenCalledWith(
      "/products/vendus-legacy-99",
      expect.objectContaining({ title: "Legacy Product" }),
    );
  });

  it("syncs both directions", async () => {
    const vendusClient = createPushVendusClientMock({
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve([]);
        }
        return Promise.resolve({ products: [] });
      }),
    });

    const supabase = createPushSupabaseMock({
      pushProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "both",

    });

    expect(result.operation).toBe("product_sync");
    expect(result.success).toBe(true);
  });
});

// =============================================
// REMAINING BRANCH COVERAGE
// =============================================

describe("syncProducts - remaining branch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles raw.products || [] fallback when products field is missing", async () => {
    // Vendus returns non-array without products field → falls through to []
    const vendusClient = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) return Promise.resolve([]);
        // Return object without .products → triggers || []
        return Promise.resolve({ data: "something" });
      }),
      post: vi.fn(),
      put: vi.fn(),
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    // 0 products found → success with 0 processed
    expect(result.recordsProcessed).toBe(0);
  });

  it("handles rawCats as object with .categories in pull", async () => {
    // Return categories as { categories: [...] } instead of array
    const vendusClient = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve({
            categories: [{ id: "10", name: "Dine In" }],
          });
        }
        return Promise.resolve({ products: [] });
      }),
      post: vi.fn(),
      put: vi.fn(),
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.success).toBe(true);
  });

  it("handles rawCats with .data fallback in pull", async () => {
    // Return categories as { data: [...] } (neither array nor .categories)
    const vendusClient = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve({
            data: [{ id: "20", name: "Delivery" }],
          });
        }
        return Promise.resolve({ products: [] });
      }),
      post: vi.fn(),
      put: vi.fn(),
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.success).toBe(true);
  });

  it("handles rawCats empty object fallback in pull (all fields falsy)", async () => {
    // Return categories as {} → rawCats.categories || rawCats.data || [] → []
    const vendusClient = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve({});
        }
        return Promise.resolve({ products: [] });
      }),
      post: vi.fn(),
      put: vi.fn(),
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.success).toBe(true);
  });

  it("handles vendus product with falsy updated_at (0 fallback)", async () => {
    const vendusProducts = {
      products: [
        {
          id: 9001,
          reference: "no-update",
          title: "No Updated At",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          // No updated_at field → triggers : 0 fallback
        },
      ],
    };

    const inserts: unknown[] = [];
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
      onInsert: (data) => inserts.push(data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles non-VendusApiError in pull outer catch", async () => {
    // Make vendusClient.get throw a regular Error (not VendusApiError)
    // This tests the non-VendusApiError branch in pullProductsFromVendus outer catch
    const vendusClient = {
      get: vi.fn().mockRejectedValue(new Error("plain network error")),
      post: vi.fn(),
      put: vi.fn(),
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toContain("plain network error");
  });

  it("handles non-Error thrown in per-product catch (Erro desconhecido)", async () => {
    // The per-product loop tries to insert/update products in DB.
    // Making supabase.from("products").insert() throw a non-Error
    // triggers the "Erro desconhecido" branch in the per-product catch.
    const vendusProducts = {
      products: [
        {
          id: 9002,
          reference: "throw-test",
          title: "Throws Non Error",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const from = (table: string) => {
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
      if (table === "categories") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "cat-1" }, error: null }),
              }),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: (cols?: string) => {
            if (cols && cols.includes("updated_at")) {
              // allLocalProducts fetch → return empty (no matches)
              return {
                order: () =>
                  Promise.resolve({ data: [], error: null }),
              };
            }
            return {
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            };
          },
          insert: () => {
            // Throw non-Error in the per-product insert
            throw 42; // eslint-disable-line no-throw-literal
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
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      defaultCategoryId: "cat-1",
    });

    expect(result.recordsFailed).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.error.includes("Erro desconhecido"))).toBe(true);
  });

  it("pushes with pushAll=true to skip pending filter", async () => {
    const vendusClient = createPushVendusClientMock();
    const pushProducts = [
      {
        id: "pa-1",
        name: "PushAll Product",
        description: undefined,
        price: 10,
        is_available: true,
        vendus_id: null,
        vendus_ids: null,
        service_modes: null,
        service_prices: null,
        category_id: "cat-1",
      },
    ];

    // Custom mock: .eq() must be thenable (pushAll=true skips .in/.or chains)
    const from = (table: string) => {
      if (table === "products") {
        return {
          select: (cols?: string) => {
            if (cols && cols.includes("updated_at")) {
              return Promise.resolve({ data: [], error: null });
            }
            return {
              eq: () => {
                // When pushAll=true, query is awaited directly after .eq()
                const p = Promise.resolve({ data: pushProducts, error: null });
                return Object.assign(p, {
                  in: () => p,
                  or: () => p,
                });
              },
            };
          },
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      if (table === "categories") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "cat-1" }, error: null }),
              }),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
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
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

      pushAll: true,
    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles null categories from Supabase in push (|| [] fallback)", async () => {
    // categories query returns null data → triggers (categories || []).map(...)
    const from = (table: string) => {
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
      if (table === "products") {
        return {
          select: (cols?: string) => {
            if (cols && cols.includes("updated_at")) {
              return Promise.resolve({ data: [], error: null });
            }
            return {
              eq: () => ({
                or: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "nullcat-1",
                        name: "NullCat Product",
                        description: undefined,
                        price: 10,
                        is_available: true,
                        vendus_id: null,
                        vendus_ids: null,
                        service_modes: null,
                        service_prices: null,
                        category_id: "cat-1",
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          },
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      if (table === "categories") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "cat-1" }, error: null }),
              }),
            }),
            in: () =>
              Promise.resolve({ data: null, error: null }), // NULL categories
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
    };

    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createPushVendusClientMock() as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles rawCats as object with .categories in push", async () => {
    const vendusClient = createPushVendusClientMock({
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve({
            categories: [{ id: "vcat-sala", name: "Sala" }],
          });
        }
        return Promise.resolve({ products: [] });
      }),
    });

    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "catobj-1",
          name: "CatObj Product",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles rawCats with .data fallback in push", async () => {
    const vendusClient = createPushVendusClientMock({
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve({
            data: [{ id: "vcat-data", name: "Delivery" }],
          });
        }
        return Promise.resolve({ products: [] });
      }),
    });

    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "catdata-1",
          name: "CatData Product",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsCreated).toBe(1);
  });

  it("handles rawCats empty object fallback in push", async () => {
    const vendusClient = createPushVendusClientMock({
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve({});
        }
        return Promise.resolve({ products: [] });
      }),
    });

    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "catempty-1",
          name: "CatEmpty Product",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsCreated).toBe(1);
  });

  it("skips duplicate mode in serviceModeToVendusCategoryId map", async () => {
    // Two Vendus categories map to same mode → second should be skipped
    const vendusClient = createPushVendusClientMock({
      get: vi.fn().mockImplementation((url: string) => {
        if (url.startsWith("/products/categories")) {
          return Promise.resolve([
            { id: "vcat-1", name: "Sala" },      // maps to dine_in
            { id: "vcat-2", name: "Dine In" },    // also maps to dine_in (duplicate)
          ]);
        }
        return Promise.resolve({ products: [] });
      }),
    });

    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "dup-mode-1",
          name: "DupMode Product",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: ["dine_in"],
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    // Should use the first category ID for dine_in, skip the second
    expect(result.recordsCreated).toBe(1);
    const postCall = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    expect(postCall.category_id).toBe("vcat-1"); // First one wins
  });

  it("uses 'off' status when product.is_available is false", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "unavail-1",
          name: "Unavailable Product",
          description: undefined,
          price: 10,
          is_available: false, // Should produce status: "off"
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsCreated).toBe(1);
    const postCall = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    expect(postCall.status).toBe("off");
  });

  it("handles VendusApiError in push per-mode catch", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createPushVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("API_ERROR", "Vendus push failed", undefined, 400),
      ),
    });

    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "push-err-1",
          name: "Push Error Product",
          description: undefined,
          price: 10,
          is_available: true,
          vendus_id: null,
          vendus_ids: null,
          service_modes: null,
          service_prices: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",

    });

    expect(result.recordsFailed).toBe(1);
    expect(result.errors[0].error).toContain("Erro Vendus");
  });

  it("handles localProduct.updated_at ?? undefined in conflict preview", async () => {
    const vendusProducts = {
      products: [
        {
          id: 9101,
          reference: "r1",
          title: "Null UpdatedAt",
          gross_price: "10.00",
          tax_id: "1",
          status: "on",
          created_at: "2024-01-15T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [
        {
          id: "local-null-ua",
          name: "Null UpdatedAt",
          price: 10,
          description: undefined,
          is_available: true,
          vendus_id: "9101",
          vendus_ids: { dine_in: "9101" },
          updated_at: undefined, // null updated_at → triggers ?? undefined
          vendus_synced_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock(vendusProducts) as never,
    );

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "pull",
      previewOnly: true,
    });

    // Should still succeed with preview
    expect(result.preview?.toUpdate).toBeDefined();
  });
});

// =============================================
// HELPER FUNCTIONS TESTS
// =============================================

describe("getProductSyncStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sync status for a product", async () => {
    const mockData = {
      vendus_id: "v-123",
      vendus_reference: "ref-1",
      vendus_sync_status: "synced",
      vendus_synced_at: "2024-01-15T10:00:00Z",
    };

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockData, error: null }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getProductSyncStatus("prod-1");
    expect(result).toEqual(mockData);
  });

  it("returns null when product not found", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "not found" } }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getProductSyncStatus("non-existent");
    expect(result).toBeNull();
  });
});

describe("markProductForSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates product sync status to pending", async () => {
    let updatedData: unknown = null;
    const supabase = {
      from: () => ({
        update: (data: unknown) => {
          updatedData = data;
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
          };
        },
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    await markProductForSync("prod-1");
    expect(updatedData).toEqual({ vendus_sync_status: "pending" });
  });
});

describe("getProductsWithSyncStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns products with sync status ordered by name", async () => {
    const mockProducts = [
      { id: "p1", name: "Arroz", vendus_sync_status: "synced" },
      { id: "p2", name: "Sashimi", vendus_sync_status: "pending" },
    ];

    const supabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: mockProducts, error: null }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getProductsWithSyncStatus();
    expect(result).toEqual(mockProducts);
  });

  it("returns empty array on error", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: null, error: { message: "view not found" } }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getProductsWithSyncStatus();
    expect(result).toEqual([]);
  });

  it("returns empty array when data is null without error", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getProductsWithSyncStatus();
    expect(result).toEqual([]);
  });
});

describe("getProductSyncStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct stats from product statuses", async () => {
    const mockProducts = [
      { vendus_sync_status: "synced" },
      { vendus_sync_status: "synced" },
      { vendus_sync_status: "pending" },
      { vendus_sync_status: "error" },
      { vendus_sync_status: null },
    ];

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: mockProducts, error: null }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const stats = await getProductSyncStats();
    expect(stats).toEqual({
      total: 5,
      synced: 2,
      pending: 2, // "pending" + null
      error: 1,
    });
  });

  it("returns zero stats when no products", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const stats = await getProductSyncStats();
    expect(stats).toEqual({ total: 0, synced: 0, pending: 0, error: 0 });
  });

  it("counts all null statuses as pending", async () => {
    const mockProducts = [
      { vendus_sync_status: null },
      { vendus_sync_status: null },
      { vendus_sync_status: null },
    ];

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: mockProducts, error: null }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const stats = await getProductSyncStats();
    expect(stats).toEqual({
      total: 3,
      synced: 0,
      pending: 3,
      error: 0,
    });
  });
});
