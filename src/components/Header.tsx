"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Menu, X, User, LogOut, CalendarDays } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { useSiteSettings } from "@/presentation/hooks/useSiteSettings";

const locales = [
  { code: "pt", flag: "🇵🇹" },
  { code: "en", flag: "🇬🇧" },
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "it", flag: "🇮🇹" },
  { code: "es", flag: "🇪🇸" },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function Header() {
  const t = useTranslations("navigation");
  const tA11y = useTranslations("accessibility");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const logoUrl = settings?.logo_url || "/logo.png";
  const brandName = settings?.brand_name ?? "";
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if customer is authenticated
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const fetchCustomerName = async (userId: string) => {
      const { data, error } = await supabase
        .from("customers")
        .select("name")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (!error && data?.name && mounted) {
        setCustomerName(data.name.split(" ")[0]);
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session && mounted) {
        fetchCustomerName(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setCustomerName(null);
      } else if (event === "SIGNED_IN" && session) {
        fetchCustomerName(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const switchLocale = useCallback((newLocale: string) => {
    const segments = pathname.split("/").filter(Boolean);
    if (locales.some((l) => l.code === segments[0])) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    router.push(`/${segments.join("/")}`);
  }, [pathname, router]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error);
      return;
    }
    setCustomerName(null);
    router.push(`/${locale}`);
  }, [locale, router]);

  const leftLinks = [
    { href: `/${locale}/menu`, label: t("menu") },
    { href: `/${locale}/#sobre`, label: t("about") },
  ];

  const rightLinks = [
    { href: `/${locale}/#localizacoes`, label: t("locations") },
    { href: `/${locale}/#contacto`, label: t("contact") },
  ];

  const allLinks = [...leftLinks, ...rightLinks];

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  // Escape key + focus trap for overlay menu
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        menuTriggerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  // Scroll progress: 0 (top) → 1 (fully collapsed) over 200px
  const progress = Math.min(scrollY / 200, 1);
  const isScrolled = progress > 0.15;

  // Main nav logo: shrinks then fades out
  const dLogoH = lerp(112, 40, progress);
  const dLogoW = lerp(320, 120, progress);
  const mainNavOpacity = Math.max(1 - progress * 1.5, 0);
  const mainNavVisible = mainNavOpacity > 0.01;

  // Links fade out in first 40% of scroll
  const linksOpacity = Math.max(1 - progress * 2.5, 0);
  const linksVisible = linksOpacity > 0.01;

  // Top bar elements: hamburger + logo fade in, language fades out
  const topBarExtrasOpacity = Math.max((progress - 0.3) / 0.5, 0);
  const langSwitcherOpacity = Math.max(1 - progress * 3, 0);

  // Mobile logo
  const mLogoH = lerp(48, 36, progress);
  const mLogoW = lerp(160, 120, progress);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          isScrolled
            ? "bg-background/80 backdrop-blur-md border-b border-white/5"
            : "bg-transparent"
        )}
      >
        {/* Skip navigation link */}
        <a href="#main-content" className="skip-link">
          {tA11y("skipToContent")}
        </a>

        {/* ===== Top Utility Bar — Desktop ===== */}
        <div className="hidden md:block border-b border-white/5">
          <div
            className="max-w-7xl mx-auto px-6 flex items-center justify-between relative"
            style={{ paddingTop: lerp(4, 20, progress), paddingBottom: lerp(4, 20, progress) }}
          >
            <div className="flex items-center gap-3">
              {/* Hamburger — fades in on scroll */}
              <button
                className="flex items-center gap-1.5 text-white p-1 -ml-1"
                onClick={() => setIsMenuOpen(true)}
                aria-label={tA11y("openMenu")}
                tabIndex={topBarExtrasOpacity > 0.5 ? 0 : -1}
                style={{
                  opacity: topBarExtrasOpacity,
                  width: topBarExtrasOpacity > 0.01 ? "auto" : 0,
                  overflow: "hidden",
                  pointerEvents: topBarExtrasOpacity > 0.5 ? "auto" : "none",
                }}
              >
                <Menu size={18} aria-hidden="true" />
                <span className="text-xs font-medium tracking-wider uppercase">{t("discover")}</span>
              </button>
              {/* LanguageSwitcher — fades out on scroll (moves to overlay) */}
              <div
                style={{
                  opacity: langSwitcherOpacity,
                  width: langSwitcherOpacity > 0.01 ? "auto" : 0,
                  overflow: "hidden",
                  pointerEvents: langSwitcherOpacity > 0.5 ? "auto" : "none",
                }}
              >
                <LanguageSwitcher />
              </div>
            </div>

            {/* Center Logo — fades into top bar on scroll */}
            <a
              href={`/${locale}`}
              aria-label={`${brandName} — Home`}
              className="absolute left-1/2 -translate-x-1/2 h-[85px] w-[320px]"
              style={{
                opacity: topBarExtrasOpacity,
                pointerEvents: topBarExtrasOpacity > 0.5 ? "auto" : "none",
              }}
            >
              <Image
                src={logoUrl}
                alt={brandName}
                fill
                className="object-contain"
                priority
              />
            </a>

            <div className="flex items-center gap-5">
              {customerName ? (
                <div className="flex items-center gap-3">
                  <a
                    href={`/${locale}/conta`}
                    className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted hover:text-white transition-colors duration-200"
                  >
                    <User size={13} aria-hidden="true" />
                    {t("welcome", { name: customerName })}
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs font-medium tracking-wider text-muted hover:text-red-400 transition-colors duration-200"
                  >
                    <LogOut size={12} aria-hidden="true" />
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <a
                  href={`/${locale}/entrar`}
                  className="flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
                >
                  <User size={13} aria-hidden="true" />
                  {t("login")}
                </a>
              )}
              <a
                href={`/${locale}/reservar`}
                className="flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase text-gold hover:text-gold-light transition-colors duration-200"
              >
                <CalendarDays size={13} aria-hidden="true" />
                {t("book")}
              </a>
            </div>
          </div>
        </div>

        {/* ===== Main Nav ===== */}
        <nav aria-label="Main" className="max-w-7xl mx-auto px-6">
          {/* Desktop: links around logo — collapses on scroll */}
          <div
            className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center"
            style={{
              height: mainNavVisible ? "auto" : 0,
              opacity: mainNavOpacity,
              overflow: mainNavVisible ? "visible" : "hidden",
              paddingTop: mainNavVisible ? lerp(4, 0, progress) : 0,
              paddingBottom: mainNavVisible ? lerp(4, 0, progress) : 0,
            }}
          >
            {/* Left Links */}
            <div
              className="flex items-center justify-end gap-8 pr-12"
              style={{
                opacity: linksOpacity,
                pointerEvents: linksVisible ? "auto" : "none",
              }}
            >
              {leftLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Center Logo — scroll-driven resize */}
            <a
              href={`/${locale}`}
              aria-label={`${brandName} — Home`}
              className="relative"
              style={{ height: dLogoH, width: dLogoW }}
            >
              <Image
                src={logoUrl}
                alt={brandName}
                fill
                className="object-contain"
                priority
              />
            </a>

            {/* Right Links */}
            <div
              className="flex items-center justify-start gap-8 pl-12"
              style={{
                opacity: linksOpacity,
                pointerEvents: linksVisible ? "auto" : "none",
              }}
            >
              {rightLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile: logo + controls */}
          <div className="md:hidden flex items-center justify-between py-2">
            <a
              href={`/${locale}`}
              aria-label={`${brandName} — Home`}
              className="relative"
              style={{ height: mLogoH, width: mLogoW }}
            >
              <Image
                src={logoUrl}
                alt={brandName}
                fill
                className="object-contain"
                priority
              />
            </a>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                ref={menuTriggerRef}
                className="text-white p-2"
                onClick={() => setIsMenuOpen(true)}
                aria-label={tA11y("openMenu")}
              >
                <Menu size={24} aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* ===== Full-screen Overlay Menu ===== */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col transition-opacity duration-300",
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!isMenuOpen}
      >
        {/* Close button */}
        <div className="relative z-10 flex justify-end px-6 py-6">
          <button
            className="text-white p-2 hover:text-gold transition-colors"
            onClick={() => setIsMenuOpen(false)}
            aria-label={tA11y("closeMenu")}
          >
            <X size={28} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links + language flags */}
        <nav
          aria-label="Menu"
          className="flex-1 flex flex-col items-center justify-center gap-8 md:gap-10"
        >
          {allLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="text-3xl md:text-5xl font-display font-light tracking-wider uppercase text-white/80 hover:text-gold transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}

          {/* Language flags — inline row */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/10">
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => { switchLocale(loc.code); setIsMenuOpen(false); }}
                className={cn(
                  "text-2xl p-1.5 rounded-md transition-all duration-200",
                  loc.code === locale
                    ? "bg-white/10 scale-110"
                    : "opacity-60 hover:opacity-100 hover:bg-white/5"
                )}
                aria-label={loc.code.toUpperCase()}
              >
                {loc.flag}
              </button>
            ))}
          </div>

          {/* Mobile only: login + book */}
          <div className="md:hidden flex flex-col items-center gap-6 mt-4">
            {customerName ? (
              <>
                <a
                  href={`/${locale}/conta`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 text-lg font-medium tracking-wider text-muted hover:text-white transition-colors duration-200"
                >
                  <User size={18} aria-hidden="true" />
                  {t("welcome", { name: customerName })}
                </a>
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 text-lg font-medium tracking-wider text-muted hover:text-red-400 transition-colors duration-200"
                >
                  <LogOut size={16} aria-hidden="true" />
                  {t("logout")}
                </button>
              </>
            ) : (
              <a
                href={`/${locale}/entrar`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 text-lg font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
              >
                <User size={18} aria-hidden="true" />
                {t("login")}
              </a>
            )}
            <a
              href={`/${locale}/reservar`}
              onClick={() => setIsMenuOpen(false)}
              className="px-8 py-3 border border-gold text-gold text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
            >
              {t("book")}
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
