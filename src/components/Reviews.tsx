"use client";

import { Star, Quote } from "lucide-react";
import { BlurFade } from "./ui/blur-fade";

const reviews = [
  {
    name: "Maria S.",
    rating: 5,
    text: "O melhor sushi de sempre! Tudo sempre muito fresco, saboroso e feito na hora. É o meu sushi favorito e indico de olhos fechados.",
    date: "Dezembro 2025",
    source: "Google",
  },
  {
    name: "João P.",
    rating: 5,
    text: "Melhor sushi que já comi, a qualidade do peixe cru é absurda! Os temakis, o sashimi, os nigiris… irei repetir com certeza!",
    date: "Janeiro 2026",
    source: "Google",
  },
  {
    name: "Ana R.",
    rating: 5,
    text: "Adoramos o sushi. Tudo muito bem servido e apresentado. A relação qualidade-preço é excelente!",
    date: "Novembro 2025",
    source: "TheFork",
  },
  {
    name: "Carlos M.",
    rating: 5,
    text: "Comida excelente com muitas peças e combinações. Atendimento muito simpático e atencioso. Ambiente acolhedor.",
    date: "Outubro 2025",
    source: "Google",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "fill-gold text-gold" : "text-white/20"}
        />
      ))}
    </div>
  );
}

export function Reviews() {
  return (
    <section id="reviews" className="py-24 px-6 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-16">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              Testemunhos
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              O Que Dizem os Nossos Clientes
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className="fill-gold text-gold" />
                ))}
              </div>
              <span className="text-muted text-sm">
                4.6/5 baseado em 375+ avaliações
              </span>
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
              href="https://www.google.com/maps/place/Sushi+in+Sushi+-+Circunvala%C3%A7%C3%A3o"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted hover:text-gold transition-colors text-sm"
            >
              Ver todas as avaliações no Google
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
