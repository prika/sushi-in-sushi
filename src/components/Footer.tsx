"use client";

import Image from "next/image";
import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useSiteSettings, useLocations } from "@/presentation/hooks";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("navigation");
  const locale = useLocale();
  const { settings } = useSiteSettings();
  const { locations } = useLocations();

  const footerLinks = [
    { href: "#menu", label: tNav("menu") },
    { href: "#sobre", label: tNav("about") },
    { href: "#localizacoes", label: tNav("locations") },
    { href: "#contacto", label: tNav("contact") },
  ];

  // Build social links dynamically — only render what's configured in site_settings
  // WhatsApp uses the first location's phone (ordered by name ascending from DB)
  const firstPhone = locations[0]?.phone?.replace(/\D/g, "");

  const socialLinks = [
    settings?.instagram_url && {
      name: "Instagram",
      url: settings.instagram_url,
      icon: Instagram,
    },
    settings?.facebook_url && {
      name: "Facebook",
      url: settings.facebook_url,
      icon: Facebook,
    },
    firstPhone && {
      name: "WhatsApp",
      url: `https://wa.me/${firstPhone}`,
      icon: MessageCircle,
    },
  ].filter(Boolean) as { name: string; url: string; icon: React.ElementType }[];

  return (
    <footer className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <a href={`/${locale}`} aria-label="Sushi in Sushi — Home" className="relative h-20 w-48 mb-4 block">
            <Image
              src="/logo.png"
              alt={settings?.brand_name ?? "Sushi in Sushi"}
              fill
              className="object-contain"
            />
          </a>
          <p className="text-gray-400 text-sm tracking-wider uppercase">
            {t("tagline")}
          </p>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="flex items-center justify-center gap-6 mb-12">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 flex items-center justify-center rounded-full border border-white/10 text-gray-400 hover:text-gold hover:border-gold transition-all duration-300"
                aria-label={social.name}
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        )}

        {/* Footer Navigation */}
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-8 mb-12">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-center text-gray-400 text-sm">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
