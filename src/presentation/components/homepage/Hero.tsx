"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "../ui/blur-fade";
import { ShimmerLink } from "../ui/shimmer-button";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 md:pt-40 pb-16">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/photos/restaurant1.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={40}
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
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="w-12 h-px bg-gold" aria-hidden="true" />
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("tagline")}
            </span>
            <span className="w-12 h-px bg-gold" aria-hidden="true" />
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-tight mb-4">
            {t("title")}
            <br />
            <span className="text-gradient">{t("subtitle")}</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.3}>
          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("description")}
          </p>
        </BlurFade>

        <BlurFade delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ShimmerLink href="/reservar">
              {t("bookTable")}
            </ShimmerLink>
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
    </section>
  );
}
