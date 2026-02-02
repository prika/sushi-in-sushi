"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#menu", label: "Menu" },
  { href: "#sobre", label: "Sobre" },
  { href: "#localizacoes", label: "Locais" },
  { href: "#contacto", label: "Contacto" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="font-display text-2xl font-semibold tracking-wide">
          <span className="text-gold">SUSHI</span>
          <span className="text-white"> IN </span>
          <span className="text-gold">SUSHI</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://www.covermanager.com/reservation/module_restaurant/sushi-in-sushi/portuguese"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 px-6 py-2 border border-gold text-gold text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
          >
            Reservar
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
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
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://www.covermanager.com/reservation/module_restaurant/sushi-in-sushi/portuguese"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-6 py-3 border border-gold text-gold text-center text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
              >
                Reservar
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
