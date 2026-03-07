import { useCallback } from "react";

// ─── GTM DataLayer Event Types ──────────────────────────────────────────────

interface GTMEventMap {
  reservation_started: { location?: string };
  reservation_completed: {
    party_size?: number;
    location?: string;
    is_rodizio?: boolean;
  };
  menu_view: { locale?: string };
  product_click: { product_name: string; category?: string };
  qr_scan: { table_number: number | string; location?: string };
  order_placed: { items_count: number; is_rodizio?: boolean };
  login: { method?: string };
  signup: Record<string, never>;
}

type GTMEventName = keyof GTMEventMap;

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Hook to push events to the GTM dataLayer.
 * Only fires if GTM is loaded (window.dataLayer exists).
 *
 * Usage:
 *   const pushEvent = useGTMEvent();
 *   pushEvent("reservation_completed", { party_size: 4, location: "circunvalacao" });
 */
export function useGTMEvent() {
  const pushEvent = useCallback(
    <E extends GTMEventName>(event: E, params?: GTMEventMap[E]) => {
      if (typeof window === "undefined") return;
      window.dataLayer?.push({ event, ...params });
    },
    [],
  );

  return pushEvent;
}

/**
 * Standalone function for use outside React components (e.g., API route handlers, utils).
 */
export function pushGTMEvent<E extends GTMEventName>(
  event: E,
  params?: GTMEventMap[E],
) {
  if (typeof window === "undefined") return;
  window.dataLayer?.push({ event, ...params });
}
