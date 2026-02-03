"use client";

import { CalendarDays, ShoppingBag, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";
import { ShimmerButton } from "./ui/shimmer-button";

export function Contact() {
  const t = useTranslations("contact");
  const tLocations = useTranslations("locations");

  return (
    <section id="contacto" className="py-24 px-6 bg-card/30">
      <div className="max-w-4xl mx-auto text-center">
        <BlurFade inView>
          <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
            {t("sectionLabel")}
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4 mb-6">
            {t("title")}
            <br />
            <span className="text-gradient">{t("titleHighlight")}</span>
          </h2>
          <p className="text-muted text-lg mb-12">{t("description")}</p>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="https://www.covermanager.com/reservation/module_restaurant/sushi-in-sushi/portuguese"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ShimmerButton>
                <CalendarDays size={18} className="mr-2" />
                {t("bookRodizio")}
              </ShimmerButton>
            </a>
            <a
              href="https://delivery.eatseasyapp.com/sushinsushi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 border border-white/20 text-white text-sm font-medium tracking-wider uppercase hover:border-gold hover:text-gold transition-all duration-300 rounded-full"
            >
              <ShoppingBag size={18} />
              {t("orderOnline")}
            </a>
          </div>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-muted text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-gold shrink-0" />
              <span>{t("whatsappLabel")}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/351912348545"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-gold transition-colors whitespace-nowrap"
              >
                {tLocations("circunvalacao.name")}
              </a>
              <span className="text-white/20">|</span>
              <a
                href="https://wa.me/351924667938"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-gold transition-colors whitespace-nowrap"
              >
                {tLocations("boavista.name")}
              </a>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
