"use client";

import Image from "next/image";
import { Instagram, Facebook, MessageCircle } from "lucide-react";

const socialLinks = [
  {
    name: "Instagram",
    url: "https://instagram.com/sushinsushipt",
    icon: Instagram,
  },
  {
    name: "Facebook",
    url: "https://facebook.com/sushiinsushi",
    icon: Facebook,
  },
  {
    name: "WhatsApp",
    url: "https://wa.me/351912348545",
    icon: MessageCircle,
  },
];

const footerLinks = [
  { href: "#menu", label: "Menu" },
  { href: "#sobre", label: "Sobre" },
  { href: "#localizacoes", label: "Localizações" },
  { href: "#contacto", label: "Contactos" },
];

export function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <div className="relative h-20 w-48 mb-4">
            <Image
              src="/logo.png"
              alt="Sushi in Sushi"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-muted text-sm tracking-wider uppercase">
            Fusion Food • Porto
          </p>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-6 mb-12">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/10 text-muted hover:text-gold hover:border-gold transition-all duration-300"
              aria-label={social.name}
            >
              <social.icon size={20} />
            </a>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Sushi in Sushi. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
