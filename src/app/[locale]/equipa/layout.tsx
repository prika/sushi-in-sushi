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
    pt: "A Nossa Equipa | Sushi in Sushi",
    en: "Our Team | Sushi in Sushi",
    fr: "Notre Équipe | Sushi in Sushi",
    de: "Unser Team | Sushi in Sushi",
    it: "Il Nostro Team | Sushi in Sushi",
    es: "Nuestro Equipo | Sushi in Sushi",
  };

  const descriptions: Record<string, string> = {
    pt: "Conheça a equipa apaixonada por trás do Sushi in Sushi no Porto. Chefs e colaboradores dedicados a criar experiências gastronómicas únicas.",
    en: "Meet the passionate team behind Sushi in Sushi in Porto. Chefs and staff dedicated to creating unique gastronomic experiences.",
    fr: "Rencontrez l'équipe passionnée derrière Sushi in Sushi à Porto. Chefs et personnel dédiés à créer des expériences gastronomiques uniques.",
    de: "Lernen Sie das leidenschaftliche Team hinter Sushi in Sushi in Porto kennen. Köche und Mitarbeiter, die einzigartige gastronomische Erlebnisse schaffen.",
    it: "Conoscete il team appassionato dietro Sushi in Sushi a Porto. Chef e staff dedicati a creare esperienze gastronomiche uniche.",
    es: "Conozca al apasionado equipo detrás de Sushi in Sushi en Oporto. Chefs y personal dedicados a crear experiencias gastronómicas únicas.",
  };

  return {
    title: titles[locale] || titles.pt,
    description: descriptions[locale] || descriptions.pt,
    alternates: {
      canonical: `${APP_URL}/${locale}/equipa`,
      languages: Object.fromEntries(locales.map((l) => [l, `${APP_URL}/${l}/equipa`])),
    },
  };
}

export default function EquipaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
