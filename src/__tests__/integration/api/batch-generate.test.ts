/**
 * Integration Tests: Batch Generate Descriptions API
 *
 * Tests the POST /api/products/generate-description/batch endpoint:
 * - Groups products into batches and sends one AI call per batch
 * - Saves descriptions, seo_titles, seo_descriptions JSONB to DB
 * - Supports onlyMissing filter, categoryId filter
 * - Handles AI errors gracefully per batch
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { _mockUpdate, _mockEq, _mockSelect, mockCreate, mockFrom } = vi.hoisted(
  () => {
    const _mockEq = vi.fn().mockResolvedValue({ error: null });
    const _mockUpdate = vi.fn().mockReturnValue({ eq: _mockEq });
    const _mockSelect = vi.fn();
    const mockCreate = vi.fn();

    // Chainable query builder
    const mockFrom = vi.fn();

    return { _mockUpdate, _mockEq, _mockSelect, mockCreate, mockFrom };
  }
);

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

// ─── Route handler import ───────────────────────────────────────────────────

import { POST } from "@/app/api/products/generate-description/batch/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost:3000/api/products/generate-description/batch",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const sampleProducts = [
  {
    id: 1,
    name: "Salmão Teriyaki",
    description: "Salmão com molho teriyaki",
    price: 14.9,
    quantity: 1,
    category_id: "cat-1",
    categories: { name: "Pratos Quentes" },
  },
  {
    id: 2,
    name: "Edamame",
    description: null,
    price: 5.5,
    quantity: null,
    category_id: "cat-2",
    categories: { name: "Entradas" },
  },
  {
    id: 3,
    name: "Miso Soup",
    description: "Sopa de miso tradicional",
    price: 4.0,
    quantity: 1,
    category_id: "cat-2",
    categories: { name: "Entradas" },
  },
];

function mockBatchAIResponse(productNames: string[]) {
  const response: Record<string, unknown> = {};
  for (const name of productNames) {
    response[name] = {
      descriptions: {
        pt: `${name} descrição PT`,
        en: `${name} description EN`,
        fr: `${name} description FR`,
        de: `${name} description DE`,
        it: `${name} description IT`,
        es: `${name} description ES`,
      },
      seoTitles: {
        pt: `${name} - Sushi in Sushi`,
        en: `${name} - Sushi in Sushi`,
        fr: `${name} - Sushi in Sushi`,
        de: `${name} - Sushi in Sushi`,
        it: `${name} - Sushi in Sushi`,
        es: `${name} - Sushi in Sushi`,
      },
      seoDescriptions: {
        pt: `SEO ${name} PT`,
        en: `SEO ${name} EN`,
        fr: `SEO ${name} FR`,
        de: `SEO ${name} DE`,
        it: `SEO ${name} IT`,
        es: `SEO ${name} ES`,
      },
    };
  }
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(response) }],
  });
}

// Chain helper: builds a mock query chain
function chainBuilder(data: unknown[] | null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "in",
    "order",
    "limit",
    "update",
    "neq",
    "is",
    "filter",
  ];
  const result = { data, error };
  // Each method returns the chain, and the chain is also a thenable
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make chain thenable (resolves to result)
  chain.then = (resolve: (_v: unknown) => void) => {
    resolve(result);
    return chain;
  };
  return chain;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/products/generate-description/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("deve agrupar produtos e enviar uma chamada AI por lote", async () => {
    const productsChain = chainBuilder(sampleProducts);
    const ingredientsChain = chainBuilder([]);
    const updateChain = chainBuilder(null);
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") return productsChain;
      if (table === "product_ingredients") return ingredientsChain;
      return updateChain;
    });

    // All 3 products fit in 1 batch (batchSize=15)
    mockBatchAIResponse(["Salmão Teriyaki", "Edamame", "Miso Soup"]);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generated).toBe(3);
    expect(data.batchesUsed).toBe(1);
    // Only 1 AI call for all 3 products
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("deve dividir em múltiplos lotes quando excede batchSize", async () => {
    // Create 8 products, batchSize=3 → 3 batches (3+3+2)
    const manyProducts = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      description: null,
      price: 10,
      quantity: 1,
      category_id: "cat-1",
      categories: { name: "Cat" },
    }));

    const productsChain = chainBuilder(manyProducts);
    const ingredientsChain = chainBuilder([]);
    const updateChain = chainBuilder(null);
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") return productsChain;
      if (table === "product_ingredients") return ingredientsChain;
      return updateChain;
    });

    // Mock AI to return results for any product names
    mockCreate.mockImplementation((args: { messages: Array<{ content: string }> }) => {
      // Parse product names from the prompt text
      const userMsg = args.messages[0].content;
      const nameMatches = typeof userMsg === "string"
        ? userMsg.match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, ""))
        : [];
      const names = nameMatches ?? ["Product"];
      const response: Record<string, unknown> = {};
      for (const name of names) {
        response[name] = {
          descriptions: { pt: `${name} PT`, en: `${name} EN`, fr: `${name} FR`, de: `${name} DE`, it: `${name} IT`, es: `${name} ES` },
          seoTitles: { pt: `${name}`, en: `${name}`, fr: `${name}`, de: `${name}`, it: `${name}`, es: `${name}` },
          seoDescriptions: { pt: `SEO`, en: `SEO`, fr: `SEO`, de: `SEO`, it: `SEO`, es: `SEO` },
        };
      }
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(response) }],
      });
    });

    // batchSize=5 (min is 5) → 8/5 = 2 batches (5+3)
    const request = createRequest({ batchSize: 5 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generated).toBe(8);
    expect(data.batchesUsed).toBe(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("deve retornar erro 500 quando ANTHROPIC_API_KEY não está configurado", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("ANTHROPIC_API_KEY not configured");
  });

  it("deve retornar mensagem quando não há produtos", async () => {
    const productsChain = chainBuilder([]);
    mockFrom.mockReturnValue(productsChain);

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generated).toBe(0);
    expect(data.message).toContain("No products found");
  });

  it("deve marcar produtos como falhados quando AI retorna erro", async () => {
    const productsChain = chainBuilder(sampleProducts.slice(0, 1));
    const ingredientsChain = chainBuilder([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") return productsChain;
      if (table === "product_ingredients") return ingredientsChain;
      return productsChain;
    });

    mockCreate.mockRejectedValue(new Error("AI service unavailable"));

    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.failed).toBe(1);
    expect(data.generated).toBe(0);
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].error).toContain("AI service unavailable");
  });

  it("deve incluir ingredientes no prompt da AI", async () => {
    const productsChain = chainBuilder(sampleProducts.slice(0, 1));
    const ingredientsChain = chainBuilder([
      { product_id: 1, ingredients: { name: "Salmão" } },
      { product_id: 1, ingredients: { name: "Molho Teriyaki" } },
    ]);
    const updateChain = chainBuilder(null);
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        // First call returns products, second call (for onlyMissing check) we skip
        return productsChain;
      }
      if (table === "product_ingredients") return ingredientsChain;
      return updateChain;
    });

    mockBatchAIResponse(["Salmão Teriyaki"]);

    const request = createRequest({});
    await POST(request);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    const userMsg = callArgs.messages[0].content;
    expect(userMsg).toContain("Salmão");
    expect(userMsg).toContain("Molho Teriyaki");
  });
});
