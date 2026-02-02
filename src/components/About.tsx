"use client";

import Image from "next/image";
import { BlurFade } from "./ui/blur-fade";

export function About() {
  return (
    <section id="sobre" className="py-24 px-6 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <BlurFade inView>
            <div>
              <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
                A Nossa Filosofia
              </span>
              <blockquote className="font-display text-3xl md:text-4xl font-medium mt-6 mb-8 leading-snug">
                &ldquo;Fusion Food não é apenas uma técnica — é uma filosofia que
                respeita a tradição enquanto abraça a inovação.&rdquo;
              </blockquote>
              <p className="text-muted leading-relaxed mb-6">
                Desde 2018, o Sushi in Sushi combina técnicas japonesas autênticas
                com ingredientes locais de qualidade premium. A nossa filosofia de
                Fusion Food respeita a tradição enquanto abraça a inovação — cada
                peça conta uma história de sabor e dedicação.
              </p>
              <p className="text-muted leading-relaxed">
                Com duas localizações no Porto, trazemos a arte do sushi para mais
                perto de si, mantendo sempre o compromisso com a excelência e
                frescura que nos define.
              </p>
            </div>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600"
                  alt="Interior do restaurante"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden mt-8">
                <Image
                  src="https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=600"
                  alt="Chef preparando sushi"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
