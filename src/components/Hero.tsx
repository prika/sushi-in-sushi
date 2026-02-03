"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";
import { ShimmerButton } from "./ui/shimmer-button";
import { ReservationForm } from "./ReservationForm";

export function Hero() {
  const t = useTranslations("hero");
  const [showReservationModal, setShowReservationModal] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2070"
          alt="Sushi background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-background/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Decorative sushi images */}
      <div className="absolute top-20 left-10 w-32 h-32 md:w-48 md:h-48 opacity-20 blur-sm">
        <Image
          src="https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?q=80&w=500"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      <div className="absolute bottom-32 right-10 w-40 h-40 md:w-56 md:h-56 opacity-20 blur-sm">
        <Image
          src="https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=500"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <BlurFade delay={0.1}>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="w-12 h-px bg-gold" />
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("tagline")}
            </span>
            <span className="w-12 h-px bg-gold" />
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
            <button onClick={() => setShowReservationModal(true)}>
              <ShimmerButton>{t("bookTable")}</ShimmerButton>
            </button>
            <a
              href="#menu"
              className="px-8 py-4 text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-300"
            >
              {t("viewMenu")}
            </a>
          </div>
        </BlurFade>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ChevronDown className="text-gold/50" size={32} />
      </motion.div>

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
    </section>
  );
}
