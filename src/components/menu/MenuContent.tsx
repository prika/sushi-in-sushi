"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CalendarHeart, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { useTranslations, useLocale } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/ui/blur-fade";

interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  descriptions: Record<string, string>;
}

interface MenuCategoryData {
  id: string;
  name: string;
  slug: string;
  products: MenuProduct[];
}

interface MenuContentProps {
  categories: MenuCategoryData[];
  restaurants: { id: string; name: string }[];
}

// Offset patterns for staggered layout — cycles through different visual treatments
const CARD_PATTERNS = [
  { offsetY: "mt-0", rotate: "" },
  { offsetY: "mt-8", rotate: "rotate-[0.6deg]" },
  { offsetY: "mt-3", rotate: "-rotate-[0.4deg]" },
  { offsetY: "mt-10", rotate: "" },
  { offsetY: "mt-1", rotate: "rotate-[0.3deg]" },
  { offsetY: "mt-6", rotate: "-rotate-[0.5deg]" },
  { offsetY: "mt-12", rotate: "" },
  { offsetY: "mt-4", rotate: "rotate-[0.4deg]" },
];


function CategorySection({
  category,
  categoryIndex,
}: {
  category: MenuCategoryData;
  categoryIndex: number;
}) {
  const locale = useLocale();
  const t = useTranslations("menu");
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Subtle parallax on heading only (small Y shift, no opacity changes)
  const headingY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section ref={sectionRef} id={`cat-${category.slug}`} className="relative py-16 md:py-24 scroll-mt-16">
      {/* Category heading with subtle parallax */}
      <motion.div
        style={{ y: headingY }}
        className="mb-12 md:mb-20 px-4 md:px-0"
      >
        <BlurFade delay={categoryIndex * 0.1} inView inViewMargin="-20px">
          <div className="max-w-5xl mx-auto">
            <span className="text-gold/40 text-xs tracking-[0.3em] uppercase font-sans">
              {String(categoryIndex + 1).padStart(2, "0")}
            </span>
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-light text-white mt-2 tracking-tight">
              {category.name}
            </h2>
            <div className="w-12 h-px bg-gold/30 mt-6" />
          </div>
        </BlurFade>
      </motion.div>

      {/* Staggered product grid */}
      <div className="max-w-5xl mx-auto px-4 md:px-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 md:gap-x-8 lg:gap-x-10">
          {category.products.map((product, productIndex) => {
            const pattern = CARD_PATTERNS[productIndex % CARD_PATTERNS.length];

            return (
              <BlurFade
                key={product.id}
                delay={productIndex * 0.04}
                inView
                inViewMargin="-10px"
                className={cn(
                  pattern.offsetY,
                  pattern.rotate,
                  // On mobile, remove vertical offsets
                  "max-sm:!mt-0",
                )}
              >
                <ProductCard
                  product={product}
                  locale={locale}
                  piecesLabel={t("pieces")}
                />
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  locale,
  piecesLabel,
}: {
  product: MenuProduct;
  locale: string;
  piecesLabel: string;
}) {
  const description =
    product.descriptions[locale] || product.description || null;

  return (
    <div className="group mb-6 md:mb-8">
      {/* Product image or placeholder */}
      <div className="relative overflow-hidden rounded-sm bg-white/5 aspect-[3/4]">
        {product.imageUrl ? (
          <>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.03] to-white/[0.08]">
            <span className="font-display text-white/10 text-lg text-center px-3 leading-tight select-none">
              {product.name}
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="mt-3 space-y-1">
        <h3 className="font-display text-sm md:text-base text-white font-light tracking-wide">
          {product.name}
        </h3>
        {description && (
          <p className="text-xs text-gray-400 font-sans leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
        {product.quantity > 1 && (
          <p className="text-xs text-gold/60 font-sans tracking-wider">
            {product.quantity} {piecesLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function MenuContent({ categories, restaurants }: MenuContentProps) {
  const t = useTranslations("menu");
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      {/* Spacer for fixed header */}
      <div className="h-[140px] md:h-[180px]" />

      {/* Restaurant tabs below header */}
      <div className="sticky top-[56px] md:top-[86px] z-40 bg-background/90 backdrop-blur-xl border-b border-white/5 flex justify-center py-2">
        <RestaurantTabs restaurants={restaurants} />
      </div>

      {/* Fixed category sidebar nav */}
      <CategoryNav categories={categories} />

      {/* Menu sections */}
      <main>
        {categories.map((category, index) => (
          <CategorySection
            key={category.id}
            category={category}
            categoryIndex={index}
          />
        ))}
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <a
              href={`/${locale}/reservar`}
              className="group/btn flex-1 relative overflow-hidden rounded-full bg-gold px-6 py-3 text-center transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-background text-sm font-medium tracking-wider uppercase">
                <CalendarHeart size={16} />
                {t("book")}
              </span>
            </a>
            <a
              href="https://delivery.eatseasyapp.com/sushiinsushi"
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn flex-1 relative overflow-hidden rounded-full border border-white/15 bg-white/5 backdrop-blur-sm px-6 py-3 text-center transition-all duration-500 hover:border-gold/50 hover:bg-white/10"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-white/80 text-sm font-medium tracking-wider uppercase group-hover/btn:text-gold transition-colors duration-500">
                <ExternalLink size={14} />
                {t("order")}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryNav({ categories }: { categories: MenuCategoryData[] }) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug ?? "");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const cat of categories) {
      const el = document.getElementById(`cat-${cat.slug}`);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSlug(cat.slug);
          }
        },
        { rootMargin: "-30% 0px -60% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [categories]);

  const scrollTo = useCallback((slug: string) => {
    const el = document.getElementById(`cat-${slug}`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <nav className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-1.5">
      {categories.map((cat) => {
        const isActive = activeSlug === cat.slug;
        return (
          <button
            key={cat.slug}
            onClick={() => scrollTo(cat.slug)}
            className="group flex items-center gap-2"
          >
            <span
              className={cn(
                "block h-px transition-all duration-300",
                isActive ? "w-6 bg-gold" : "w-3 bg-white/20 group-hover:w-4 group-hover:bg-white/40",
              )}
            />
            <span
              className={cn(
                "text-[10px] tracking-wider uppercase transition-all duration-300 whitespace-nowrap",
                isActive
                  ? "text-gold opacity-100"
                  : "text-white/30 opacity-0 group-hover:opacity-100",
              )}
            >
              {cat.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// Both restaurants share the same menu — tabs show available locations, not filtered content
function RestaurantTabs({
  restaurants,
}: {
  restaurants: { id: string; name: string }[];
}) {
  const [activeId, setActiveId] = useState(restaurants[0]?.id);

  return (
    <div className="flex gap-1 relative">
      {restaurants.map((restaurant) => (
        <button
          key={restaurant.id}
          onClick={() => setActiveId(restaurant.id)}
          className={cn(
            "relative px-3 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors duration-300 rounded-full",
            activeId === restaurant.id
              ? "text-background"
              : "text-gray-400 hover:text-white",
          )}
        >
          {activeId === restaurant.id && (
            <motion.span
              layoutId="restaurant-pill"
              className="absolute inset-0 bg-gold rounded-full"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10">{restaurant.name}</span>
        </button>
      ))}
    </div>
  );
}

