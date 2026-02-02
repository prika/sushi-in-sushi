"use client";

import { MapPin, Phone, Clock } from "lucide-react";
import { BlurFade } from "./ui/blur-fade";

const locations = [
  {
    name: "Circunvalação",
    address: "Estr. da Circunvalação 12468, Porto",
    phone: "912 348 545",
    whatsapp: "351912348545",
    hours: "12h - 23h",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Estr.+da+Circunvalação+12468+Porto",
  },
  {
    name: "Boavista",
    address: "Shopping Brasilia, R. Luís Veiga Leitão 116, 2º piso, Porto",
    phone: "924 667 938",
    whatsapp: "351924667938",
    hours: "12h - 22h",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Shopping+Brasilia+Porto",
  },
];

export function Locations() {
  return (
    <section id="localizacoes" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <BlurFade inView>
          <div className="text-center mb-16">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              Duas Localizações
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
              Visite-nos
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={location.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-3 border border-gold/50 text-gold text-center text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-background transition-all duration-300"
                  >
                    Direções
                  </a>
                  <a
                    href={`https://wa.me/${location.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-3 bg-green-600 text-white text-center text-sm font-medium tracking-wider uppercase hover:bg-green-500 transition-all duration-300"
                  >
                    WhatsApp
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
