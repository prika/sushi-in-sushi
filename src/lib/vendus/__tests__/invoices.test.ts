/**
 * Vendus Invoice Tests
 *
 * Tests cover:
 * - createInvoice: session→items→Vendus→save→log
 * - voidInvoice: fetch→Vendus void→update→log
 * - getInvoicePdf: cached URL or fetch from Vendus
 * - getInvoices / getInvoiceBySession: query with filters
 * - processRetryQueue: retry, backoff, failure after max attempts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInvoice,
  voidInvoice,
  getInvoicePdf,
  getInvoices,
  getInvoiceBySession,
  processRetryQueue,
} from "../invoices";

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
    isRetryable() {
      if (this.statusCode === 429) return true;
      if (this.statusCode && this.statusCode >= 500) return true;
      return false;
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
  VENDUS_TAX_RATES: { NORMAL: "1", INTERMEDIATE: "2", REDUCED: "3", EXEMPT: "4" },
  TAX_PERCENTAGES: { "1": 0.23, "2": 0.13, "3": 0.06, "4": 0 },
}));

import { createAdminClient } from "@/lib/supabase/server";
import { getVendusClient, VendusApiError } from "../client";
import { getVendusConfig } from "../config";

// Suppress console output in tests
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// =============================================
// HELPERS
// =============================================

function createVendusClientMock(overrides?: Record<string, unknown>) {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({
      id: "vendus-inv-1",
      document_number: "FS 2024/1",
      document_type: "FS",
      series: "2024",
      hash: "abc123hash",
      total: 12.3,
      subtotal: 10,
      tax_amount: 2.3,
      status: "issued",
      pdf_url: "https://vendus.pt/pdf/1",
      created_at: "2024-01-15T10:00:00Z",
    }),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a Supabase mock for invoice tests.
 * Routes by table name to return appropriate data.
 */
