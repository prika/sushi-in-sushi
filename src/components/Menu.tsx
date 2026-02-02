"use client";

import Image from "next/image";
import { BlurFade } from "./ui/blur-fade";

const menuItems = [
  {
    name: "Nigiri Premium",
    description: "Seleção de nigiris com peixes frescos do dia",
    price: "18.90",
    image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?q=80&w=600",
  },
  {
    name: "Dragon Roll",
    description: "Roll especial com camarão, abacate e unagi",
    price: "14.50",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=600",
  },
  {
    name: "Hot Roll",
    description: "Roll empanado com cream cheese e salmão",
    price: "12.90",
    image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=600",
  },
  {
    name: "Sashimi Misto",
    description: "30 fatias de sashimi variado premium",
    price: "32.00",
    image: "https://images.unsplash.com/photo-1534482421-64566f976cfa?q=80&w=600",
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://menusa.app/11eed38d2a757ac3a1d29448c47c9f89"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-gold/50 text-gold text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
              >
                Menu Circunvalação
              </a>
              <a
                href="https://menusa.app/11efe18a705bf1218300578d24ba92ad"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 border border-gold/50 text-gold text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
              >
                Menu Boavista
              </a>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
