import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

const BATCH_SIZE = 15; // products per AI call (safe for token limits)

interface ProductInfo {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  quantity: number | null;
  categoryName: string | null;
  ingredients: string[];
}

interface ProductResult {
  descriptions: Record<string, string>;
  seoTitles: Record<string, string>;
  seoDescriptions: Record<string, string>;
}

const SYSTEM_PROMPT = `You are a professional SEO copywriter for Sushi in Sushi, an upscale Japanese fusion restaurant in Porto, Portugal.

Your task is to generate compelling descriptions and SEO metadata for MULTIPLE products at once, in 6 languages.

Languages: Português Europeu (pt), English (en), Français (fr), Deutsch (de), Italiano (it), Español (es)

Guidelines:
- Keep descriptions concise but evocative (1-2 sentences)
- SEO descriptions: max 160 characters per language
- SEO titles: under 60 characters, include the product name
- Highlight key ingredients, preparation methods, and unique selling points
- Use sensory language (taste, texture, aroma) when appropriate
- Never use generic filler words
- Be factual — only describe what's actually in the dish
- For Portuguese, use European Portuguese (not Brazilian)
- For Spanish, use Castilian Spanish

Respond in valid JSON with this exact structure (one entry per product, keyed by product name):
{
  "Product Name 1": {
    "descriptions": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."},
    "seoTitles": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."},
    "seoDescriptions": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."}
  },
  "Product Name 2": { ... }
}

IMPORTANT: Use the exact product names as keys in the JSON response.`;

