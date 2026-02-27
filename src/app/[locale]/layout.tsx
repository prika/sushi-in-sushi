import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { APP_URL } from "@/lib/config/constants";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    pt: "Sushi in Sushi | Fusion Food no Porto",
    en: "Sushi in Sushi | Fusion Food in Porto",
    fr: "Sushi in Sushi | Fusion Food à Porto",
    de: "Sushi in Sushi | Fusion Food in Porto",
    it: "Sushi in Sushi | Fusion Food a Porto",
    es: "Sushi in Sushi | Fusion Food en Oporto",
  };

  const descriptions: Record<string, string> = {
    pt: "Restaurante de sushi no Porto. Rodízio, à carta, delivery e takeaway. Duas localizações: Circunvalação e Boavista.",
    en: "Sushi restaurant in Porto. All-you-can-eat, à la carte, delivery and takeaway. Two locations: Circunvalação and Boavista.",
    fr: "Restaurant de sushi à Porto. Buffet à volonté, à la carte, livraison et à emporter. Deux emplacements: Circunvalação et Boavista.",
    de: "Sushi-Restaurant in Porto. All-you-can-eat, à la carte, Lieferung und Abholung. Zwei Standorte: Circunvalação und Boavista.",
    it: "Ristorante di sushi a Porto. All-you-can-eat, à la carte, consegna e asporto. Due sedi: Circunvalação e Boavista.",
    es: "Restaurante de sushi en Oporto. Rodizio, a la carta, delivery y para llevar. Dos ubicaciones: Circunvalação y Boavista.",
  };

  const ogDescriptions: Record<string, string> = {
    pt: "A arte do sushi reinventada. Tradição japonesa com criatividade contemporânea.",
    en: "The art of sushi reinvented. Japanese tradition with contemporary creativity.",
    fr: "L'art du sushi réinventé. Tradition japonaise avec créativité contemporaine.",
    de: "Die Kunst des Sushi neu erfunden. Japanische Tradition mit zeitgenössischer Kreativität.",
    it: "L'arte del sushi reinventata. Tradizione giapponese con creatività contemporanea.",
    es: "El arte del sushi reinventado. Tradición japonesa con creatividad contemporánea.",
  };

  const localeMap: Record<string, string> = {
    pt: "pt_PT",
    en: "en_US",
    fr: "fr_FR",
    de: "de_DE",
    it: "it_IT",
    es: "es_ES",
  };

  return {
    metadataBase: new URL(APP_URL),
    title: titles[locale] || titles.pt,
    description: descriptions[locale] || descriptions.pt,
    keywords: [
      "sushi porto",
      "restaurante japonês porto",
      "rodízio sushi",
      "sushi delivery porto",
    ],
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: titles[locale] || titles.pt,
      description: ogDescriptions[locale] || ogDescriptions.pt,
      url: `${APP_URL}/${locale}`,
      siteName: "Sushi in Sushi",
      locale: localeMap[locale] || "pt_PT",
      type: "website",
      images: [
        {
          url: "/logo.png",
          width: 512,
          height: 512,
          alt: "Sushi in Sushi",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: titles[locale] || titles.pt,
      description: ogDescriptions[locale] || ogDescriptions.pt,
      images: ["/logo.png"],
    },
    alternates: {
      canonical: `${APP_URL}/${locale}`,
      languages: {
        "x-default": `${APP_URL}/pt`,
        pt: `${APP_URL}/pt`,
        en: `${APP_URL}/en`,
        fr: `${APP_URL}/fr`,
        de: `${APP_URL}/de`,
        it: `${APP_URL}/it`,
        es: `${APP_URL}/es`,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div className={`${cormorant.variable} ${inter.variable} font-sans`}>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
