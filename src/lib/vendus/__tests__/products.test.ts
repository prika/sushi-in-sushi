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
import { syncProducts } from "../products";
import type { VendusProductsResponse } from "../types";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
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

vi.mock("../categories", () => ({
  syncCategoriesToVendus: vi.fn().mockResolvedValue({
    success: true,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
  }),
}));

import { createClient } from "@/lib/supabase/server";
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
  allProducts?: Array<Record<string, unknown>>;
  onUpdate?: () => void;
  onInsert?: () => void;
}) {
  const from = (table: string) => {
    return {
      select: (cols?: string) => {
        // Pre-fetch all products query:
        // supabase.from("products").select("id, ..., vendus_id")
        // Returns a thenable directly (no further chaining)
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
              return {
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data:
                        config.firstCategory !== undefined
                          ? config.firstCategory
                          : { id: "cat-default" },
                      error: null,
                    }),
                }),
              };
            }
            return Promise.resolve({ data: [], error: null });
          },
          in: () => Promise.resolve({ data: [], error: null }),
        };
      },
      insert: (data: unknown) => {
        if (table === "products") {
          config.onInsert?.();
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

function createVendusClientMock(products: VendusProductsResponse) {
  return {
    get: vi.fn().mockResolvedValue(products),
    post: vi.fn(),
    put: vi.fn(),
  };
}

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
          id: "vendus-1",
          reference: "ref-1",
          name: "Novo Produto",
          price: 12.5,
          tax_id: "1",
          is_active: true,
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
        },
      ],
    };

    let insertCalled = false;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [], // No local products
      onInsert: () => (insertCalled = true),
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
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
          id: "vendus-new",
          reference: "r",
          name: "Produto Novo",
          price: 5,
          tax_id: "1",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    let insertCalled = false;
    const supabase = createSupabaseMock({
      firstCategory: { id: "cat-1" },
      allProducts: [], // No local products
      onInsert: () => (insertCalled = true),
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
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
          id: "v1",
          reference: "r",
          name: "Novo",
          price: 1,
          tax_id: "1",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    };

    const supabase = createSupabaseMock({
      firstCategory: null,
      allProducts: [], // No local products
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
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
          id: "vendus-existing",
          reference: "ref",
          name: "Produto Atualizado",
          price: 15,
          tax_id: "1",
          is_active: true,
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
          description: null,
          is_available: true,
          vendus_id: "vendus-existing",
          updated_at: "2024-01-10T00:00:00Z",
          vendus_synced_at: "2024-01-05T00:00:00Z",
        },
      ],
      onUpdate: () => (updated = true),
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
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
          id: "v-conflict",
          reference: "r",
          name: "Produto Conflito",
          price: 20,
          tax_id: "1",
          is_active: true,
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
          description: null,
          is_available: true,
          vendus_id: "v-conflict",
          updated_at: "2024-01-20T10:00:00Z", // Local changed
          vendus_synced_at: "2024-01-15T00:00:00Z", // Last sync
        },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
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
import { syncCategoriesToVendus } from "../categories";

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
    get: vi.fn().mockResolvedValue({ products: [] }),
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

  it("syncs categories first by default", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({ pushProducts: [] });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
    });

    expect(syncCategoriesToVendus).toHaveBeenCalled();
  });

  it("skips category sync when syncCategoriesFirst=false", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({ pushProducts: [] });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
    });

    expect(syncCategoriesToVendus).not.toHaveBeenCalled();
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
          category_id: "cat-1",
        },
      ],
      categories: [{ id: "cat-1", vendus_id: "vcat-1" }],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
    });

    expect(result.recordsCreated).toBe(1);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/products",
      expect.objectContaining({
        name: "Sashimi Mix",
        price: 18.5,
        category_id: "vcat-1",
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
          description: null,
          price: 4.5,
          is_available: true,
          vendus_id: "vendus-existing-2",
          category_id: "cat-1",
        },
      ],
      categories: [{ id: "cat-1", vendus_id: null }],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
    });

    expect(result.recordsUpdated).toBe(1);
    expect(vendusClient.put).toHaveBeenCalledWith(
      "/products/vendus-existing-2",
      expect.objectContaining({ name: "Miso Soup", price: 4.5 }),
    );
    // Category has no vendus_id, so category_id should NOT be in request
    const putArgs = vendusClient.put.mock.calls[0][1] as Record<string, unknown>;
    expect(putArgs.category_id).toBeUndefined();
  });

  it("saves vendus_id and sync metadata locally after push", async () => {
    const updates: unknown[] = [];
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "local-3",
          name: "Gyoza",
          description: null,
          price: 7,
          is_available: true,
          vendus_id: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
      onProductUpdate: (data) => updates.push(data),
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
    });

    // Should save vendus_id and sync status
    const syncUpdate = updates.find(
      (u) => (u as Record<string, unknown>).vendus_sync_status === "synced",
    );
    expect(syncUpdate).toBeDefined();
    expect((syncUpdate as Record<string, unknown>).vendus_id).toBe(
      "vendus-new-1",
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
          description: null,
          price: 12,
          is_available: true,
          vendus_id: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
      onProductUpdate: (data) => updates.push(data),
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
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

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
    });

    expect(result.recordsProcessed).toBe(0);
    expect(vendusClient.post).not.toHaveBeenCalled();
    expect(vendusClient.put).not.toHaveBeenCalled();
  });

  it("uses reference from product.id substring(0,20)", async () => {
    const vendusClient = createPushVendusClientMock();
    const supabase = createPushSupabaseMock({
      pushProducts: [
        {
          id: "abcdefghij1234567890-extra-long-id",
          name: "Test",
          description: null,
          price: 5,
          is_available: true,
          vendus_id: null,
          category_id: "cat-1",
        },
      ],
      categories: [],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await syncProducts({
      locationSlug: "circunvalacao",
      direction: "push",
      syncCategoriesFirst: false,
    });

    const postArgs = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    expect(postArgs.reference).toBe("abcdefghij1234567890");
    expect((postArgs.reference as string).length).toBeLessThanOrEqual(20);
  });
});
