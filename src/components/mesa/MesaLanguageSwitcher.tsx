"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useMesaLocale, locales } from "@/contexts/MesaLocaleContext";
import { cn } from "@/lib/utils";

export function MesaLanguageSwitcher() {
  const { locale, setLocale } = useMesaLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 bg-white/5 rounded-lg"
        aria-label="Select language"
      >
        <span className="text-base">{currentLocale.flag}</span>
        <span className="hidden sm:inline">{currentLocale.name}</span>
        <ChevronDown
          size={14}
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl min-w-[160px] z-50">
          {locales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => {
                setLocale(loc.code);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-3",
                loc.code === locale
                  ? "text-[#D4AF37]"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <span className="text-lg">{loc.flag}</span>
              <span className="flex-1">{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
