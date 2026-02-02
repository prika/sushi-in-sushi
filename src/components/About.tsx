"use client";

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
            <div className="relative aspect-[4/3] bg-gradient-to-br from-gold/10 to-accent/10 rounded-lg overflow-hidden border border-white/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🍣</div>
                  <p className="text-muted text-sm tracking-wider uppercase">
                    Imagem do restaurante
                  </p>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
