"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const switchLocale = useCallback((newLocale: string) => {
    const segments = pathname.split("/").filter(Boolean);
    if (locales.some((l) => l.code === segments[0])) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    const newPath = `/${segments.join("/")}`;
    router.push(newPath);
    setIsOpen(false);
  }, [pathname, router]);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    const currentIdx = locales.findIndex((l) => l.code === locale);
    setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
    requestAnimationFrame(() => {
      optionRefs.current[currentIdx >= 0 ? currentIdx : 0]?.focus();
    });
  }, [locale]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const nextIdx = (focusedIndex + 1) % locales.length;
        setFocusedIndex(nextIdx);
        optionRefs.current[nextIdx]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevIdx = (focusedIndex - 1 + locales.length) % locales.length;
        setFocusedIndex(prevIdx);
        optionRefs.current[prevIdx]?.focus();
        break;
      }
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0) {
          switchLocale(locales[focusedIndex].code);
        }
        break;
      case "Home": {
        e.preventDefault();
        setFocusedIndex(0);
        optionRefs.current[0]?.focus();
        break;
      }
      case "End": {
        e.preventDefault();
        const lastIdx = locales.length - 1;
        setFocusedIndex(lastIdx);
        optionRefs.current[lastIdx]?.focus();
        break;
      }
    }
  }, [isOpen, focusedIndex, openDropdown, switchLocale]);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-base">{currentLocale.flag}</span>
        <span>{currentLocale.name}</span>
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 py-2 bg-card border border-white/10 rounded-lg shadow-xl min-w-[140px] z-50"
          role="listbox"
          aria-label="Select language"
        >
          {locales.map((loc, index) => (
            <button
              key={loc.code}
              ref={(el) => { optionRefs.current[index] = el; }}
              role="option"
              aria-selected={loc.code === locale}
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
