"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ReservationForm } from "./ReservationForm";

export function Header() {
  const t = useTranslations("navigation");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);

  const leftLinks = [
    { href: "/menu", label: t("menu") },
    { href: "#sobre", label: t("about") },
  ];

  const rightLinks = [
    { href: "#localizacoes", label: t("locations") },
    { href: "#contacto", label: t("contact") },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4">
        {/* Desktop Navigation */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left Links */}
          <div className="flex items-center justify-end gap-8 pr-12">
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

          {/* Center Logo */}
          <a href="#" className="relative h-24 w-64">
            <Image
              src="/logo.png"
              alt="Sushi in Sushi"
              fill
              className="object-contain"
              priority
            />
          </a>

          {/* Right Links */}
          <div className="flex items-center justify-between pl-12">
            <div className="flex items-center gap-8">
              {rightLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => setShowReservationModal(true)}
              className="px-6 py-2 border border-gold text-gold text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
            >
              {t("book")}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-between">
          <a href="#" className="relative h-14 w-44">
            <Image
              src="/logo.png"
              alt="Sushi in Sushi"
              fill
              className="object-contain"
              priority
            />
          </a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              className="text-white p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-b border-white/5"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {[...leftLinks, ...rightLinks].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowReservationModal(true);
                }}
                className="mt-4 px-6 py-3 border border-gold text-gold text-center text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
              >
                {t("book")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reservation Modal */}
      {showReservationModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowReservationModal(false)}
        >
          <div
            className="bg-background border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-white/10 z-10">
              <h2 className="text-xl font-semibold text-white">
                Reservar Mesa
              </h2>
              <button
                onClick={() => setShowReservationModal(false)}
                className="p-2 text-muted hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <ReservationForm />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
