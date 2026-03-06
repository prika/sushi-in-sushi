import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

interface GenerateRequest {
  productId: string;
  name: string;
  description?: string | null;
  ingredients?: string[];
  categoryName?: string;
  price?: number;
  pieces?: number;
  imageUrl?: string | null;
}

const LOCALES = ["pt", "en", "fr", "de", "it", "es"] as const;

function buildSystemPrompt(brandName: string) {
  return `You are a professional SEO copywriter for ${brandName}, an upscale Japanese fusion restaurant in Porto, Portugal.

Your task is to generate compelling, professional product descriptions and SEO metadata in 6 languages simultaneously.

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

Respond in valid JSON with this exact structure:
{
  "descriptions": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."},
  "seoTitles": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."},
  "seoDescriptions": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."}
}`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Fetch brand name for prompt context
    const supabase = createAdminClient();
    const { data: _settings } = await (supabase as any).from("site_settings").select("brand_name").eq("id", 1).single();
    const brandName = _settings?.brand_name ?? "";

    const body: GenerateRequest = await request.json();
    const { productId, name, description, ingredients, categoryName, price, pieces, imageUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    // Build the user prompt with all available context
    const contextParts: string[] = [
      `Product name: ${name}`,
    ];

    if (categoryName) contextParts.push(`Category: ${categoryName}`);
    if (description) contextParts.push(`Current description (Portuguese): ${description}`);
    if (ingredients && ingredients.length > 0) contextParts.push(`Ingredients: ${ingredients.join(", ")}`);
    if (price) contextParts.push(`Price: €${price.toFixed(2)}`);
    if (pieces) contextParts.push(`Pieces/portions: ${pieces}`);

    contextParts.push(`\nGenerate descriptions, SEO titles, and SEO descriptions in all 6 languages: ${LOCALES.join(", ")}`);

    const userPrompt = contextParts.join("\n");

    // Build message content - include image if available
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const buffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          });
        }
      } catch {
        // Image fetch failed, continue without it
      }
    }

    content.push({ type: "text", text: userPrompt });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: buildSystemPrompt(brandName),
      messages: [{ role: "user", content }],
    });

    // Parse the response
    const responseText = message.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]) as {
      descriptions: Record<string, string>;
      seoTitles: Record<string, string>;
      seoDescriptions: Record<string, string>;
    };

    // Save to database if productId provided
    if (productId) {
      const supabase = createAdminClient();
      await supabase
        .from("products")
        .update({
          descriptions: result.descriptions,
          seo_titles: result.seoTitles,
          seo_descriptions: result.seoDescriptions,
          // Keep legacy single-lang fields in sync (PT)
          description: result.descriptions?.pt || description || null,
          seo_title: result.seoTitles?.pt || null,
          seo_description: result.seoDescriptions?.pt || null,
          seo_generated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", productId);
    }

    return NextResponse.json({
      descriptions: result.descriptions,
      seoTitles: result.seoTitles,
      seoDescriptions: result.seoDescriptions,
      saved: !!productId,
    });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
