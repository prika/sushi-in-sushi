"use client";

import { BlurFade } from "./ui/blur-fade";
import { ShimmerButton } from "./ui/shimmer-button";

export function Contact() {
  return (
    <section id="contacto" className="py-24 px-6 bg-card/30">
      <div className="max-w-4xl mx-auto text-center">
        <BlurFade inView>
          <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
            Reserve Já
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4 mb-6">
            Pronto para uma experiência
            <br />
            <span className="text-gradient">inesquecível?</span>
          </h2>
          <p className="text-muted text-lg mb-12">
            Faça a sua reserva ou encomende online para delivery e takeaway.
          </p>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a
              href="https://www.covermanager.com/reservation/module_restaurant/sushi-in-sushi/portuguese"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ShimmerButton>Reservar Rodízio</ShimmerButton>
            </a>
            <a
              href="https://delivery.eatseasyapp.com/sushiinsushi"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-accent text-accent text-sm font-medium tracking-wider uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-full"
            >
              Encomendar Online
            </a>
          </div>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <p className="text-muted">
            Ou contacte-nos via WhatsApp:{" "}
            <a
              href="https://wa.me/351912348545"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-400 transition-colors"
            >
              Circunvalação
            </a>
            {" | "}
            <a
              href="https://wa.me/351924667938"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-400 transition-colors"
            >
              Boavista
            </a>
          </p>
        </BlurFade>
      </div>
    </section>
  );
}
