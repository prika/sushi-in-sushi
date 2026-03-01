import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

interface TranslateRequest {
  /** Single ingredient ID */
  ingredientId?: string;
  /** Batch: array of ingredient IDs */
  ingredientIds?: string[];
}

const SYSTEM_PROMPT = `You are a professional translator specializing in culinary and food terminology for an upscale Japanese fusion restaurant.

Translate ingredient names accurately into 6 languages: Português Europeu (pt), English (en), Français (fr), Deutsch (de), Italiano (it), Español (es).

Guidelines:
- Use the correct culinary term in each language (not literal translations)
- For Japanese ingredients (e.g., wasabi, nori, edamame), keep the original term if commonly used in that language
- For Portuguese, use European Portuguese
- For Spanish, use Castilian Spanish
- Keep names concise (1-3 words)

Respond in valid JSON. For a single ingredient:
{"translations": {"pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..."}}

For multiple ingredients, return an object keyed by the original name:
{"results": {"salmão": {"pt": "salmão", "en": "salmon", ...}, "atum": {"pt": "atum", "en": "tuna", ...}}}`;

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

    const body: TranslateRequest = await request.json();
    const ids = body.ingredientIds || (body.ingredientId ? [body.ingredientId] : []);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "ingredientId or ingredientIds required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch ingredients
    const { data: rawIngredients, error: fetchError } = await supabase
      .from("ingredients")
      .select("id, name")
      .in("id", ids);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!rawIngredients || rawIngredients.length === 0) {
      return NextResponse.json({ error: "No ingredients found" }, { status: 404 });
    }

    const ingredients = rawIngredients as Array<{ id: string; name: string }>;
    const isBatch = ingredients.length > 1;
    const names = ingredients.map((i) => i.name);

    const userPrompt = isBatch
      ? `Translate these ingredient names:\n${names.map((n: string, idx: number) => `${idx + 1}. ${n}`).join("\n")}`
      : `Translate this ingredient name: ${names[0]}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build update map: ingredientId → translations
    const updates: Array<{ id: string; name_translations: Record<string, string> }> = [];

    if (isBatch && parsed.results) {
      for (const ing of ingredients) {
        const translations = parsed.results[ing.name];
        if (translations) {
          updates.push({ id: ing.id, name_translations: translations });
        }
      }
    } else if (parsed.translations) {
      updates.push({ id: ingredients[0].id, name_translations: parsed.translations });
    }

    // Save to database
    for (const upd of updates) {
      await supabase
        .from("ingredients")
        .update({ name_translations: upd.name_translations } as Record<string, unknown>)
        .eq("id", upd.id);
    }

    return NextResponse.json({
      translated: updates.length,
      updates: updates.map((u) => ({ id: u.id, nameTranslations: u.name_translations })),
    });
  } catch (error) {
    console.error("Error translating ingredients:", error);
    return NextResponse.json(
      { error: "Failed to translate ingredients" },
      { status: 500 }
    );
  }
}