function createInvoiceSupabaseMock(config: {
  session?: Record<string, unknown> | null;
  sessionError?: boolean;
  paymentMethod?: { vendus_id: string | null; slug: string } | null;
  location?: { id: string } | null;
  insertedInvoice?: { id: string } | null;
  insertInvoiceError?: boolean;
  onSyncLogInsert?: () => void;
  onRetryQueueInsert?: () => void;
  existingRetry?: boolean;
  // For void
  invoice?: Record<string, unknown> | null;
  onInvoiceUpdate?: (data: unknown) => void;
  // For PDF
  onInvoicePdfUpdate?: (data: unknown) => void;
  // For getInvoices
  invoicesList?: unknown[];
  invoicesError?: boolean;
  // For retry queue
  retryItems?: Array<Record<string, unknown>>;
  onRetryUpdate?: (data: unknown) => void;
}) {
  const from = (table: string) => {
    if (table === "sessions") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: config.sessionError ? null : (config.session ?? null),
                error: config.sessionError ? { message: "not found" } : null,
              }),
          }),
        }),
      };
    }

    if (table === "payment_methods") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: config.paymentMethod ?? null,
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === "locations") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: config.location ?? { id: "loc-1" },
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === "invoices") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: config.insertInvoiceError
                  ? null
                  : (config.insertedInvoice ?? { id: "inv-1" }),
                error: config.insertInvoiceError
                  ? { message: "insert failed" }
                  : null,
              }),
          }),
        }),
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: config.invoice ?? null,
                error: null,
              }),
          }),
        }),
        update: (data: unknown) => ({
          eq: () => {
            config.onInvoiceUpdate?.(data);
            config.onInvoicePdfUpdate?.(data);
            return Promise.resolve({ data: null, error: null });
          },
        }),
      };
    }

    if (table === "invoices_with_details") {
      let query = {
        eq: (col: string, val: unknown) => query,
        order: (col: string, opts?: unknown) => query,
        range: (from: number, to: number) => query,
        then: undefined as unknown,
      };
      // Make it thenable to resolve with data
      const result = Promise.resolve({
        data: config.invoicesError ? null : (config.invoicesList ?? []),
        error: config.invoicesError ? { message: "error" } : null,
      });
      query = {
        eq: () => query,
        order: () => query,
        range: () => result as never,
        then: result.then.bind(result),
      };
      return {
        select: () => query,
      };
    }

    if (table === "vendus_sync_log") {
      return {
        insert: (data: unknown) => {
          config.onSyncLogInsert?.();
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
    }

    if (table === "vendus_retry_queue") {
      return {
        select: () => ({
          eq: (col: string, val: unknown) => ({
            eq: (col2: string, val2: unknown) => ({
              in: () => ({
                limit: () =>
                  Promise.resolve({
                    data: config.existingRetry ? [{ id: "existing" }] : [],
                    error: null,
                  }),
              }),
            }),
            lt: (col2: string, val2: unknown) => ({
              lt: (col3: string, val3: unknown) => ({
                limit: () =>
                  Promise.resolve({
                    data: config.retryItems ?? [],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
        insert: (data: unknown) => {
          config.onRetryQueueInsert?.();
          return Promise.resolve({ data: null, error: null });
        },
        update: (data: unknown) => ({
          eq: () => {
            config.onRetryUpdate?.(data);
            return Promise.resolve({ data: null, error: null });
          },
        }),
      };
    }

    // Default fallback
    return {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
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

  return { from };
}

// =============================================
// TESTS: createInvoice
// =============================================

describe("createInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when Vendus not configured", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 15,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("nao configurado");
  });

  it("returns error when session not found", async () => {
    const supabase = createInvoiceSupabaseMock({
      session: null,
      sessionError: true,
    });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(
      createVendusClientMock() as never,
    );

    const result = await createInvoice({
      sessionId: "sess-missing",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 10,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Sessao nao encontrada");
  });

  it("creates invoice with document type FS when no NIF", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 2,
            unit_price: 5,
            notes: null,
            products: { id: "p1", name: "Sashimi", price: 5, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-cash", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/documents",
      expect.objectContaining({
        document_type: "FS",
      }),
    );
    // No customer object when no NIF
    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    expect(callArg.customer).toBeUndefined();
  });

  it("creates invoice with document type FR when NIF provided", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Ramen", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-card", slug: "card" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 2,
      paidAmount: 12.3,
      customerNif: "123456789",
      customerName: "Joao Silva",
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/documents",
      expect.objectContaining({
        document_type: "FR",
        customer: { nif: "123456789", name: "Joao Silva" },
      }),
    );
  });

  it("builds items with correct tax calculation", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 2,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Sushi", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
          {
            quantity: 1,
            unit_price: 5,
            notes: "extra wasabi",
            products: { id: "p2", name: "Cha", price: 5, vendus_id: "vp2", vendus_tax_id: "3" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 30,
      issuedBy: "user-1",
    });

    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    const items = callArg.items as Array<Record<string, unknown>>;

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(
      expect.objectContaining({
        product_id: "vp1",
        quantity: 2,
        unit_price: 10,
        tax_id: "1",
      }),
    );
    expect(items[1]).toEqual(
      expect.objectContaining({
        product_id: "vp2",
        quantity: 1,
        unit_price: 5,
        tax_id: "3",
        notes: "extra wasabi",
      }),
    );
  });

  it("returns invoiceId, vendusId, documentNumber, pdfUrl on success", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Gyoza", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
      insertedInvoice: { id: "inv-local-1" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
    expect(result.invoiceId).toBe("inv-local-1");
    expect(result.vendusId).toBe("vendus-inv-1");
    expect(result.documentNumber).toBe("FS 2024/1");
    expect(result.pdfUrl).toBe("https://vendus.pt/pdf/1");
  });

  it("uses default payment method '1' when no vendus_id", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Miso", price: 10, vendus_id: null, vendus_tax_id: null },
          },
        ],
      },
      paymentMethod: { vendus_id: null, slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    const payments = callArg.payments as Array<Record<string, unknown>>;
    expect(payments[0].method_id).toBe("1");
  });

  it("logs sync on success", async () => {
    let syncLogged = false;
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Edamame", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
      onSyncLogInsert: () => (syncLogged = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(syncLogged).toBe(true);
  });

  it("adds to retry queue on retryable error", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "Internal error", undefined, 500),
      ),
    });

    let retryInserted = false;
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Sake", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
      onRetryQueueInsert: () => (retryInserted = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    expect(retryInserted).toBe(true);
  });

  it("does not duplicate retry queue entry when one already exists", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "Internal error", undefined, 500),
      ),
    });

    let retryInserted = false;
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Sake", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
      existingRetry: true, // Already exists in queue
      onRetryQueueInsert: () => (retryInserted = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    // Should NOT insert new retry because one already exists
    expect(retryInserted).toBe(false);
  });

  it("does not add to retry queue on non-retryable error", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("VALIDATION_ERROR", "Bad data", undefined, 400),
      ),
    });

    let retryInserted = false;
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Tofu", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
      onRetryQueueInsert: () => (retryInserted = true),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    expect(retryInserted).toBe(false);
  });

  it("handles insert error when saving invoice locally", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Tempura", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
      insertInvoiceError: true,
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    // Should still succeed (invoice was created in Vendus, just failed to save locally)
    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
    expect(result.vendusId).toBe("vendus-inv-1");
  });

  it("handles session with empty orders", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 0,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
  });

  it("creates invoice with plain Error (not VendusApiError) in catch", async () => {
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(new Error("plain error in documents")),
    });

    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Test", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("plain error in documents");
  });

  it("uses 'Produto' fallback when product name is null", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: null,
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    const callArg = vendusClient.post.mock.calls[0][1] as Record<string, unknown>;
    const items = callArg.items as Array<Record<string, unknown>>;
    expect(items[0].description).toBe("Produto");
  });

  it("uses 0 tax rate fallback when tax_id is unknown", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "X", price: 10, vendus_id: "vp1", vendus_tax_id: "999" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 10,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
  });

  it("handles session with null orders (fallback to [])", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: null,
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 0,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(true);
  });

  it("returns user message from VendusApiError", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "servidor indisponivel", undefined, 500),
      ),
    });

    const supabase = createInvoiceSupabaseMock({
      session: {
        id: "sess-1",
        orders: [
          {
            quantity: 1,
            unit_price: 10,
            notes: null,
            products: { id: "p1", name: "Udon", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
          },
        ],
      },
      paymentMethod: { vendus_id: "pm-1", slug: "cash" },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-1",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.3,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Erro Vendus");
  });
});

