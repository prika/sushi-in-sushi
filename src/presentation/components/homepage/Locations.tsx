"use client";

import { MapPin, Phone, Clock, Navigation, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "../ui/blur-fade";
import { useLocations } from "@/presentation/hooks";

function formatHours(opensAt: string, closesAt: string): string {
  const fmt = (t: string) => t.replace(":00", "h").replace(":30", "h30");
  return `${fmt(opensAt)} - ${fmt(closesAt)}`;
}

export function Locations() {
  const t = useTranslations("locations");
  const { locations, isLoading } = useLocations();

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

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card p-8 rounded-lg border border-white/5 animate-pulse h-64" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {locations.map((location, index) => {
              const whatsapp = location.phone?.replace(/\D/g, "");
              const mapsUrl =
                location.googleMapsUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
              const hours =
                location.opensAt && location.closesAt
                  ? formatHours(location.opensAt, location.closesAt)
                  : null;

              return (
                <BlurFade key={location.id} delay={index * 0.1} inView>
                  <div className="bg-card p-8 rounded-lg border border-white/5 hover:border-gold/30 transition-all duration-300">
                    <h3 className="font-display text-2xl font-semibold mb-6 text-gold">
                      {location.name}
                    </h3>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-3">
                        <MapPin className="text-gold shrink-0 mt-1" size={18} aria-hidden="true" />
                        <p className="text-muted">{location.address}</p>
                      </div>
                      {location.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="text-gold shrink-0" size={18} aria-hidden="true" />
                          <a
                            href={`tel:${location.phone}`}
                            className="text-muted hover:text-white transition-colors"
                          >
                            {location.phone}
                          </a>
                        </div>
                      )}
                      {hours && (
                        <div className="flex items-center gap-3">
                          <Clock className="text-gold shrink-0" size={18} aria-hidden="true" />
                          <p className="text-muted">{hours}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-muted text-xs sm:text-sm font-medium tracking-wider uppercase hover:text-gold hover:border-gold/50 transition-all duration-300"
                      >
                        <Navigation size={16} className="shrink-0" aria-hidden="true" />
                        <span className="whitespace-nowrap">{t("directions")}</span>
                      </a>
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-muted text-xs sm:text-sm font-medium tracking-wider uppercase hover:text-gold hover:border-gold/50 transition-all duration-300"
                        >
                          <MessageCircle size={16} className="shrink-0" aria-hidden="true" />
                          <span className="whitespace-nowrap">{t("whatsapp")}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </BlurFade>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
