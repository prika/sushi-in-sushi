import type { Metadata } from "next";
import { APP_URL } from "@/lib/config/constants";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const locales = ["pt", "en", "fr", "de", "it", "es"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    pt: "Menu | Sushi in Sushi",
    en: "Menu | Sushi in Sushi",
    fr: "Menu | Sushi in Sushi",
    de: "Speisekarte | Sushi in Sushi",
    it: "Menu | Sushi in Sushi",
    es: "Menú | Sushi in Sushi",
  };

  const descriptions: Record<string, string> = {
    pt: "Consulte o menu completo do Sushi in Sushi. Sashimi, nigiri, uramaki, temaki, combinados e muito mais. Circunvalação e Boavista, Porto.",
    en: "Explore the full menu of Sushi in Sushi. Sashimi, nigiri, uramaki, temaki, platters and more. Circunvalação and Boavista, Porto.",
    fr: "Consultez le menu complet de Sushi in Sushi. Sashimi, nigiri, uramaki, temaki, plateaux et plus. Porto.",
    de: "Entdecken Sie die vollständige Speisekarte von Sushi in Sushi. Sashimi, Nigiri, Uramaki, Temaki und mehr. Porto.",
    it: "Sfoglia il menu completo di Sushi in Sushi. Sashimi, nigiri, uramaki, temaki, combinazioni e altro. Porto.",
    es: "Consulta el menú completo de Sushi in Sushi. Sashimi, nigiri, uramaki, temaki, combinados y más. Oporto.",
  };

  return {
    title: titles[locale] || titles.pt,
    description: descriptions[locale] || descriptions.pt,
    alternates: {
      canonical: `${APP_URL}/${locale}/menu`,
      languages: Object.fromEntries(locales.map((l) => [l, `${APP_URL}/${l}/menu`])),
    },
  };
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
