import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ReservationForm } from "@/components/ReservationForm";
import Link from "next/link";
import { APP_URL } from "@/lib/config/constants";

type Props = {
  params: Promise<{ locale: string }>;
};

const locales = ["pt", "en", "fr", "de", "it", "es"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    pt: "Reservar Mesa | Sushi in Sushi",
    en: "Book a Table | Sushi in Sushi",
    fr: "Réserver une Table | Sushi in Sushi",
    de: "Tisch Reservieren | Sushi in Sushi",
    it: "Prenotare un Tavolo | Sushi in Sushi",
    es: "Reservar Mesa | Sushi in Sushi",
  };

  const descriptions: Record<string, string> = {
    pt: "Reserve a sua mesa no Sushi in Sushi. Rodízio e à carta. Duas localizações no Porto: Circunvalação e Boavista.",
    en: "Book your table at Sushi in Sushi. All-you-can-eat and à la carte. Two locations in Porto: Circunvalação and Boavista.",
    fr: "Réservez votre table au Sushi in Sushi. Buffet à volonté et à la carte. Deux emplacements à Porto.",
    de: "Reservieren Sie Ihren Tisch im Sushi in Sushi. All-you-can-eat und à la carte. Zwei Standorte in Porto.",
    it: "Prenotate il vostro tavolo al Sushi in Sushi. All-you-can-eat e à la carte. Due sedi a Porto.",
    es: "Reserve su mesa en Sushi in Sushi. Rodizio y a la carta. Dos ubicaciones en Oporto.",
  };

  return {
    title: titles[locale] || titles.pt,
    description: descriptions[locale] || descriptions.pt,
    alternates: {
      canonical: `${APP_URL}/${locale}/reservar`,
      languages: Object.fromEntries(locales.map((l) => [l, `${APP_URL}/${l}/reservar`])),
    },
  };
}

export default async function ReservarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reservationPage");

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-16 px-4">
        <div className="max-w-lg lg:max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
              {t("tagline")}
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-semibold mt-3 text-white">
              {t("title")}
            </h1>
            <p className="text-muted text-lg mt-3">
              {t("subtitle")}
            </p>
          </div>

          <div className="bg-background border border-white/10 rounded-2xl p-6">
            <ReservationForm />
          </div>

          <p className="text-center text-sm text-muted mt-6">
            {t("cancelLink")}{" "}
            <Link
              href={`/${locale}/cancelar-reserva`}
              className="text-gold hover:text-gold-light underline transition-colors"
            >
              {t("cancelLinkAction")}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