/**
 * POST /api/products/generate-description/batch
 *
 * Generates AI descriptions for multiple products efficiently.
 * Groups products into batches of ~15 and sends one AI call per batch.
 *
 * Body: {
 *   limit?: number,           // max products to process (default: all)
 *   categoryId?: string,      // filter by category
 *   productIds?: number[],    // specific product IDs
 *   onlyMissing?: boolean,    // only products without descriptions JSONB
 *   batchSize?: number,       // products per AI call (default: 15, max: 25)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      limit,
      categoryId,
      productIds,
      onlyMissing = false,
      batchSize = BATCH_SIZE,
    } = body;

    const effectiveBatchSize = Math.min(Math.max(batchSize, 5), 25);

    const supabase = createAdminClient();

    // Fetch products
    let query = supabase
      .from("products")
      .select("id, name, description, price, quantity, category_id, categories(name)")
      .eq("is_available", true)
      .order("sort_order", { ascending: true });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (productIds && productIds.length > 0) {
      query = query.in("id", productIds);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ message: "No products found", generated: 0 });
    }

    // Filter products that already have descriptions if onlyMissing
    let filteredProducts = products;
    if (onlyMissing) {
      // Fetch descriptions JSONB to check which already have all 6 locales
      // Column not in generated types, so cast through unknown
      const { data: descRows } = await supabase
        .from("products")
        .select("id")
        .in("id", products.map((p) => p.id)) as unknown as {
          data: Array<{ id: number; descriptions?: Record<string, string> | null }> | null;
        };

      const existingDescriptions = new Set(
        (descRows ?? [])
          .filter((d) => d.descriptions && Object.keys(d.descriptions).length >= 6)
          .map((d) => String(d.id))
      );

      filteredProducts = products.filter((p) => !existingDescriptions.has(String(p.id)));
    }

    if (filteredProducts.length === 0) {
      return NextResponse.json({
        message: "All products already have descriptions",
        generated: 0,
      });
    }

    // Fetch ingredients for all products (bulk query)
    const productIdList = filteredProducts.map((p) => p.id);
    const { data: ingredientsData } = await supabase
      .from("product_ingredients")
      .select("product_id, ingredients(name)")
      .in("product_id", productIdList);

    const ingredientsByProduct: Record<string, string[]> = {};
    for (const pi of ingredientsData ?? []) {
      const pid = String(pi.product_id);
      const ingName = (pi.ingredients as { name: string } | null)?.name;
      if (ingName) {
        if (!ingredientsByProduct[pid]) ingredientsByProduct[pid] = [];
        ingredientsByProduct[pid].push(ingName);
      }
    }

    // Build product info list
    const productInfoList: ProductInfo[] = filteredProducts.map((p) => ({
      id: String(p.id),
      name: p.name,
      description: p.description,
      price: p.price,
      quantity: p.quantity,
      categoryName: (p.categories as { name: string } | null)?.name ?? null,
      ingredients: ingredientsByProduct[String(p.id)] ?? [],
    }));

    // Split into batches
    const batches: ProductInfo[][] = [];
    for (let i = 0; i < productInfoList.length; i += effectiveBatchSize) {
      batches.push(productInfoList.slice(i, i + effectiveBatchSize));
    }

    // Process each batch
    const allResults: Array<{
      productId: string;
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      try {
        const batchResults = await processBatch(batch);

        // Save results to DB
        for (const product of batch) {
          const result = batchResults[product.name];
          if (result) {
            const { error: updateError } = await supabase
              .from("products")
              .update({
                descriptions: result.descriptions,
                seo_titles: result.seoTitles,
                seo_descriptions: result.seoDescriptions,
                description: result.descriptions?.pt || product.description || null,
                seo_title: result.seoTitles?.pt || null,
                seo_description: result.seoDescriptions?.pt || null,
                seo_generated_at: new Date().toISOString(),
              } as Record<string, unknown>)
              .eq("id", String(product.id));

            if (updateError) {
              allResults.push({
                productId: product.id,
                name: product.name,
                success: false,
                error: `DB save failed: ${updateError.message}`,
              });
            } else {
              allResults.push({
                productId: product.id,
                name: product.name,
                success: true,
              });
            }
          } else {
            allResults.push({
              productId: product.id,
              name: product.name,
              success: false,
              error: "Product not found in AI response",
            });
          }
        }
      } catch (err) {
        // If batch fails, mark all products in batch as failed
        for (const product of batch) {
          allResults.push({
            productId: product.id,
            name: product.name,
            success: false,
            error: String(err),
          });
        }
      }

      // Small delay between batches to respect rate limits
      if (batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const generated = allResults.filter((r) => r.success).length;
    const failed = allResults.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Generated ${generated} descriptions (${failed} failed) in ${batches.length} AI call(s)`,
      generated,
      failed,
      totalProducts: filteredProducts.length,
      batchesUsed: batches.length,
      results: allResults,
    });
  } catch (error) {
    console.error("Error in batch generation:", error);
    return NextResponse.json(
      { error: "Failed to run batch generation" },
      { status: 500 }
    );
  }
}

/**
 * Process a batch of products with a single Claude call.
 * Returns a map of product name → result.
 */
async function processBatch(
  products: ProductInfo[]
): Promise<Record<string, ProductResult>> {
  // Build a numbered list of products for the prompt
  const productLines = products.map((p, i) => {
    const parts: string[] = [`${i + 1}. "${p.name}"`];
    if (p.categoryName) parts.push(`   Category: ${p.categoryName}`);
    if (p.description) parts.push(`   Current description: ${p.description}`);
    if (p.ingredients.length > 0) parts.push(`   Ingredients: ${p.ingredients.join(", ")}`);
    if (p.price) parts.push(`   Price: €${p.price.toFixed(2)}`);
    if (p.quantity) parts.push(`   Pieces/portions: ${p.quantity}`);
    return parts.join("\n");
  });

  const userPrompt = `Generate descriptions, SEO titles, and SEO descriptions for these ${products.length} products:\n\n${productLines.join("\n\n")}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096 * Math.min(Math.ceil(products.length / 5), 4), // Scale tokens with batch size
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const responseText = message.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI batch response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, ProductResult>;
  return parsed;
}
