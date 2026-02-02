"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const locales = [
  { code: "pt", name: "PT", fullName: "Português", flag: "🇵🇹" },
  { code: "en", name: "EN", fullName: "English", flag: "🇬🇧" },
  { code: "fr", name: "FR", fullName: "Français", flag: "🇫🇷" },
  { code: "de", name: "DE", fullName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "IT", fullName: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "ES", fullName: "Español", flag: "🇪🇸" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLocale = (newLocale: string) => {
    // Remove the current locale from pathname and add the new one
    const segments = pathname.split("/").filter(Boolean);

    // Check if first segment is a locale
    if (locales.some((l) => l.code === segments[0])) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }

    const newPath = `/${segments.join("/")}`;
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
        aria-label="Select language"
      >
        <span className="text-base">{currentLocale.flag}</span>
        <span>{currentLocale.name}</span>
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 py-2 bg-card border border-white/10 rounded-lg shadow-xl min-w-[140px] z-50">
          {locales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => switchLocale(loc.code)}
              className={cn(
                "w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-3",
                loc.code === locale
                  ? "text-gold"
                  : "text-muted hover:text-white"
              )}
            >
              <span className="text-base">{loc.flag}</span>
              <span className="flex-1">{loc.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
