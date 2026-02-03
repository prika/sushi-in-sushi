"use client";

import { useState } from "react";
import { CalendarDays, ShoppingBag, MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";
import { ShimmerButton } from "./ui/shimmer-button";
import { ReservationForm } from "./ReservationForm";

export function Contact() {
  const t = useTranslations("contact");
  const tLocations = useTranslations("locations");
  const [showReservationModal, setShowReservationModal] = useState(false);

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
            <button onClick={() => setShowReservationModal(true)}>
              <ShimmerButton>
                <CalendarDays size={18} className="mr-2" />
                {t("bookRodizio")}
              </ShimmerButton>
            </button>
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

      {/* Reservation Modal */}
      {showReservationModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowReservationModal(false)}
        >
          <div
            className="bg-background border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">
                Reservar Mesa
              </h2>
              <button
                onClick={() => setShowReservationModal(false)}
                className="p-2 text-muted hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <ReservationForm
                onSuccess={() => {
                  // Keep modal open to show success message
                }}
              />
            </div>
          </div>
        </div>
      )}

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