// =============================================
// TESTS: voidInvoice
// =============================================

describe("voidInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when invoice not found", async () => {
    const supabase = createInvoiceSupabaseMock({ invoice: null });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await voidInvoice("inv-missing", "motivo", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("nao encontrada");
  });

  it("returns error when invoice has no vendus_id", async () => {
    const supabase = createInvoiceSupabaseMock({
      invoice: { id: "inv-1", vendus_id: null, locations: { slug: "circ" } },
    });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await voidInvoice("inv-1", "teste", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("nao encontrada");
  });

  it("returns error when location slug missing", async () => {
    const supabase = createInvoiceSupabaseMock({
      invoice: { id: "inv-1", vendus_id: "v-1", locations: null },
    });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await voidInvoice("inv-1", "teste", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Localizacao");
  });

  it("returns error when Vendus not configured", async () => {
    const supabase = createInvoiceSupabaseMock({
      invoice: {
        id: "inv-1",
        vendus_id: "v-1",
        locations: { slug: "circunvalacao" },
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    const result = await voidInvoice("inv-1", "teste", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("nao configurado");
  });

  it("calls Vendus void endpoint and updates local status", async () => {
    const vendusClient = createVendusClientMock();
    let updatedData: unknown = null;
    const supabase = createInvoiceSupabaseMock({
      invoice: {
        id: "inv-1",
        vendus_id: "v-123",
        vendus_document_number: "FS 2024/5",
        locations: { slug: "circunvalacao" },
      },
      onInvoiceUpdate: (data) => (updatedData = data),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await voidInvoice("inv-1", "cliente desistiu", "user-1");

    expect(result.success).toBe(true);
    expect(vendusClient.post).toHaveBeenCalledWith(
      "/documents/v-123/void",
      { reason: "cliente desistiu" },
    );
    expect(updatedData).toEqual(
      expect.objectContaining({
        status: "voided",
        void_reason: "cliente desistiu",
      }),
    );
  });

  it("returns error on Vendus API failure", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "falhou", undefined, 500),
      ),
    });

    const supabase = createInvoiceSupabaseMock({
      invoice: {
        id: "inv-1",
        vendus_id: "v-123",
        locations: { slug: "circunvalacao" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await voidInvoice("inv-1", "teste", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns plain Error message in voidInvoice catch", async () => {
    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(new Error("plain void error")),
    });

    const supabase = createInvoiceSupabaseMock({
      invoice: {
        id: "inv-1",
        vendus_id: "v-123",
        locations: { slug: "circunvalacao" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await voidInvoice("inv-1", "teste", "user-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("plain void error");
  });
});

// =============================================
// TESTS: getInvoicePdf
// =============================================

describe("getInvoicePdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when invoice not found", async () => {
    const supabase = createInvoiceSupabaseMock({ invoice: null });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getInvoicePdf("inv-missing");

    expect(result.success).toBe(false);
    expect(result.error).toContain("nao encontrada");
  });

  it("returns cached pdf_url when available", async () => {
    const vendusClient = createVendusClientMock();
    const supabase = createInvoiceSupabaseMock({
      invoice: {
        pdf_url: "https://cached.pdf",
        vendus_id: "v-1",
        locations: { slug: "circ" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getInvoicePdf("inv-1");

    expect(result.success).toBe(true);
    expect(result.pdfUrl).toBe("https://cached.pdf");
    // Should NOT call Vendus API
    expect(vendusClient.get).not.toHaveBeenCalled();
  });

  it("fetches PDF from Vendus when not cached", async () => {
    const vendusClient = createVendusClientMock({
      get: vi.fn().mockResolvedValue({ pdf_url: "https://fresh.pdf" }),
    });

    const supabase = createInvoiceSupabaseMock({
      invoice: {
        pdf_url: null,
        vendus_id: "v-42",
        locations: { slug: "circunvalacao" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getInvoicePdf("inv-1");

    expect(result.success).toBe(true);
    expect(result.pdfUrl).toBe("https://fresh.pdf");
    expect(vendusClient.get).toHaveBeenCalledWith("/documents/v-42/pdf");
  });

  it("returns error when no location or vendus_id", async () => {
    const supabase = createInvoiceSupabaseMock({
      invoice: { pdf_url: null, vendus_id: null, locations: null },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getInvoicePdf("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("PDF");
  });

  it("returns error when Vendus config not found", async () => {
    vi.mocked(getVendusConfig).mockResolvedValueOnce(null);

    const supabase = createInvoiceSupabaseMock({
      invoice: {
        pdf_url: null,
        vendus_id: "v-42",
        locations: { slug: "circunvalacao" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getInvoicePdf("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("PDF");
  });

  it("returns error when Vendus API fails for PDF", async () => {
    const { VendusApiError: MockError } = await import("../client");
    const vendusClient = createVendusClientMock({
      get: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "server down", undefined, 500),
      ),
    });

    const supabase = createInvoiceSupabaseMock({
      invoice: {
        pdf_url: null,
        vendus_id: "v-42",
        locations: { slug: "circunvalacao" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getInvoicePdf("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Erro Vendus");
  });

  it("returns generic error when non-VendusApiError thrown for PDF", async () => {
    const vendusClient = createVendusClientMock({
      get: vi.fn().mockRejectedValue(new Error("unexpected")),
    });

    const supabase = createInvoiceSupabaseMock({
      invoice: {
        pdf_url: null,
        vendus_id: "v-42",
        locations: { slug: "circunvalacao" },
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await getInvoicePdf("inv-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Erro ao obter PDF");
  });
});

// =============================================
// TESTS: getInvoices / getInvoiceBySession
// =============================================

describe("getInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invoices list", async () => {
    const mockInvoices = [
      { id: "inv-1", total: 25 },
      { id: "inv-2", total: 30 },
    ];
    const supabase = createInvoiceSupabaseMock({
      invoicesList: mockInvoices,
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getInvoices();

    expect(result).toEqual(mockInvoices);
  });

  it("returns empty array on error", async () => {
    const supabase = createInvoiceSupabaseMock({
      invoicesError: true,
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getInvoices();

    expect(result).toEqual([]);
  });

  it("returns empty array when data is null without error", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "invoices_with_details") {
          const query = {
            eq: () => query,
            order: () => query,
            range: () => Promise.resolve({ data: null, error: null }),
          };
          return { select: () => query };
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

    const result = await getInvoices();

    expect(result).toEqual([]);
  });

  it("applies locationSlug and status filters", async () => {
    const mockInvoices = [{ id: "inv-1" }];
    const appliedFilters: Array<{ col: string; val: unknown }> = [];

    const supabase = {
      from: (table: string) => {
        if (table === "invoices_with_details") {
          const query = {
            eq: (col: string, val: unknown) => {
              appliedFilters.push({ col, val });
              return query;
            },
            order: () => query,
            range: () =>
              Promise.resolve({ data: mockInvoices, error: null }),
          };
          return { select: () => query };
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

    const result = await getInvoices({
      locationSlug: "circunvalacao",
      status: "issued",
      limit: 10,
      offset: 5,
    });

    expect(result).toEqual(mockInvoices);
    expect(appliedFilters).toContainEqual({ col: "location_slug", val: "circunvalacao" });
    expect(appliedFilters).toContainEqual({ col: "status", val: "issued" });
  });
});

describe("getInvoiceBySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invoice for session", async () => {
    const mockInvoice = { id: "inv-1", session_id: "sess-1" };

    // We need a more specific mock for invoices_with_details.eq.single
    const supabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockInvoice, error: null }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getInvoiceBySession("sess-1");

    expect(result).toEqual(mockInvoice);
  });
});

// =============================================
// TESTS: processRetryQueue
// =============================================

describe("processRetryQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeros when no pending items", async () => {
    const supabase = createInvoiceSupabaseMock({ retryItems: [] });
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await processRetryQueue();

    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0 });
  });

  it("processes pending items and marks completed on success", async () => {
    // For processRetryQueue, we need a special mock where createInvoice succeeds
    // Since processRetryQueue calls createInvoice internally, and createInvoice
    // uses the same mocked createClient, we need the Supabase mock to handle
    // both the retry queue queries AND the invoice creation queries.
    const updates: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: (col: string, val: unknown) => ({
                lt: () => ({
                  lt: () => ({
                    limit: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: "retry-1",
                            operation: "invoice_create",
                            entity_id: "sess-1",
                            payload: {
                              sessionId: "sess-1",
                              locationSlug: "circunvalacao",
                              paymentMethodId: 1,
                              paidAmount: 12.30,
                              issuedBy: "user-1",
                            },
                            attempts: 1,
                            status: "pending",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
                eq: () => ({
                  in: () => ({
                    limit: () =>
                      Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            update: (data: unknown) => ({
              eq: () => {
                updates.push(data);
                return Promise.resolve({ data: null, error: null });
              },
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        // For createInvoice internal calls
        if (table === "sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: "sess-1",
                      orders: [
                        {
                          quantity: 1,
                          unit_price: 10,
                          notes: null,
                          products: { id: "p1", name: "Test", price: 10, vendus_id: "vp1", vendus_tax_id: "1" },
                        },
                      ],
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "payment_methods") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { vendus_id: "pm-1", slug: "cash" },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "locations") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "loc-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "invoices") {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "inv-1" }, error: null }),
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
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      },
    };

    const vendusClient = createVendusClientMock();
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await processRetryQueue();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    // Should have been marked as "processing" then "completed"
    expect(updates.some((u) => (u as Record<string, unknown>).status === "processing")).toBe(true);
    expect(updates.some((u) => (u as Record<string, unknown>).status === "completed")).toBe(true);
  });

  it("retries with pending status when attempts < 4", async () => {
    const updates: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: () => ({
                lt: () => ({
                  lt: () => ({
                    limit: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: "retry-1",
                            operation: "invoice_create",
                            entity_id: "sess-retry",
                            payload: {
                              sessionId: "sess-retry",
                              locationSlug: "circunvalacao",
                              paymentMethodId: 1,
                              paidAmount: 10,
                              issuedBy: "user-1",
                            },
                            attempts: 1, // < 4, so should become pending
                            status: "pending",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
                eq: () => ({
                  in: () => ({
                    limit: () =>
                      Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            update: (data: unknown) => ({
              eq: () => {
                updates.push(data);
                return Promise.resolve({ data: null, error: null });
              },
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        if (table === "sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: "not found" } }),
              }),
            }),
          };
        }
        if (table === "locations") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "loc-1" }, error: null }),
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
    vi.mocked(getVendusClient).mockReturnValue(createVendusClientMock() as never);

    const result = await processRetryQueue();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    // Should be marked as "pending" (not "failed") because attempts=1 < 4
    expect(updates.some((u) => (u as Record<string, unknown>).status === "pending")).toBe(true);
    expect(updates.every((u) => (u as Record<string, unknown>).status !== "failed")).toBe(true);
  });

  it("handles retry queue null data with ?? [] fallback", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: () => ({
                lt: () => ({
                  lt: () => ({
                    limit: () =>
                      Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await processRetryQueue();

    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0 });
  });

  it("marks as failed after max attempts", async () => {
    const updates: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: () => ({
                lt: () => ({
                  lt: () => ({
                    limit: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: "retry-1",
                            operation: "invoice_create",
                            entity_id: "sess-fail",
                            payload: {
                              sessionId: "sess-fail",
                              locationSlug: "circunvalacao",
                              paymentMethodId: 1,
                              paidAmount: 10,
                              issuedBy: "user-1",
                            },
                            attempts: 4, // >= 4 means next failure = failed
                            status: "pending",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
                eq: () => ({
                  in: () => ({
                    limit: () =>
                      Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            update: (data: unknown) => ({
              eq: () => {
                updates.push(data);
                return Promise.resolve({ data: null, error: null });
              },
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        // createInvoice will fail: return no session
        if (table === "sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: "not found" } }),
              }),
            }),
          };
        }
        if (table === "locations") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "loc-1" }, error: null }),
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
    vi.mocked(getVendusClient).mockReturnValue(createVendusClientMock() as never);

    const result = await processRetryQueue();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
    // Should be marked as "failed" (not "pending") because attempts >= 4
    expect(updates.some((u) => (u as Record<string, unknown>).status === "failed")).toBe(true);
  });

  it("uses 'Erro desconhecido' when non-Error thrown in retry processing", async () => {
    // Use a non-invoice_create operation that falls through the if block,
    // then make the "completed" update throw a non-Error value.
    const updates: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: () => ({
                lt: () => ({
                  lt: () => ({
                    limit: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: "retry-ne",
                            operation: "other_operation",
                            entity_id: "entity-ne",
                            payload: {},
                            attempts: 0,
                            status: "pending",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
                eq: () => ({
                  in: () => ({
                    limit: () =>
                      Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            update: (data: unknown) => {
              const d = data as Record<string, unknown>;
              // First update = "processing" (before try), let it succeed
              if (d.status === "processing") {
                return {
                  eq: () => Promise.resolve({ data: null, error: null }),
                };
              }
              // Second update = "completed" (inside try), throw non-Error
              if (d.status === "completed") {
                return {
                  eq: () => {
                    throw "non-error string"; // eslint-disable-line no-throw-literal
                  },
                };
              }
              // Catch update with last_error (in catch block)
              updates.push(data);
              return {
                eq: () => Promise.resolve({ data: null, error: null }),
              };
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

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await processRetryQueue();

    expect(result.failed).toBe(1);
    expect(
      updates.some((u) => (u as Record<string, unknown>).last_error === "Erro desconhecido"),
    ).toBe(true);
  });

  it("uses null fallback for locationId in addToRetryQueue when location is not found", async () => {
    // When location is not found (null), location?.id = undefined.
    // In addToRetryQueue, locationId ?? null converts undefined to null.
    // To reach addToRetryQueue, Vendus must throw a retryable error.
    const { VendusApiError: MockError } = await import("../client");
    const retryInserts: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: "sess-noloc",
                      location: "circunvalacao",
                      orders: [
                        {
                          id: "o1",
                          quantity: 1,
                          unit_price: 10,
                          notes: null,
                          products: { id: "p1", name: "Test", price: 10, vendus_id: "v1", vendus_tax_id: "1" },
                        },
                      ],
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "payment_methods") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { vendus_id: "1", slug: "cash" }, error: null }),
              }),
            }),
          };
        }
        if (table === "locations") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: null }), // Location NOT found
              }),
            }),
          };
        }
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => ({
                    limit: () =>
                      Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            insert: (data: unknown) => {
              retryInserts.push(data);
              return Promise.resolve({ data: null, error: null });
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

    const vendusClient = createVendusClientMock({
      post: vi.fn().mockRejectedValue(
        new MockError("SERVER_ERROR", "Internal error", undefined, 500),
      ),
    });

    vi.mocked(createAdminClient).mockReturnValue(supabase as never);
    vi.mocked(getVendusClient).mockReturnValue(vendusClient as never);

    const result = await createInvoice({
      sessionId: "sess-noloc",
      locationSlug: "circunvalacao",
      paymentMethodId: 1,
      paidAmount: 12.30,
      issuedBy: "user-1",
    });

    expect(result.success).toBe(false);
    // The retry queue insert should have location_id: null (from undefined ?? null)
    expect(retryInserts.length).toBeGreaterThan(0);
    const inserted = retryInserts[0] as Record<string, unknown>;
    expect(inserted.location_id).toBeNull();
  });

  it("skips unknown operation types in retry processing", async () => {
    const updates: unknown[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === "vendus_retry_queue") {
          return {
            select: () => ({
              eq: () => ({
                lt: () => ({
                  lt: () => ({
                    limit: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: "retry-unknown",
                            operation: "unknown_operation",
                            entity_id: "entity-1",
                            payload: {},
                            attempts: 0,
                            status: "pending",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
                eq: () => ({
                  in: () => ({
                    limit: () =>
                      Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
            update: (data: unknown) => ({
              eq: () => {
                updates.push(data);
                return Promise.resolve({ data: null, error: null });
              },
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

    const result = await processRetryQueue();

    expect(result.processed).toBe(1);
    // Unknown operation succeeds (no-op), so it gets marked as completed
    expect(result.succeeded).toBe(1);
  });
});
