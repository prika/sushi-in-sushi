"use client";

import Image from "next/image";
import { BlurFade } from "./ui/blur-fade";

const menuItems = [
  {
    name: "Sashimi de Salmão",
    description: "Fatias finas de salmão fresco premium",
    price: "12.00",
    image: "/product/sashimi-salmao.jpg",
  },
  {
    name: "Hot Roll",
    description: "Roll empanado com cream cheese e salmão",
    price: "7.00",
    image: "/product/hot-roll.jpg",
  },
  {
    name: "Gunkan",
    description: "Arroz envolto em alga com cobertura especial",
    price: "5.00",
    image: "/product/gunkan.jpg",
  },
  {
    name: "Combinado Salmon Fusion",
    description: "58 peças variadas de salmão para partilhar",
    price: "37.00",
    image: "/product/salmon-fusion.jpg",
  },
];

export function Menu() {
  return (
    <section id="menu" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-16">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              O Nosso Menu
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              Criações de Assinatura
            </h2>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map((item, index) => (
            <BlurFade key={item.name} delay={index * 0.1} inView>
              <div className="group bg-card rounded-lg border border-white/5 hover:border-gold/30 transition-all duration-300 overflow-hidden">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-gold transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-muted text-sm mb-3 leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-gold font-semibold text-lg">€{item.price}</p>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.5} inView>
          <div className="text-center mt-12">
            <a
              href="/menu"
              className="inline-block px-10 py-4 bg-gold text-background text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-all duration-300"
            >
              Ver Menu Completo
            </a>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
