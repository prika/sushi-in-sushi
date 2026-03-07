"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistrar — Registers the Service Worker on mount.
 *
 * This component uses useEffect (acceptable: external browser API setup/teardown).
 * Place it once in the root layout. Does nothing on the server or in unsupported browsers.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV === "development"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // eslint-disable-next-line no-console
        console.info("[SW] Registered:", registration.scope);
      })
      .catch((error) => {
        console.error("[SW] Registration failed:", error);
      });
  }, []);

  return null;
}
