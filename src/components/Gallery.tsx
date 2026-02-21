"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";

export function Gallery() {
  const t = useTranslations("gallery");

  const galleryImages = [
    {
      src: "/photos/restaurant2.jpg",
      alt: t("images.sushiVariety"),
    },
    {
      src: "/photos/restaurant1.jpg",
      alt: t("images.nigiri"),
    },
    {
      src: "/photos/sangria.jpg",
      alt: t("images.ambiance"),
    },
    
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-16">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("sectionLabel")}
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              {t("title")}
            </h2>
          </div>
        </BlurFade>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((image, index) => (
            <BlurFade key={image.src} delay={index * 0.1} inView>
              <div className="relative overflow-hidden rounded-lg aspect-[4/5] md:row-span-2">
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
