"use client";

import { MapPin, Phone, Clock, Navigation, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";

export function Locations() {
  const t = useTranslations("locations");

  const locations = [
    {
      name: t("circunvalacao.name"),
      address: t("circunvalacao.address"),
      phone: t("circunvalacao.phone"),
      whatsapp: "351912348545",
      hours: t("circunvalacao.hours"),
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Estr.+da+Circunvalação+12468+Porto",
    },
    {
      name: t("boavista.name"),
      address: t("boavista.address"),
      phone: t("boavista.phone"),
      whatsapp: "351924667938",
      hours: t("boavista.hours"),
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Shopping+Brasilia+Porto",
    },
  ];

  return (
    <section id="localizacoes" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
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

        <div className="grid md:grid-cols-2 gap-8">
          {locations.map((location, index) => (
            <BlurFade key={location.name} delay={index * 0.1} inView>
              <div className="bg-card p-8 rounded-lg border border-white/5 hover:border-gold/30 transition-all duration-300">
                <h3 className="font-display text-2xl font-semibold mb-6 text-gold">
                  {location.name}
                </h3>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gold shrink-0 mt-1" size={18} />
                    <p className="text-muted">{location.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="text-gold shrink-0" size={18} />
                    <a
                      href={`tel:+${location.whatsapp}`}
                      className="text-muted hover:text-white transition-colors"
                    >
                      {location.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="text-gold shrink-0" size={18} />
                    <p className="text-muted">{location.hours}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href={location.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-muted text-sm font-medium tracking-wider uppercase hover:text-gold hover:border-gold/50 transition-all duration-300"
                  >
                    <Navigation size={16} />
                    {t("directions")}
                  </a>
                  <a
                    href={`https://wa.me/${location.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-muted text-sm font-medium tracking-wider uppercase hover:text-gold hover:border-gold/50 transition-all duration-300"
                  >
                    <MessageCircle size={16} />
                    {t("whatsapp")}
                  </a>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
