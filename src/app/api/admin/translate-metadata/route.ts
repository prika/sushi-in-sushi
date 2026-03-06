import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";


/**
 * POST /api/admin/translate-metadata
 * Uses AI to translate/generate SEO metadata in all 6 locales.
 *
 * Body: { field: string, sourceLocale?: string, mode?: "translate" | "generate", context?: string }
 * - field: which metadata field to translate/generate
 * - sourceLocale: locale to use as source for translation (default: "pt")
 * - mode: "translate" (from sourceLocale to others) or "generate" (AI creates optimal content for all locales)
 * - context: extra context for the AI
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { field, sourceLocale = "pt", mode = "translate", context } = body;

    // Fetch current data
    const supabase = createAdminClient();
    // biome-ignore lint/suspicious/noExplicitAny: site_settings not in generated types yet
    const { data: settings, error } = await (supabase as any)
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const brandName = settings.brand_name ?? "";
    const brandDescription = settings.description ?? "";

    const anthropic = new Anthropic({ apiKey });

    if (field === "page_meta") {
      const pageMeta = settings.page_meta ?? {};
      const result = await translatePageMeta(anthropic, pageMeta, brandName, brandDescription, sourceLocale, mode);
      return NextResponse.json({ page_meta: result });
    }

    // Single field translation or generation
    const currentData = settings[field];

    if (mode === "translate") {
      const sourceText = currentData?.[sourceLocale] ?? "";
      if (!sourceText && field !== "meta_keywords") {
        return NextResponse.json(
          { error: `Preenche primeiro o campo em ${sourceLocale.toUpperCase()} para traduzir.` },
          { status: 400 },
        );
      }
    }

    const result = await translateField(anthropic, field, currentData, brandName, brandDescription, sourceLocale, mode, context);
    return NextResponse.json({ [field]: result });
  } catch (err) {
    console.error("Error translating metadata:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao traduzir" },
      { status: 500 },
    );
  }
}

async function translateField(
  anthropic: Anthropic,
  field: string,
  currentData: Record<string, unknown> | null,
  brandName: string,
  brandDescription: string,
  sourceLocale: string,
  mode: string,
  context?: string,
): Promise<Record<string, string | string[]>> {
  const fieldLabels: Record<string, string> = {
    descriptions: "brand descriptions for a restaurant (2-3 sentences, professional tone)",
    meta_titles: "SEO page titles (under 60 characters each)",
    meta_descriptions: "SEO meta descriptions (under 160 characters each)",
    meta_og_descriptions: "Open Graph descriptions for social sharing (under 160 characters each)",
    meta_keywords: "SEO keywords (5-10 comma-separated keywords per language)",
  };

  const sourceText = field === "meta_keywords"
    ? (Array.isArray(currentData?.[sourceLocale]) ? (currentData[sourceLocale] as string[]).join(", ") : "")
    : (currentData?.[sourceLocale] as string ?? "");

  const isGenerate = mode === "generate";

  const system = isGenerate
    ? `You are an expert SEO copywriter for ${brandName}, an upscale Japanese fusion restaurant in Porto, Portugal.
${brandDescription ? `Restaurant description: ${brandDescription}` : ""}

Generate the best possible ${fieldLabels[field] ?? field} optimized for SEO and conversions, in all 6 languages.
Languages: Portugues Europeu (pt), English (en), Francais (fr), Deutsch (de), Italiano (it), Espanol (es)

Guidelines:
- Create original, compelling copy — do NOT just translate, craft the best version for each language and culture
- For Portuguese, use European Portuguese (not Brazilian)
- For Spanish, use Castilian Spanish
- Maximize SEO impact: natural keywords, compelling CTAs, emotional triggers
- Keep the tone professional, appetizing, and luxurious
${field === "meta_keywords" ? "- Return keywords as arrays of strings per locale, targeting local search intent per language" : "- Keep within character limits"}

Respond in valid JSON: { "pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..." }
${field === "meta_keywords" ? 'Each value should be an array of strings: { "pt": ["keyword1", "keyword2"], ... }' : ""}`
    : `You are a professional SEO translator for ${brandName}, an upscale Japanese fusion restaurant in Porto, Portugal.
${brandDescription ? `Restaurant description: ${brandDescription}` : ""}

Translate ${fieldLabels[field] ?? field} from ${sourceLocale.toUpperCase()} to all other languages.
Languages: Portugues Europeu (pt), English (en), Francais (fr), Deutsch (de), Italiano (it), Espanol (es)

Guidelines:
- For Portuguese, use European Portuguese (not Brazilian)
- For Spanish, use Castilian Spanish
- Maintain SEO best practices (natural keywords, compelling copy)
- Keep the tone professional and appetizing
- Keep the source locale text exactly as provided
${field === "meta_keywords" ? "- Return keywords as arrays of strings per locale" : "- Keep within character limits"}

Respond in valid JSON: { "pt": "...", "en": "...", "fr": "...", "de": "...", "it": "...", "es": "..." }
${field === "meta_keywords" ? 'Each value should be an array of strings: { "pt": ["keyword1", "keyword2"], ... }' : ""}`;

  const userPrompt = isGenerate
    ? `Generate the best ${fieldLabels[field] ?? field} for a Japanese fusion sushi restaurant in Porto called "${brandName}".${context ? `\nContext: ${context}` : ""}\n\nGenerate optimized content for all 6 languages.`
    : `Source text (${sourceLocale}): "${sourceText}"${context ? `\nContext: ${context}` : ""}\n\nTranslate to all 6 languages. Keep the ${sourceLocale} text exactly as-is.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  return JSON.parse(jsonMatch[0]);
}

async function translatePageMeta(
  anthropic: Anthropic,
  pageMeta: Record<string, { titles?: Record<string, string>; descriptions?: Record<string, string> }>,
  brandName: string,
  brandDescription: string,
  sourceLocale: string,
  mode: string,
): Promise<Record<string, { titles: Record<string, string>; descriptions: Record<string, string> }>> {
  const isGenerate = mode === "generate";
  const pageNames = ["menu", "reservar", "equipa"];
  const pageLabels: Record<string, string> = { menu: "Menu / Food Menu", reservar: "Reservations / Book a Table", equipa: "Team / Our Staff" };

  if (!isGenerate) {
    const pages = Object.entries(pageMeta).filter(([, v]) => v?.titles?.[sourceLocale] || v?.descriptions?.[sourceLocale]);
    if (pages.length === 0) {
      throw new Error(`Preenche primeiro os campos em ${sourceLocale.toUpperCase()} para traduzir.`);
    }
  }

  const system = isGenerate
    ? `You are an expert SEO copywriter for ${brandName}, an upscale Japanese fusion restaurant in Porto, Portugal.
${brandDescription ? `Restaurant description: ${brandDescription}` : ""}

Generate the best SEO page titles and descriptions for a restaurant website in all 6 languages.
Pages: ${pageNames.map((p) => `${p} (${pageLabels[p]})`).join(", ")}
Languages: Portugues Europeu (pt), English (en), Francais (fr), Deutsch (de), Italiano (it), Espanol (es)

Guidelines:
- Page titles: under 60 characters, compelling, include brand name
- Page descriptions: under 160 characters, SEO-optimized meta descriptions
- Create original content per language, not just translations
- European Portuguese, Castilian Spanish
- Professional, appetizing, luxurious tone

Respond in valid JSON:
{
  "pageName": { "titles": {"pt":"...","en":"...",...}, "descriptions": {"pt":"...","en":"...",...} },
  ...
}`
    : `You are a professional SEO translator for ${brandName}, an upscale Japanese fusion restaurant in Porto, Portugal.
${brandDescription ? `Restaurant description: ${brandDescription}` : ""}

Translate page titles and descriptions for a restaurant website from ${sourceLocale.toUpperCase()} to all 6 languages.
Languages: Portugues Europeu (pt), English (en), Francais (fr), Deutsch (de), Italiano (it), Espanol (es)

Guidelines:
- Page titles: under 60 characters
- Page descriptions: under 160 characters (SEO meta descriptions)
- European Portuguese, Castilian Spanish
- Professional, appetizing tone
- Keep the source locale text exactly as provided

Respond in valid JSON matching this structure:
{
  "pageName": { "titles": {"pt":"...","en":"...",...}, "descriptions": {"pt":"...","en":"...",...} },
  ...
}`;

  const userPrompt = isGenerate
    ? `Generate optimized SEO titles and descriptions for these restaurant pages: ${pageNames.join(", ")}.\nGenerate for all 6 languages.`
    : (() => {
        const pages = Object.entries(pageMeta).filter(([, v]) => v?.titles?.[sourceLocale] || v?.descriptions?.[sourceLocale]);
        const sourceData = pages.map(([name, data]) => ({
          page: name,
          title: data.titles?.[sourceLocale] ?? "",
          description: data.descriptions?.[sourceLocale] ?? "",
        }));
        return `Source texts (${sourceLocale}):\n${JSON.stringify(sourceData, null, 2)}\n\nTranslate all pages to all 6 languages. Keep ${sourceLocale} text as-is.`;
      })();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  return JSON.parse(jsonMatch[0]);
}
