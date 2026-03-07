"use client";

/**
 * Offline Fallback Page
 *
 * Served by the Service Worker when a navigation request fails
 * and the user has no network connectivity.
 */

import { useEffect, useState } from "react";

const OFFLINE_MESSAGES = {
  pt: {
    title: "Sem ligacao",
    subtitle: "Parece que estas offline. Verifica a tua ligacao a internet.",
    retry: "Tentar novamente",
    queued: "pedidos em fila",
  },
  en: {
    title: "No connection",
    subtitle: "You appear to be offline. Check your internet connection.",
    retry: "Try again",
    queued: "queued requests",
  },
};

export default function OfflinePage() {
  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Detect language from html lang or navigator
    const htmlLang = document.documentElement.lang;
    if (htmlLang && !htmlLang.startsWith("pt")) {
      setLang("en");
    }

    // Listen for online event to auto-redirect
    const handleOnline = () => {
      window.location.reload();
    };
    window.addEventListener("online", handleOnline);

    // Check offline queue count
    async function checkQueue() {
      try {
        const { getOfflineQueue } = await import(
          "@/infrastructure/offline/OfflineQueue"
        );
        const count = await getOfflineQueue().count();
        setQueueCount(count);
      } catch {
        // IndexedDB may not be available
      }
    }
    checkQueue();

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const t = OFFLINE_MESSAGES[lang];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      {/* Offline icon */}
      <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gold"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 className="text-2xl font-display text-white mb-2">{t.title}</h1>
      <p className="text-muted max-w-md mb-8">{t.subtitle}</p>

      {queueCount > 0 && (
        <div className="bg-zinc-900 border border-gold/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-gold">
            {queueCount} {t.queued}
          </p>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-gold text-black font-medium rounded-lg cursor-pointer hover:bg-gold/90 transition-colors"
      >
        {t.retry}
      </button>
    </div>
  );
}
