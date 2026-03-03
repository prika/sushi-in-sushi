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
          "/pt/reservar",
          "/en/reservar",
          "/fr/reservar",
          "/de/reservar",
          "/it/reservar",
          "/es/reservar",
          "/pt/equipa",
          "/en/equipa",
          "/fr/equipa",
          "/de/equipa",
          "/it/equipa",
          "/es/equipa",
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
