"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";
import { cn } from "@/lib/utils";

const teamMembers = [
  {
    id: "member0",
    name: "Evandro",
    role: "Gerente e Chef de Cozinha",
    image:
      "/photos/evandro.jpg",
  },
  {
    id: "member1",
    name: "Yessa",
    role: "Gerente e Chef de Cozinha",
    image:
      "/photos/yessa.jpg",
  },
  {
    id: "member5",
    name: "Line",
    role: "Assistente de Mesa",
    image:
      "/photos/line.jpg",
  },
  {
    id: "member4",
    name: "Vitoria",
    role: "Assistente de Cozinha",
    image:
      "/photos/vitoria.jpg",
  },
 
 
  {
    id: "member3",
    name: "Waleska",
    role: "Assistente de Cozinha",
    image:
      "/photos/waleska.jpg",
  },
  {
    id: "member6",
    name: "Unknown",
    role: "Assistente de Cozinha",
    image:
      "/photos/unknown.jpg",
  },
  {
    id: "member2",
    name: "Mayra",
    role: "Chef de Cozinha",
    image:
      "/photos/mayra.jpg",
  },
  {
    id: "member8",
    name: "Rakib",
    role: "Assistente de Cozinha",
    image:
      "/photos/rakib.jpg",
  },
  {
    id: "member7",
    name: "Chloe",
    role: "Assistente de Mesa",
    image:
      "/photos/chloe.jpg",
  },
  
  {
    id: "member8",
    name: "Ricky",
    role: "Assistente de Cozinha",
    image:
      "/photos/ricky.jpg",
  },
  {
    id: "member9",
    name: "Unknown 2",
    role: "Assistente de Cozinha",
    image:
      "/photos/unknown2.jpg",
  },
  {
    id: "member10",
    name: "Unknown 3",
    role: "Assistente de Cozinha",
    image:
      "/photos/unknown3.jpg",
  },
  
];

export function Team() {
  const t = useTranslations("team");
  const tA11y = useTranslations("accessibility");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(2);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(3);
      } else {
        setItemsPerView(4);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, teamMembers.length - itemsPerView);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Auto-advance slideshow (respects reduced-motion and pause state)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || isPaused) return;

    const interval = setInterval(next, 4000);
    return () => clearInterval(interval);
  }, [next, isPaused]);

  return (
    <section id="equipa" className="py-24 px-6 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-12">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("sectionLabel")}
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              {t("title")}
            </h2>
            <p className="text-muted text-lg mt-4 max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>
        </BlurFade>

        {/* Slideshow */}
        <div
          className="relative"
          aria-roledescription="carousel"
          aria-label={tA11y("teamCarousel")}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Navigation Arrows */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-background/80 border border-white/10 text-white hover:border-gold hover:text-gold transition-all duration-300 hidden sm:flex"
            aria-label="Previous"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-background/80 border border-white/10 text-white hover:border-gold hover:text-gold transition-all duration-300 hidden sm:flex"
            aria-label="Next"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>

          {/* Carousel */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
              }}
            >
              {teamMembers.map((member, _index) => (
                <div
                  key={member.id}
                  className="shrink-0 px-2"
                  style={{ width: `${100 / itemsPerView}%` }}
                >
                  <div className="group">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-card">
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-display text-base font-semibold text-white">
                          {member.name}
                        </h3>
                        <p className="text-gold text-xs mt-0.5">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-3 rounded-full transition-all duration-300",
                  currentIndex === index
                    ? "bg-gold w-8"
                    : "w-3 bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={currentIndex === index ? "step" : undefined}
              />
            ))}
          </div>
        </div>

        {/* Link to Team Page */}
        <BlurFade delay={0.2} inView>
          <div className="text-center mt-10">
            <Link
              href="/equipa"
              className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors duration-300 group"
            >
              <span className="text-sm font-medium tracking-wider uppercase">
                {t("viewAll")}
              </span>
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
