import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { ALL_ALLERGENS } from "@/lib/constants/allergens";

const VALID_ALLERGEN_IDS = ALL_ALLERGENS.map((a) => a.id);

const SYSTEM_PROMPT = `You are a food safety expert specializing in allergen detection for restaurants.

Your task is to identify which allergens are present in each food ingredient.

Allergens to detect:
- gluten: Cereals containing gluten (wheat, rye, barley, oats, spelt, kamut)
- crustaceans: Crustaceans and products thereof (shrimp, crab, lobster)
- eggs: Eggs and products thereof
- fish: Fish and products thereof
- peanuts: Peanuts and products thereof
- soybeans: Soybeans and products thereof (soy sauce, tofu, edamame)
- milk: Milk and products thereof (lactose, butter, cheese, cream)
- nuts: Tree nuts (almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia)
- celery: Celery and products thereof
- mustard: Mustard and products thereof
- sesame: Sesame seeds and products thereof
- sulphites: Sulphur dioxide and sulphites (>10mg/kg, common in wine, dried fruits)
- lupin: Lupin and products thereof
- molluscs: Molluscs and products thereof (squid, octopus, clams, mussels, oysters)
- wheat: Wheat specifically (beyond gluten — for wheat-specific allergies)
- shellfish: Shellfish in general (broader than crustaceans — includes shrimp, crab, lobster, crayfish)
- buckwheat: Buckwheat / soba noodles
- gelatin: Gelatin and products thereof (gummy, jelly, some sauces)
- banana: Banana and products thereof
- kiwi: Kiwi and products thereof
- peach: Peach and products thereof
- apple: Apple and products thereof
- raspberry: Raspberry and products thereof
- strawberry: Strawberry and products thereof
- passionfruit: Passion fruit and products thereof

Guidelines:
- Be accurate — only mark allergens that are genuinely present or commonly derived from that ingredient
- Consider common derivatives (e.g., soy sauce contains soybeans AND often gluten from wheat)
- Japanese/Asian ingredients: wasabi, nori, rice, ginger are typically allergen-free
- Water, salt, sugar, oils (unless specified) are allergen-free
- If unsure, err on the side of caution (include the allergen)
- Use ONLY the exact allergen IDs listed above

Respond in valid JSON:
{"ingredientName1": ["allergen1", "allergen2"], "ingredientName2": [], "water": []}`;

/**
 * POST /api/ingredients/detect-allergens
 * Uses AI to detect EU 14 allergens for ingredients
 *
 * Body: { ingredientIds?: string[] }
 * If no IDs provided, processes all ingredients with empty allergens
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const body = await request.json();
    const { ingredientIds } = body;

    const supabase = createAdminClient();

    // Fetch ingredients
    let query = supabase.from("ingredients").select("id, name");

    if (ingredientIds && ingredientIds.length > 0) {
      query = query.in("id", ingredientIds);
    }

    const { data: rawIngredients, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!rawIngredients || rawIngredients.length === 0) {
      return NextResponse.json({ error: "No ingredients found" }, { status: 404 });
    }

    const ingredients = rawIngredients as Array<{ id: string; name: string }>;

    // If no specific IDs, filter to only those without allergens
    let toProcess = ingredients;
    if (!ingredientIds) {
      // Fetch allergens data (column not in generated types)
      const { data: allergenData } = await supabase
        .from("ingredients")
        .select("id, allergens")
        .in("id", ingredients.map((i) => i.id)) as unknown as {
          data: Array<{ id: string; allergens?: string[] | null }> | null;
        };

      const hasAllergens = new Set(
        (allergenData ?? [])
          .filter((d) => d.allergens && d.allergens.length > 0)
          .map((d) => d.id)
      );
      toProcess = ingredients.filter((i) => !hasAllergens.has(i.id));
    }

    if (toProcess.length === 0) {
      return NextResponse.json({
        message: "All ingredients already have allergens detected",
        detected: 0,
      });
    }

    const names = toProcess.map((i) => i.name);

    const userPrompt = `Identify allergens for these ingredients:\n${names.map((n, idx) => `${idx + 1}. ${n}`).join("\n")}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
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

    let parsed: Record<string, string[]>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, string[]>;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate and save results
    const results: Array<{ id: string; name: string; allergens: string[] }> = [];
    const errors: Array<{ id: string; name: string; error: string }> = [];

    // Build case-insensitive lookup for AI response keys
    const parsedLower: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      parsedLower[key.toLowerCase().trim()] = value;
    }

    for (const ing of toProcess) {
      const detected = parsed[ing.name] ?? parsedLower[ing.name.toLowerCase().trim()];
      const allergens = detected
        ? detected.filter((a) => VALID_ALLERGEN_IDS.includes(a))
        : [];

      const { error: updateError } = await supabase
        .from("ingredients")
        .update({ allergens } as Record<string, unknown>)
        .eq("id", ing.id);

      if (updateError) {
        errors.push({ id: ing.id, name: ing.name, error: updateError.message });
      } else {
        results.push({ id: ing.id, name: ing.name, allergens });
      }
    }

    return NextResponse.json({
      detected: results.length,
      results,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error("Error detecting allergens:", error);
    return NextResponse.json(
      { error: "Failed to detect allergens" },
      { status: 500 }
    );
  }
}
