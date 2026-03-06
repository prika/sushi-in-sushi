"use client";

import { useState, useEffect } from "react";

export interface SiteSettings {
  brand_name: string;
  description: string | null;
  price_range: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_reviews_url: string | null;
  tripadvisor_url: string | null;
  thefork_url: string | null;
  zomato_url: string | null;
  google_maps_url: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  apple_touch_icon_url: string | null;
  og_image_url: string | null;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setError(null);
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setSettings(data);
      })
      .catch((err) => {
        console.error("useSiteSettings fetch failed:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { settings, isLoading, error };
}
