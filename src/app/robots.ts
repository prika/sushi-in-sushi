import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pt",
          "/en",
          "/fr",
          "/de",
          "/it",
          "/es",
          "/pt/menu",
          "/en/menu",
          "/fr/menu",
          "/de/menu",
          "/it/menu",
          "/es/menu",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/cozinha",
          "/cozinha/*",
          "/waiter",
          "/waiter/*",
          "/mesa",
          "/mesa/*",
          "/login",
          "/demo",
          "/api",
          "/api/*",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
