"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  images: string[];
  alt: string;
}

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || images.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );

    container
      .querySelectorAll("[data-index]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [images]);

  if (images.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-800 flex items-center justify-center text-5xl text-gray-600">
        🍣
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="relative w-full aspect-[4/3] bg-gray-800">
        <Image src={images[0]} alt={alt} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {images.map((url, i) => (
          <div
            key={url}
            data-index={i}
            className="flex-shrink-0 w-full aspect-[4/3] relative snap-center bg-gray-800"
          >
            <Image
              src={url}
              alt={`${alt} ${i + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === activeIndex ? "bg-[#D4AF37]" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
