/**
 * Integration Tests: Detect Allergens API
 *
 * Tests the POST /api/ingredients/detect-allergens endpoint:
 * - Detects EU 14 allergens from ingredient names via Claude Haiku
 * - Saves allergens TEXT[] to ingredients table
 * - Filters to valid EU allergen IDs only
 * - Handles missing API key, empty ingredients, AI errors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockUpdate, mockEq, mockCreate, mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockCreate = vi.fn();
  const mockFrom = vi.fn();
  return { mockUpdate, mockEq, mockCreate, mockFrom };
});

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "admin-1", role: "admin" }),
}));

// ─── Route handler import ───────────────────────────────────────────────────

import { POST } from "@/app/api/ingredients/detect-allergens/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost:3000/api/ingredients/detect-allergens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

// Chain builder for Supabase mock
function chainBuilder(data: unknown[] | null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "in", "order", "limit", "update"];
  const result = { data, error };
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(result);
    return chain;
  };
  return chain;
}

function mockAIResponse(response: Record<string, string[]>) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(response) }],
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/ingredients/detect-allergens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("deve detetar alergénios para ingredientes", async () => {
    const ingredientsChain = chainBuilder([
      { id: "ing-1", name: "Salmão" },
      { id: "ing-2", name: "Molho de Soja" },
      { id: "ing-3", name: "Água" },
    ]);
    const updateChain = chainBuilder(null);
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "ingredients") {
        return ingredientsChain;
      }
      return updateChain;
    });

    mockAIResponse({
      "Salmão": ["fish"],
      "Molho de Soja": ["soybeans", "gluten"],
      "Água": [],
    });

    const request = createRequest({ ingredientIds: ["ing-1", "ing-2", "ing-3"] });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.detected).toBe(3);
    expect(data.results).toHaveLength(3);

    const salmon = data.results.find((r: { name: string }) => r.name === "Salmão");
    expect(salmon.allergens).toEqual(["fish"]);

    const soy = data.results.find((r: { name: string }) => r.name === "Molho de Soja");
    expect(soy.allergens).toEqual(["soybeans", "gluten"]);

    const water = data.results.find((r: { name: string }) => r.name === "Água");
    expect(water.allergens).toEqual([]);
  });

  it("deve filtrar alergénios inválidos da resposta AI", async () => {
    const ingredientsChain = chainBuilder([
      { id: "ing-1", name: "Tempura" },
    ]);
    const updateChain = chainBuilder(null);
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    mockFrom.mockReturnValue(ingredientsChain);

    // AI returns some invalid allergen IDs
    mockAIResponse({
      "Tempura": ["gluten", "eggs", "invalid_allergen", "unknown"],
    });

    const request = createRequest({ ingredientIds: ["ing-1"] });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const tempura = data.results.find((r: { name: string }) => r.name === "Tempura");
    expect(tempura.allergens).toEqual(["gluten", "eggs"]);
    // invalid_allergen and unknown should be filtered out
    expect(tempura.allergens).not.toContain("invalid_allergen");
  });

  it("deve retornar erro 500 quando ANTHROPIC_API_KEY não está configurado", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("ANTHROPIC_API_KEY not configured");
  });

  it("deve retornar erro 404 quando não há ingredientes", async () => {
    const ingredientsChain = chainBuilder([]);
    mockFrom.mockReturnValue(ingredientsChain);

    const request = createRequest({ ingredientIds: ["nonexistent"] });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("No ingredients found");
  });

  it("deve retornar erro 500 quando AI não retorna JSON válido", async () => {
    const ingredientsChain = chainBuilder([
      { id: "ing-1", name: "Salmão" },
    ]);
    mockFrom.mockReturnValue(ingredientsChain);

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "This is not valid JSON" }],
    });

    const request = createRequest({ ingredientIds: ["ing-1"] });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to parse AI response");
  });

  it("deve usar os 14 alergénios EU no prompt", async () => {
    const ingredientsChain = chainBuilder([
      { id: "ing-1", name: "Camarão" },
    ]);
    const updateChain = chainBuilder(null);
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    mockFrom.mockReturnValue(ingredientsChain);

    mockAIResponse({ "Camarão": ["crustaceans"] });

    const request = createRequest({ ingredientIds: ["ing-1"] });
    await POST(request);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    // System prompt should mention EU allergens
    expect(callArgs.system).toContain("gluten");
    expect(callArgs.system).toContain("crustaceans");
    expect(callArgs.system).toContain("molluscs");
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
  });
});
