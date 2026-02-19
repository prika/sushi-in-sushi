/**
 * Vendus API Client Tests
 *
 * Tests cover:
 * - VendusApiError: isRetryable(), getUserMessage()
 * - VendusClient: request with retry, timeout, network errors
 * - Client factory: caching by locationSlug
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VendusApiError,
  VendusClient,
  getVendusClient,
  clearClientCache,
} from "../client";
import type { VendusConfig } from "../types";

// =============================================
// HELPERS
// =============================================

function createConfig(overrides?: Partial<VendusConfig>): VendusConfig {
  return {
    apiKey: "test-api-key",
    storeId: "store-1",
    registerId: "reg-1",
    baseUrl: "https://test.vendus.pt/ws/v1.2",
    timeout: 5000,
    retryAttempts: 3,
    ...overrides,
  };
}

function mockFetchResponse(
  status: number,
  body: unknown,
  options?: { emptyBody?: boolean },
) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () =>
      Promise.resolve(options?.emptyBody ? "" : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as Response);
}

// =============================================
// TESTS
// =============================================

describe("VendusApiError", () => {
  describe("isRetryable", () => {
    it("returns true for 429 (rate limited)", () => {
      const error = new VendusApiError("RATE_LIMITED", "Too many requests", undefined, 429);
      expect(error.isRetryable()).toBe(true);
    });

    it("returns true for 500 (server error)", () => {
      const error = new VendusApiError("SERVER_ERROR", "Internal error", undefined, 500);
      expect(error.isRetryable()).toBe(true);
    });

    it("returns true for 502 (bad gateway)", () => {
      const error = new VendusApiError("SERVER_ERROR", "Bad gateway", undefined, 502);
      expect(error.isRetryable()).toBe(true);
    });

    it("returns true for 503 (service unavailable)", () => {
      const error = new VendusApiError("SERVER_ERROR", "Unavailable", undefined, 503);
      expect(error.isRetryable()).toBe(true);
    });

    it("returns false for 400 (bad request)", () => {
      const error = new VendusApiError("API_ERROR", "Bad request", undefined, 400);
      expect(error.isRetryable()).toBe(false);
    });

    it("returns false for 401 (unauthorized)", () => {
      const error = new VendusApiError("UNAUTHORIZED", "Unauthorized", undefined, 401);
      expect(error.isRetryable()).toBe(false);
    });

    it("returns false for 404 (not found)", () => {
      const error = new VendusApiError("NOT_FOUND", "Not found", undefined, 404);
      expect(error.isRetryable()).toBe(false);
    });

    it("returns false when no statusCode", () => {
      const error = new VendusApiError("UNKNOWN", "Unknown");
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe("getUserMessage", () => {
    it("returns PT message for TIMEOUT", () => {
      const error = new VendusApiError("TIMEOUT", "timeout");
      expect(error.getUserMessage()).toBe(
        "O pedido demorou demasiado. Por favor tente novamente.",
      );
    });

    it("returns PT message for NETWORK_ERROR", () => {
      const error = new VendusApiError("NETWORK_ERROR", "network");
      expect(error.getUserMessage()).toContain("Erro de ligacao");
    });

    it("returns PT message for UNAUTHORIZED", () => {
      const error = new VendusApiError("UNAUTHORIZED", "unauth");
      expect(error.getUserMessage()).toContain("Credenciais");
    });

    it("returns PT message for NOT_FOUND", () => {
      const error = new VendusApiError("NOT_FOUND", "missing");
      expect(error.getUserMessage()).toContain("nao encontrado");
    });

    it("returns PT message for RATE_LIMITED", () => {
      const error = new VendusApiError("RATE_LIMITED", "throttled");
      expect(error.getUserMessage()).toContain("Muitos pedidos");
    });

    it("returns validation message for VALIDATION_ERROR", () => {
      const error = new VendusApiError("VALIDATION_ERROR", "campo obrigatorio");
      expect(error.getUserMessage()).toContain("campo obrigatorio");
    });

    it("returns original message for unknown code", () => {
      const error = new VendusApiError("SOME_CODE", "custom message");
      expect(error.getUserMessage()).toBe("custom message");
    });

    it("returns fallback message when no message", () => {
      const error = new VendusApiError("UNKNOWN", "");
      expect(error.getUserMessage()).toContain("Vendus");
    });
  });
});

describe("VendusClient - request", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    clearClientCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes GET request with correct URL and headers", async () => {
    fetchMock.mockReturnValue(mockFetchResponse(200, { ok: true }));
    const client = new VendusClient(createConfig());

    await client.get("/products");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://test.vendus.pt/ws/v1.2/products",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      }),
    );
  });

  it("sends Basic Auth header with API key", async () => {
    fetchMock.mockReturnValue(mockFetchResponse(200, { ok: true }));
    const client = new VendusClient(createConfig({ apiKey: "my-key" }));

    await client.get("/test");

    const expectedAuth = `Basic ${Buffer.from("my-key:").toString("base64")}`;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expectedAuth,
        }),
      }),
    );
  });

  it("parses JSON response on success", async () => {
    fetchMock.mockReturnValue(mockFetchResponse(200, { data: "test" }));
    const client = new VendusClient(createConfig());

    const result = await client.get<{ data: string }>("/test");

    expect(result).toEqual({ data: "test" });
  });

  it("sends POST body as JSON", async () => {
    fetchMock.mockReturnValue(mockFetchResponse(200, { id: "1" }));
    const client = new VendusClient(createConfig());

    await client.post("/products", { name: "Test", price: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test", price: 10 }),
      }),
    );
  });

  it("retries on 500 server error and succeeds", async () => {
    fetchMock
      .mockReturnValueOnce(
        mockFetchResponse(500, { code: "SERVER_ERROR", message: "fail" }),
      )
      .mockReturnValueOnce(mockFetchResponse(200, { ok: true }));

    const client = new VendusClient(createConfig({ retryAttempts: 3 }));
    const result = await client.get<{ ok: boolean }>("/test");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 rate limited", async () => {
    fetchMock
      .mockReturnValueOnce(
        mockFetchResponse(429, { code: "RATE_LIMITED", message: "slow down" }),
      )
      .mockReturnValueOnce(mockFetchResponse(200, { ok: true }));

    const client = new VendusClient(createConfig({ retryAttempts: 3 }));
    const result = await client.get<{ ok: boolean }>("/test");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400 client error", async () => {
    fetchMock.mockReturnValue(
      mockFetchResponse(400, { code: "VALIDATION_ERROR", message: "bad" }),
    );

    const client = new VendusClient(createConfig());

    await expect(client.get("/test")).rejects.toThrow(VendusApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 401 unauthorized", async () => {
    fetchMock.mockReturnValue(
      mockFetchResponse(401, { code: "UNAUTHORIZED", message: "invalid key" }),
    );

    const client = new VendusClient(createConfig());

    await expect(client.get("/test")).rejects.toThrow(VendusApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retry attempts", async () => {
    fetchMock.mockReturnValue(
      mockFetchResponse(500, { code: "SERVER_ERROR", message: "down" }),
    );

    const client = new VendusClient(createConfig({ retryAttempts: 2 }));

    await expect(client.get("/test")).rejects.toThrow(VendusApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws TIMEOUT error on AbortError", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);

    const client = new VendusClient(createConfig());

    try {
      await client.get("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(VendusApiError);
      expect((error as VendusApiError).code).toBe("TIMEOUT");
      expect((error as VendusApiError).statusCode).toBe(408);
    }
  });

  it("throws NETWORK_ERROR on TypeError", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const client = new VendusClient(createConfig());

    try {
      await client.get("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(VendusApiError);
      expect((error as VendusApiError).code).toBe("NETWORK_ERROR");
      expect((error as VendusApiError).statusCode).toBe(0);
    }
  });

  it("throws EMPTY_RESPONSE when body is empty", async () => {
    fetchMock.mockReturnValue(
      mockFetchResponse(200, null, { emptyBody: true }),
    );

    const client = new VendusClient(createConfig());

    try {
      await client.get("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(VendusApiError);
      expect((error as VendusApiError).code).toBe("EMPTY_RESPONSE");
    }
  });

  it("throws UNKNOWN_ERROR for unexpected errors", async () => {
    fetchMock.mockRejectedValue(new Error("something weird"));

    const client = new VendusClient(createConfig());

    // Regular Error (not TypeError, not AbortError) goes to the UNKNOWN_ERROR catch
    // But wait - the code checks: TypeError → NETWORK_ERROR, AbortError → TIMEOUT, VendusApiError → rethrow
    // A plain Error falls through to the final catch → UNKNOWN_ERROR
    // Actually checking the code: it checks instanceof TypeError, instanceof Error with name === AbortError
    // A plain Error is instanceof Error but name is "Error" not "AbortError"
    // But it IS also caught by the generic "error instanceof Error" check... wait no.
    // Let me re-read: the catch block checks VendusApiError first, then AbortError (name check), then TypeError
    // A regular Error doesn't match any of those, so it falls to the final throw new VendusApiError("UNKNOWN_ERROR", ...)
    try {
      await client.get("/test");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(VendusApiError);
      expect((error as VendusApiError).code).toBe("UNKNOWN_ERROR");
    }
  });

  it("sends PUT request correctly", async () => {
    fetchMock.mockReturnValue(mockFetchResponse(200, { updated: true }));
    const client = new VendusClient(createConfig());

    await client.put("/products/1", { price: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/products/1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ price: 20 }),
      }),
    );
  });

  it("sends DELETE request correctly", async () => {
    fetchMock.mockReturnValue(mockFetchResponse(200, { deleted: true }));
    const client = new VendusClient(createConfig());

    await client.delete("/products/1");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/products/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("maps HTTP status to correct error codes", async () => {
    const statusToCode: Record<number, string> = {
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      422: "VALIDATION_ERROR",
      429: "RATE_LIMITED",
    };

    for (const [status, expectedCode] of Object.entries(statusToCode)) {
      fetchMock.mockReturnValue(
        mockFetchResponse(Number(status), { message: "error" }),
      );

      const client = new VendusClient(
        createConfig({ retryAttempts: 1 }),
      );

      try {
        await client.get("/test");
        expect.unreachable(`Should have thrown for status ${status}`);
      } catch (error) {
        expect((error as VendusApiError).code).toBe(expectedCode);
      }
    }
  });
});

describe("getVendusClient / clearClientCache", () => {
  it("caches client for same locationSlug", () => {
    clearClientCache();
    const config = createConfig();

    const client1 = getVendusClient(config, "circunvalacao");
    const client2 = getVendusClient(config, "circunvalacao");

    expect(client1).toBe(client2);
  });

  it("returns different clients for different slugs", () => {
    clearClientCache();
    const config = createConfig();

    const client1 = getVendusClient(config, "circunvalacao");
    const client2 = getVendusClient(config, "boavista");

    expect(client1).not.toBe(client2);
  });

  it("clearClientCache forces new instances", () => {
    const config = createConfig();
    const client1 = getVendusClient(config, "circunvalacao");

    clearClientCache();

    const client2 = getVendusClient(config, "circunvalacao");
    expect(client1).not.toBe(client2);
  });
});
