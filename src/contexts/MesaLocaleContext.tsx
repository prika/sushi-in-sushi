"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// Import all translations
import pt from "@/messages/pt.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import de from "@/messages/de.json";
import it from "@/messages/it.json";
import es from "@/messages/es.json";

// =============================================
// TYPES
// =============================================

type Locale = "pt" | "en" | "fr" | "de" | "it" | "es";

type Messages = typeof pt;

interface MesaLocaleContextType {
  locale: Locale;
  setLocale: (_locale: Locale) => void;
  t: (_key: string, _params?: Record<string, string | number>) => string;
  messages: Messages;
}

// =============================================
// TRANSLATIONS MAP
// =============================================

const translations: Record<Locale, Messages> = {
  pt,
  en,
  fr,
  de,
  it,
  es,
};

export const locales: { code: Locale; name: string; flag: string }[] = [
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
];

// =============================================
// CONTEXT
// =============================================

const MesaLocaleContext = createContext<MesaLocaleContextType | undefined>(
  undefined
);

const STORAGE_KEY = "sushi-mesa-locale";

// =============================================
// PROVIDER
// =============================================

interface MesaLocaleProviderProps {
  children: ReactNode;
}

export function MesaLocaleProvider({ children }: MesaLocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("pt");
  const [mounted, setMounted] = useState(false);

  // Load locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (translations[browserLang]) {
        setLocaleState(browserLang);
      }
    }
    setMounted(true);
  }, []);

  // Save locale to localStorage when it changes
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const messages = translations[locale];
      const keys = key.split(".");

      // Navigate through nested keys
      let value: unknown = messages;
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Key not found, return the key itself
          return key;
        }
      }

      if (typeof value !== "string") {
        return key;
      }

      // Replace parameters like {count} or {name}
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
          return params[paramKey]?.toString() ?? `{${paramKey}}`;
        });
      }

      return value;
    },
    [locale]
  );

  const messages = translations[locale];

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <MesaLocaleContext.Provider
        value={{
          locale: "pt",
          setLocale,
          t: (key) => key,
          messages: translations.pt,
        }}
      >
        {children}
      </MesaLocaleContext.Provider>
    );
  }

  return (
    <MesaLocaleContext.Provider value={{ locale, setLocale, t, messages }}>
      {children}
    </MesaLocaleContext.Provider>
  );
}

// =============================================
// HOOK
// =============================================

export function useMesaLocale(): MesaLocaleContextType {
  const context = useContext(MesaLocaleContext);
  if (context === undefined) {
    throw new Error("useMesaLocale must be used within a MesaLocaleProvider");
  }
  return context;
}
