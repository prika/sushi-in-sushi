/**
 * Integration Tests: Stripe Payments API
 * Tests for /api/payments/create-intent, /api/webhooks/stripe, /api/payments/[sessionId]/status
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock data
const MOCK_SESSION = {
  id: "session-123",
  status: "active",
  total_amount: 45.5,
  table_id: "table-456",
  ordering_mode: "dine_in",
};

const MOCK_PAYMENT_INTENT = {
  id: "pi_test_123",
  client_secret: "pi_test_123_secret_abc",
  amount: 4550,
  status: "requires_payment_method",
  latest_charge: "ch_test_456",
  metadata: {
    session_id: "session-123",
    table_id: "table-456",
    subtotal: "45.50",
    tip_amount: "0",
    customer_nif: "",
    ordering_mode: "dine_in",
  },
  last_payment_error: null,
};

// Mock Stripe
const mockPaymentIntentsCreate = vi.fn().mockResolvedValue(MOCK_PAYMENT_INTENT);
const mockPaymentIntentsRetrieve = vi.fn().mockResolvedValue(MOCK_PAYMENT_INTENT);
const mockChargesRetrieve = vi.fn().mockResolvedValue({
  receipt_url: "https://receipt.stripe.com/test",
  payment_method_details: { type: "card" },
});
const mockWebhooksConstructEvent = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: (...args: unknown[]) => mockPaymentIntentsCreate(...args),
      retrieve: (...args: unknown[]) => mockPaymentIntentsRetrieve(...args),
    },
    charges: {
      retrieve: (...args: unknown[]) => mockChargesRetrieve(...args),
    },
    webhooks: {
      constructEvent: (...args: unknown[]) => mockWebhooksConstructEvent(...args),
    },
  },
}));

// Mock Supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

// Mock Vendus
const mockCreateInvoice = vi.fn().mockResolvedValue({
  success: true,
  invoiceId: "invoice-789",
});

vi.mock("@/lib/vendus/invoices", () => ({
  createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
}));

// Helper: create a chaining mock for Supabase queries
function createQueryChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/payments/create-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/create-intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a PaymentIntent for valid session", async () => {
    // Session query chain
    const sessionChain = createQueryChain(MOCK_SESSION);
    // Existing payment check (no existing payment)
    const paymentCheckChain = createQueryChain(null);
    // Insert payment chain
    const insertChain = createQueryChain(null);

    mockFrom.mockImplementation((table: string) => {
      if (table === "sessions") return sessionChain;
      if (table === "payments") {
        // First call = check existing, second call = insert
        if (mockFrom.mock.calls.filter((c: string[]) => c[0] === "payments").length <= 1) {
          return paymentCheckChain;
        }
        return insertChain;
      }
      return createQueryChain(null);
    });

    const { POST } = await import(
      "@/app/api/payments/create-intent/route"
    );

    const request = createRequest({
      sessionId: "session-123",
      tipAmount: 0,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clientSecret).toBe("pi_test_123_secret_abc");
    expect(data.paymentId).toBe("pi_test_123");
    expect(data.total).toBe(45.5);
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 4550,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
      }),
    );
  });

  it("should reject missing sessionId", async () => {
    const { POST } = await import(
      "@/app/api/payments/create-intent/route"
    );

    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("sessionId obrigatorio");
  });

  it("should reject closed sessions", async () => {
    const sessionChain = createQueryChain({
      ...MOCK_SESSION,
      status: "closed",
    });
    mockFrom.mockReturnValue(sessionChain);

    const { POST } = await import(
      "@/app/api/payments/create-intent/route"
    );

    const request = createRequest({ sessionId: "session-123" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Sessao ja esta fechada ou paga");
  });

  it("should include tip in total amount", async () => {
    const sessionChain = createQueryChain(MOCK_SESSION);
    const paymentCheckChain = createQueryChain(null);
    const insertChain = createQueryChain(null);

    let paymentCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "sessions") return sessionChain;
      if (table === "payments") {
        paymentCallCount++;
        return paymentCallCount <= 1 ? paymentCheckChain : insertChain;
      }
      return createQueryChain(null);
    });

    const { POST } = await import(
      "@/app/api/payments/create-intent/route"
    );

    const request = createRequest({
      sessionId: "session-123",
      tipAmount: 5.0,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(50.5);
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5050,
      }),
    );
  });

  it("should reject zero total", async () => {
    const sessionChain = createQueryChain({
      ...MOCK_SESSION,
      total_amount: 0,
    });
    const paymentCheckChain = createQueryChain(null);

    mockFrom.mockImplementation((table: string) => {
      if (table === "sessions") return sessionChain;
      if (table === "payments") return paymentCheckChain;
      return createQueryChain(null);
    });

    const { POST } = await import(
      "@/app/api/payments/create-intent/route"
    );

    const request = createRequest({ sessionId: "session-123" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Valor invalido");
  });

  it("should reuse existing pending PaymentIntent", async () => {
    const sessionChain = createQueryChain(MOCK_SESSION);
    const existingPaymentChain = createQueryChain({
      stripe_payment_intent_id: "pi_existing",
      status: "pending",
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "sessions") return sessionChain;
      if (table === "payments") return existingPaymentChain;
      return createQueryChain(null);
    });

    mockPaymentIntentsRetrieve.mockResolvedValue({
      ...MOCK_PAYMENT_INTENT,
      id: "pi_existing",
      client_secret: "pi_existing_secret",
      status: "requires_payment_method",
    });

    const { POST } = await import(
      "@/app/api/payments/create-intent/route"
    );

    const request = createRequest({ sessionId: "session-123" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clientSecret).toBe("pi_existing_secret");
    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject missing stripe-signature", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: "{}",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should reject invalid signature", async () => {
    mockWebhooksConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "bad_sig" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should handle payment_intent.succeeded", async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: MOCK_PAYMENT_INTENT },
    });

    // Payment check (not yet succeeded)
    const paymentChain = createQueryChain({ id: "payment-1", status: "pending" });
    // Session chain
    const sessionChain = createQueryChain({
      ...MOCK_SESSION,
      tables: { restaurant_id: "rest-1", location: "circunvalacao" },
    });
    // Payment methods chain
    const methodChain = createQueryChain({ id: 5 });
    // Waiter tables chain
    const waiterChain = createQueryChain(null);

    mockFrom.mockImplementation((table: string) => {
      if (table === "payments") return paymentChain;
      if (table === "sessions") return sessionChain;
      if (table === "payment_methods") return methodChain;
      if (table === "waiter_tables") return waiterChain;
      return createQueryChain(null);
    });

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "stripe-signature": "valid_sig" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.received).toBe(true);

    // Verify session was closed
    expect(mockRpc).toHaveBeenCalledWith("close_session_transactional", {
      p_session_id: "session-123",
      p_cancel_orders: false,
      p_close_reason: "Pagamento online (Stripe)",
    });

    // Verify Vendus invoice was created
    expect(mockCreateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-123",
        locationSlug: "circunvalacao",
        paidAmount: 45.5,
        issuedBy: "system",
      }),
    );
  });

  it("should handle payment_intent.payment_failed", async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          ...MOCK_PAYMENT_INTENT,
          last_payment_error: { message: "Card declined" },
        },
      },
    });

    const paymentChain = createQueryChain(null);
    mockFrom.mockReturnValue(paymentChain);

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "stripe-signature": "valid_sig" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should skip already processed payments (idempotency)", async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: MOCK_PAYMENT_INTENT },
    });

    // Already succeeded
    const paymentChain = createQueryChain({
      id: "payment-1",
      status: "succeeded",
    });
    mockFrom.mockReturnValue(paymentChain);

    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const request = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "stripe-signature": "valid_sig" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Should NOT close session (already processed)
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });
});

describe("GET /api/payments/[sessionId]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return payment status", async () => {
    const paymentChain = createQueryChain({
      status: "succeeded",
      stripe_receipt_url: "https://receipt.stripe.com/test",
      invoice_id: "inv-123",
    });
    mockFrom.mockReturnValue(paymentChain);

    const { GET } = await import(
      "@/app/api/payments/[sessionId]/status/route"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/payments/session-123/status",
    );

    const response = await GET(request, {
      params: Promise.resolve({ sessionId: "session-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("succeeded");
    expect(data.receiptUrl).toBe("https://receipt.stripe.com/test");
    expect(data.invoiceId).toBe("inv-123");
  });

  it("should return not_found when no payment exists", async () => {
    const paymentChain = createQueryChain(null);
    mockFrom.mockReturnValue(paymentChain);

    const { GET } = await import(
      "@/app/api/payments/[sessionId]/status/route"
    );

    const request = new NextRequest(
      "http://localhost:3000/api/payments/session-999/status",
    );

    const response = await GET(request, {
      params: Promise.resolve({ sessionId: "session-999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("not_found");
  });
});
