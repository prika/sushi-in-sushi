/**
 * Vendus Configuration Tests
 *
 * Tests cover:
 * - getVendusConfig: returns config or null based on env + DB
 * - isVendusEnabled: checks VENDUS_API_KEY env var
 * - getConfiguredLocations: returns slugs from DB
 * - validateVendusConfig: returns errors/warnings
 * - Constants: tax rates, document types, defaults
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/server";

// We need to import AFTER mocking dependencies
import {
  getVendusConfig,
  isVendusEnabled,
  getConfiguredLocations,
  validateVendusConfig,
  VENDUS_TAX_RATES,
  TAX_PERCENTAGES,
  VENDUS_DOCUMENT_TYPES,
  VENDUS_API_BASE_URL,
  VENDUS_DEFAULTS,
} from "../config";

// =============================================
// ENV HELPERS
// =============================================

let savedApiKey: string | undefined;
let savedCronSecret: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  savedApiKey = process.env.VENDUS_API_KEY;
  savedCronSecret = process.env.CRON_SECRET;
});

afterEach(() => {
  if (savedApiKey !== undefined) {
    process.env.VENDUS_API_KEY = savedApiKey;
  } else {
    delete process.env.VENDUS_API_KEY;
  }
  if (savedCronSecret !== undefined) {
    process.env.CRON_SECRET = savedCronSecret;
  } else {
    delete process.env.CRON_SECRET;
  }
});

// =============================================
// SUPABASE MOCK
// =============================================

function createLocationsMock(locationData: Record<string, unknown> | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: locationData }),
          not: () => ({
            not: () => ({
              order: () =>
                Promise.resolve({
                  data: locationData ? [locationData] : [],
                }),
            }),
          }),
        }),
      }),
    }),
  };
}

// =============================================
// TESTS
// =============================================

describe("getVendusConfig", () => {
  it("returns null when VENDUS_API_KEY is missing", async () => {
    delete process.env.VENDUS_API_KEY;

    const result = await getVendusConfig("circunvalacao");

    expect(result).toBeNull();
    // Should not even call Supabase
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns null when location not found in DB", async () => {
    process.env.VENDUS_API_KEY = "test-key";
    vi.mocked(createAdminClient).mockReturnValue(
      createLocationsMock(null) as never,
    );

    const result = await getVendusConfig("unknown-location");

    expect(result).toBeNull();
  });

  it("returns null when vendus_enabled is false", async () => {
    process.env.VENDUS_API_KEY = "test-key";
    vi.mocked(createAdminClient).mockReturnValue(
      createLocationsMock({
        vendus_store_id: "store-1",
        vendus_register_id: "reg-1",
        vendus_enabled: false,
      }) as never,
    );

    const result = await getVendusConfig("circunvalacao");

    expect(result).toBeNull();
  });

  it("returns null when vendus_store_id is null", async () => {
    process.env.VENDUS_API_KEY = "test-key";
    vi.mocked(createAdminClient).mockReturnValue(
      createLocationsMock({
        vendus_store_id: null,
        vendus_register_id: "reg-1",
        vendus_enabled: true,
      }) as never,
    );

    const result = await getVendusConfig("circunvalacao");

    expect(result).toBeNull();
  });

  it("returns null when vendus_register_id is null", async () => {
    process.env.VENDUS_API_KEY = "test-key";
    vi.mocked(createAdminClient).mockReturnValue(
      createLocationsMock({
        vendus_store_id: "store-1",
        vendus_register_id: null,
        vendus_enabled: true,
      }) as never,
    );

    const result = await getVendusConfig("circunvalacao");

    expect(result).toBeNull();
  });

  it("returns full config when all data present", async () => {
    process.env.VENDUS_API_KEY = "my-api-key";
    vi.mocked(createAdminClient).mockReturnValue(
      createLocationsMock({
        vendus_store_id: "store-42",
        vendus_register_id: "reg-7",
        vendus_enabled: true,
      }) as never,
    );

    const result = await getVendusConfig("circunvalacao");

    expect(result).toEqual({
      apiKey: "my-api-key",
      storeId: "store-42",
      registerId: "reg-7",
      baseUrl: VENDUS_API_BASE_URL,
      timeout: VENDUS_DEFAULTS.timeout,
      retryAttempts: VENDUS_DEFAULTS.retryAttempts,
    });
  });
});

describe("isVendusEnabled", () => {
  it("returns true when VENDUS_API_KEY is set", () => {
    process.env.VENDUS_API_KEY = "test-key";
    expect(isVendusEnabled()).toBe(true);
  });

  it("returns false when VENDUS_API_KEY is missing", () => {
    delete process.env.VENDUS_API_KEY;
    expect(isVendusEnabled()).toBe(false);
  });

  it("returns false when VENDUS_API_KEY is empty string", () => {
    process.env.VENDUS_API_KEY = "";
    expect(isVendusEnabled()).toBe(false);
  });
});

describe("getConfiguredLocations", () => {
  it("returns empty array when API key missing", async () => {
    delete process.env.VENDUS_API_KEY;

    const result = await getConfiguredLocations();

    expect(result).toEqual([]);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns slugs from locations with vendus enabled", async () => {
    process.env.VENDUS_API_KEY = "test-key";

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              not: () => ({
                order: () =>
                  Promise.resolve({
                    data: [{ slug: "circunvalacao" }, { slug: "boavista" }],
                  }),
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getConfiguredLocations();

    expect(result).toEqual(["circunvalacao", "boavista"]);
  });

  it("returns empty array when no locations configured", async () => {
    process.env.VENDUS_API_KEY = "test-key";

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              not: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getConfiguredLocations();

    expect(result).toEqual([]);
  });

  it("returns empty array when DB returns null", async () => {
    process.env.VENDUS_API_KEY = "test-key";

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              not: () => ({
                order: () => Promise.resolve({ data: null }),
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never);

    const result = await getConfiguredLocations();

    expect(result).toEqual([]);
  });
});

describe("validateVendusConfig", () => {
  it("returns valid:true when API key and CRON_SECRET set", () => {
    process.env.VENDUS_API_KEY = "test-key";
    process.env.CRON_SECRET = "cron-secret";

    const result = validateVendusConfig();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns error when API key missing", () => {
    delete process.env.VENDUS_API_KEY;
    process.env.CRON_SECRET = "cron-secret";

    const result = validateVendusConfig();

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("VENDUS_API_KEY");
  });

  it("returns warning when CRON_SECRET missing", () => {
    process.env.VENDUS_API_KEY = "test-key";
    delete process.env.CRON_SECRET;

    const result = validateVendusConfig();

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("CRON_SECRET");
  });

  it("returns both error and warning when both missing", () => {
    delete process.env.VENDUS_API_KEY;
    delete process.env.CRON_SECRET;

    const result = validateVendusConfig();

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.warnings.length).toBe(1);
  });
});

describe("constants", () => {
  it("VENDUS_TAX_RATES has correct values", () => {
    expect(VENDUS_TAX_RATES.NORMAL).toBe("1");
    expect(VENDUS_TAX_RATES.INTERMEDIATE).toBe("2");
    expect(VENDUS_TAX_RATES.REDUCED).toBe("3");
    expect(VENDUS_TAX_RATES.EXEMPT).toBe("4");
  });

  it("TAX_PERCENTAGES has correct rates", () => {
    expect(TAX_PERCENTAGES["1"]).toBe(0.23);
    expect(TAX_PERCENTAGES["2"]).toBe(0.13);
    expect(TAX_PERCENTAGES["3"]).toBe(0.06);
    expect(TAX_PERCENTAGES["4"]).toBe(0);
  });

  it("VENDUS_DOCUMENT_TYPES has correct codes", () => {
    expect(VENDUS_DOCUMENT_TYPES.FATURA_RECIBO).toBe("FR");
    expect(VENDUS_DOCUMENT_TYPES.FATURA).toBe("FT");
    expect(VENDUS_DOCUMENT_TYPES.FATURA_SIMPLIFICADA).toBe("FS");
  });

  it("VENDUS_API_BASE_URL is correct", () => {
    expect(VENDUS_API_BASE_URL).toBe("https://www.vendus.pt/ws/v1.1");
  });
});
