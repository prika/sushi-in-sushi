import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config/constants";

const locales = ["pt", "en", "fr", "de", "it", "es"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Landing page for each locale
  for (const locale of locales) {
    entries.push({
      url: `${APP_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${APP_URL}/${l}`])
        ),
      },
    });
  }

  // Menu page for each locale
  for (const locale of locales) {
    entries.push({
      url: `${APP_URL}/${locale}/menu`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${APP_URL}/${l}/menu`])
        ),
      },
    });
  }

  return entries;
}
