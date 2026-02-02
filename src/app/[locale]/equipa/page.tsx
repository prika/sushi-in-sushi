"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";

const teamMembers = [
  {
    id: "member1",
    image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=500&fit=crop",
  },
  {
    id: "member2",
    image: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400&h=500&fit=crop",
  },
  {
    id: "member3",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=500&fit=crop",
  },
  {
    id: "member4",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=500&fit=crop",
  },
  {
    id: "member5",
    image: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=400&h=500&fit=crop",
  },
  {
    id: "member6",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=500&fit=crop",
  },
];

const groupPhotos = [
  {
    id: "group1",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
    alt: "Team photo",
  },
  {
    id: "group2",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop",
    alt: "Restaurant team",
  },
];

const workPhotos = [
  {
    id: "work1",
    image: "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&h=400&fit=crop",
    alt: "Chef preparing sushi",
  },
  {
    id: "work2",
    image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600&h=400&fit=crop",
    alt: "Sushi preparation",
  },
  {
    id: "work3",
    image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600&h=400&fit=crop",
    alt: "Kitchen work",
  },
  {
    id: "work4",
    image: "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=600&h=400&fit=crop",
    alt: "Plating sushi",
  },
  {
    id: "work5",
    image: "https://images.unsplash.com/photo-1607301406259-dfb186e15de8?w=600&h=400&fit=crop",
    alt: "Service",
  },
  {
    id: "work6",
    image: "https://images.unsplash.com/photo-1540648639573-8c848de23f0a?w=600&h=400&fit=crop",
    alt: "Restaurant ambiance",
  },
];

export default function TeamPage() {
  const t = useTranslations("team");
  const tPage = useTranslations("teamPage");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{tPage("back")}</span>
          </Link>
          <div className="relative h-12 w-32">
            <Image
              src="/logo.png"
              alt="Sushi in Sushi"
              fill
              className="object-contain"
            />
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 text-center">
        <BlurFade inView>
          <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
            {t("sectionLabel")}
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-semibold mt-4">
            {tPage("title")}
          </h1>
          <p className="text-muted text-xl mt-4 max-w-2xl mx-auto">
            {tPage("subtitle")}
          </p>
        </BlurFade>
      </section>

      {/* Team Members Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {teamMembers.map((member, index) => (
              <BlurFade key={member.id} delay={index * 0.05} inView>
                <div className="group">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card">
                    <Image
                      src={member.image}
                      alt={t(`members.${member.id}.name`)}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-display text-sm font-semibold text-white">
                        {t(`members.${member.id}.name`)}
                      </h3>
                      <p className="text-gold text-xs">
                        {t(`members.${member.id}.role`)}
                      </p>
                    </div>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Group Photos Section */}
      <section className="px-6 py-20 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <BlurFade inView>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">
              {tPage("groupTitle")}
            </h2>
          </BlurFade>
          <div className="grid md:grid-cols-2 gap-6">
            {groupPhotos.map((photo, index) => (
              <BlurFade key={photo.id} delay={index * 0.1} inView>
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                  <Image
                    src={photo.image}
                    alt={photo.alt}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Work Photos Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <BlurFade inView>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">
              {tPage("workTitle")}
            </h2>
          </BlurFade>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {workPhotos.map((photo, index) => (
              <BlurFade key={photo.id} delay={index * 0.05} inView>
                <div className="relative aspect-[3/2] rounded-lg overflow-hidden">
                  <Image
                    src={photo.image}
                    alt={photo.alt}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 bg-card/30 text-center">
        <BlurFade inView>
          <p className="text-muted text-lg mb-6">{t("description")}</p>
          <Link
            href="/#contacto"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gold text-background font-medium tracking-wider uppercase hover:bg-gold-light transition-all duration-300"
          >
            Reservar
          </Link>
        </BlurFade>
      </section>
    </div>
  );
}
