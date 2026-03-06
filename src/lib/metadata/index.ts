import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

type LocaleMap = Record<string, string>;
type KeywordsMap = Record<string, string[]>;

export interface PageMeta {
  titles?: LocaleMap;
  descriptions?: LocaleMap;
}

export interface SiteMetadata {
  brandName: string;
  description: string;
  descriptions: LocaleMap | null;
  metaTitles: LocaleMap | null;
  metaDescriptions: LocaleMap | null;
  metaOgDescriptions: LocaleMap | null;
  metaKeywords: KeywordsMap | null;
  pageMeta: Record<string, PageMeta> | null;
  logoUrl: string;
  faviconUrl: string;
  appleTouchIconUrl: string;
  ogImageUrl: string;
}

// ─── Fetcher ────────────────────────────────────────────────────────────────
// All required fields (brand_name, description, logo_url, favicon_url,
// apple_touch_icon_url, og_image_url) are NOT NULL with DEFAULTs in the DB.

async function fetchMetadata(): Promise<SiteMetadata> {
  const supabase = createAdminClient();
  // biome-ignore lint/suspicious/noExplicitAny: site_settings not in generated types yet
  const { data, error } = await (supabase as any)
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw new Error(`Failed to fetch site_settings: ${error.message}`);

  return {
    brandName: data.brand_name,
    description: data.description,
    descriptions: data.descriptions ?? null,
    metaTitles: data.meta_titles ?? null,
    metaDescriptions: data.meta_descriptions ?? null,
    metaOgDescriptions: data.meta_og_descriptions ?? null,
    metaKeywords: data.meta_keywords ?? null,
    pageMeta: data.page_meta ?? null,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    appleTouchIconUrl: data.apple_touch_icon_url,
    ogImageUrl: data.og_image_url,
  };
}

export const getSiteMetadata = unstable_cache(
  fetchMetadata,
  ["site-metadata"],
  { revalidate: 86400, tags: ["site-metadata"] },
);
