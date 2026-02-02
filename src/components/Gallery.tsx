"use client";

import Image from "next/image";
import { BlurFade } from "./ui/blur-fade";

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?q=80&w=800",
    alt: "Sushi variado",
  },
  {
    src: "https://images.unsplash.com/photo-1562802378-063ec186a863?q=80&w=800",
    alt: "Maki rolls",
  },
  {
    src: "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?q=80&w=800",
    alt: "Ambiente do restaurante",
  },
  {
    src: "https://images.unsplash.com/photo-1617196034183-421b4917c92d?q=80&w=800",
    alt: "Nigiri de salmão",
  },
  {
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800",
    alt: "Prato de sashimi",
  },
  {
    src: "https://images.unsplash.com/photo-1540648639573-8c848de23f0a?q=80&w=800",
    alt: "Detalhes do restaurante",
  },
];

export function Gallery() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-16">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              Galeria
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              Momentos de Sabor
            </h2>
          </div>
        </BlurFade>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((image, index) => (
            <BlurFade key={image.src} delay={index * 0.1} inView>
              <div
                className={`relative overflow-hidden rounded-lg ${
                  index === 0 || index === 5
                    ? "aspect-[4/5] md:row-span-2"
                    : "aspect-square"
                }`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
