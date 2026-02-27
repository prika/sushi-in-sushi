"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";
import { ShimmerButton } from "./ui/shimmer-button";
import { ReservationForm } from "./ReservationForm";

export function Hero() {
  const t = useTranslations("hero");
  const tA11y = useTranslations("accessibility");
  const [showReservationModal, setShowReservationModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openModal = useCallback((trigger: HTMLButtonElement | null) => {
    triggerRef.current = trigger;
    setShowReservationModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowReservationModal(false);
    triggerRef.current?.focus();
  }, []);

  // Focus trap + ESC handler
  useEffect(() => {
    if (!showReservationModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => {
      modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )?.focus();
    });

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showReservationModal, closeModal]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/photos/restaurant1.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          role="presentation"
        />
        <div className="absolute inset-0 bg-background/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <BlurFade delay={0.1}>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="w-12 h-px bg-gold" aria-hidden="true" />
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("tagline")}
            </span>
            <span className="w-12 h-px bg-gold" aria-hidden="true" />
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-tight mb-6">
            {t("title")}
            <br />
            <span className="text-gradient">{t("subtitle")}</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.3}>
          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("description")}
          </p>
        </BlurFade>

        <BlurFade delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ShimmerButton onClick={(e) => openModal(e.currentTarget)}>
              {t("bookTable")}
            </ShimmerButton>
            <a
              href="#menu"
              className="px-8 py-4 text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-300"
            >
              {t("viewMenu")}
            </a>
          </div>
        </BlurFade>
      </div>

      {/* Scroll indicator (decorative) */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-hidden="true"
      >
        <ChevronDown className="text-gold/50" size={32} />
      </motion.div>

      {/* Reservation Modal */}
      {showReservationModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hero-reservation-title"
          onClick={closeModal}
        >
          <div
            ref={modalRef}
            className="bg-background border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-white/10 z-10">
              <h2 id="hero-reservation-title" className="text-xl font-semibold text-white">
                Reservar Mesa
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-muted hover:text-white transition-colors"
                aria-label={tA11y("closeModal")}
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <div className="p-6">
              <ReservationForm />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
