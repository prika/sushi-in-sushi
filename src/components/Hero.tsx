"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { BlurFade } from "./ui/blur-fade";
import { ShimmerButton } from "./ui/shimmer-button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <BlurFade delay={0.1}>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="w-12 h-px bg-gold" />
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              Fusion Food • Porto
            </span>
            <span className="w-12 h-px bg-gold" />
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-tight mb-6">
            A Arte do Sushi
            <br />
            <span className="text-gradient">Reinventada</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.3}>
          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Tradição japonesa encontra criatividade contemporânea
            <br className="hidden sm:block" /> em duas localizações no Porto.
          </p>
        </BlurFade>

        <BlurFade delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://www.covermanager.com/reservation/module_restaurant/sushi-in-sushi/portuguese"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ShimmerButton>Reservar Mesa</ShimmerButton>
            </a>
            <a
              href="#menu"
              className="px-8 py-4 text-sm font-medium tracking-wider uppercase text-muted hover:text-white transition-colors duration-300"
            >
              Ver Menu
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
    </section>
  );
}
