"use client";

import { Star, Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} de 5 estrelas`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "fill-gold text-gold" : "text-white/20"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Reviews() {
  const t = useTranslations("reviews");

  const reviews = [
    {
      name: t("reviews.review1.name"),
      rating: 5,
      text: t("reviews.review1.text"),
      date: t("reviews.review1.date"),
      source: "Google",
    },
    {
      name: t("reviews.review2.name"),
      rating: 5,
      text: t("reviews.review2.text"),
      date: t("reviews.review2.date"),
      source: "Google",
    },
    {
      name: t("reviews.review3.name"),
      rating: 5,
      text: t("reviews.review3.text"),
      date: t("reviews.review3.date"),
      source: "TheFork",
    },
    {
      name: t("reviews.review4.name"),
      rating: 5,
      text: t("reviews.review4.text"),
      date: t("reviews.review4.date"),
      source: "Google",
    },
  ];

  return (
    <section id="reviews" className="py-24 px-6 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-16">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("sectionLabel")}
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              {t("title")}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-0.5" role="img" aria-label="5 de 5 estrelas">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="fill-gold text-gold" aria-hidden="true" />
                ))}
              </div>
              <span className="text-muted text-sm">{t("rating")}</span>
            </div>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <BlurFade key={review.name} delay={index * 0.1} inView>
              <div className="relative bg-background p-6 rounded-lg border border-white/5 hover:border-gold/20 transition-all duration-300 h-full">
                <Quote
                  size={32}
                  className="absolute top-4 right-4 text-gold/10"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold font-semibold text-sm">
                      {review.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{review.name}</p>
                    <StarRating rating={review.rating} />
                  </div>
                </div>
                <p className="text-muted leading-relaxed mb-4">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs text-muted/60">
                  <span>{review.date}</span>
                  <span>{review.source}</span>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.5} inView>
          <div className="text-center mt-12">
            <a
              href="https://maps.app.goo.gl/HvAR1ro45wE2zFUT9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted hover:text-gold transition-colors text-sm"
            >
              {t("viewAll")}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
