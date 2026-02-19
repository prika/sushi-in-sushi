/**
 * Vendus Product Sync Tests
 *
 * Tests cover:
 * - Pull: create new products from Vendus
 * - Pull: update existing (by vendus_id, by name)
 * - Pull: conflict resolution (timestamp)
 * - Pull: preview mode (no DB writes)
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
 * Creates a chainable Supabase mock for sync tests
 */
function createSupabaseMock(config: {
  syncLogInsert?: { id: string };
  firstCategory?: { id: string } | null;
  productByVendusId?: Record<string, Record<string, unknown> | null>;
  productByName?: Record<string, Record<string, unknown> | null>;
  onUpdate?: () => void;
  onInsert?: () => void;
}) {
  const from = (table: string) => {
    return {
      select: (cols?: string) => ({
        eq: (col: string, val: unknown) => {
          if (table === "products" && col === "vendus_id") {
            const data = config.productByVendusId?.[String(val)] ?? null;
            return { single: () => Promise.resolve({ data, error: null }) };
          }
          return { single: () => Promise.resolve({ data: null, error: null }) };
        },
        ilike: (col: string, val: string) => ({
          is: () => {
            if (table === "products" && col === "name") {
              const data =
                config.productByName?.[val] ??
                config.productByName?.["*"] ??
                null;
              return {
                maybeSingle: () => Promise.resolve({ data, error: null }),
              };
            }
            return {
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            };
          },
        }),
        order: () => ({
          limit: (n: number) => ({
            single: () =>
              Promise.resolve({
                data:
                  config.firstCategory !== undefined
                    ? config.firstCategory
                    : { id: "cat-default" },
                error: null,
              }),
          }),
        }),
        in: () => Promise.resolve({ data: [], error: null }),
      }),
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
      productByVendusId: { "vendus-1": null },
      productByName: { "Novo Produto": null },
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
      productByVendusId: { "vendus-new": null },
      productByName: { "Produto Novo": null },
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
      productByVendusId: { v1: null },
      productByName: { Novo: null },
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
      productByVendusId: {
        "vendus-existing": {
          id: "local-1",
          updated_at: "2024-01-10T00:00:00Z",
          vendus_synced_at: "2024-01-05T00:00:00Z",
        },
      },
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
      productByVendusId: {
        "v-conflict": {
          id: "local-1",
          updated_at: "2024-01-20T10:00:00Z", // Local changed
          vendus_synced_at: "2024-01-15T00:00:00Z", // Last sync
        },
      },
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
