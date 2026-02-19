/**
 * Vendus Category Sync Tests
 *
 * Tests cover:
 * - Create new categories in Vendus
 * - Update local mapping when category exists in Vendus (match by name)
 * - Error when Vendus not configured
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncCategoriesToVendus } from "../categories";

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
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { getVendusClient } from "../client";

function createSupabaseMock(config: {
  localCategories?: Array<{
    id: string;
    name: string;
    vendus_id?: string | null;
  }>;
  onUpdate?: () => void;
}) {
  const categoriesData = config.localCategories ?? [
    { id: "cat-1", name: "Entradas", vendus_id: null },
    { id: "cat-2", name: "Pratos", vendus_id: null },
  ];
  const onUpdate = config.onUpdate;

  const from = (table: string) => {
    if (table === "categories") {
      return {
        select: () => ({
          order: () =>
            Promise.resolve({
              data: categoriesData,
              error: null,
            }),
        }),
        update: () => ({
          eq: () => {
            onUpdate?.();
            return Promise.resolve({ data: null, error: null });
          },
        }),
      };
    }
    return {};
  };
  return { from };
}

describe("syncCategoriesToVendus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Vendus is not configured", async () => {
    const { getVendusConfig } = await import("../config");
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    await expect(syncCategoriesToVendus("test")).rejects.toThrow(
      "Vendus nao configurado",
    );
  });

  it("creates new categories in Vendus", async () => {
    let postCalls: unknown[] = [];
    const vendusClient = {
      get: vi.fn().mockResolvedValue({ categories: [], data: [] }),
      post: vi.fn().mockImplementation((url: string, data: unknown) => {
        postCalls.push({ url, data });
        return Promise.resolve({ id: `vendus-${postCalls.length}` });
      }),
    };

    const supabase = createSupabaseMock({
      localCategories: [
        { id: "c1", name: "Bebidas", vendus_id: null },
        { id: "c2", name: "Sobremesas", vendus_id: null },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncCategoriesToVendus("circunvalacao");

    expect(result.recordsCreated).toBe(2);
    expect(result.recordsProcessed).toBe(2);
    expect(result.success).toBe(true);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/products/categories",
      expect.objectContaining({ name: "Bebidas" }),
    );
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/products/categories",
      expect.objectContaining({ name: "Sobremesas" }),
    );
  });

  it("matches existing Vendus categories by name and updates mapping", async () => {
    const vendusClient = {
      get: vi.fn().mockResolvedValue({
        categories: [
          { id: "v-existing", name: "Entradas" },
          { id: "v-2", name: "Pratos" },
        ],
      }),
      post: vi.fn(),
    };

    let updateCalled = 0;
    const supabase = createSupabaseMock({
      localCategories: [
        { id: "c1", name: "Entradas", vendus_id: null },
        { id: "c2", name: "Pratos", vendus_id: "v-2" },
      ],
      onUpdate: () => updateCalled++,
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncCategoriesToVendus("circunvalacao");

    expect(result.recordsUpdated).toBe(1); // Only Entradas needed mapping (Pratos already had vendus_id)
    expect(vendusClient.post).not.toHaveBeenCalled();
    expect(updateCalled).toBeGreaterThanOrEqual(1);
  });

  it("returns early when no local categories", async () => {
    const vendusClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    const supabase = createSupabaseMock({
      localCategories: [],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await syncCategoriesToVendus("circunvalacao");

    expect(result.recordsProcessed).toBe(0);
    expect(vendusClient.get).not.toHaveBeenCalled();
    expect(vendusClient.post).not.toHaveBeenCalled();
  });
});
