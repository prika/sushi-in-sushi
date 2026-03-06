import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { APP_URL } from "@/lib/config/constants";
import { GoogleTagManager } from "@/presentation/components/seo/GoogleTagManager";
import { getSiteMetadata } from "@/lib/metadata";

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

const LOCALE_MAP: Record<string, string> = {
  pt: "pt_PT",
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  es: "es_ES",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getSiteMetadata();

  const title = meta.metaTitles?.[locale] || meta.brandName;
  const description = meta.metaDescriptions?.[locale] || meta.description;
  const ogDescription = meta.metaOgDescriptions?.[locale] || meta.description;
  const keywords = meta.metaKeywords?.[locale] || [];
  return {
    metadataBase: new URL(APP_URL),
    title,
    description,
    keywords,
    icons: {
      icon: [
        { url: meta.faviconUrl, type: "image/png" },
      ],
      apple: [{ url: meta.appleTouchIconUrl, sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title,
      description: ogDescription,
      url: `${APP_URL}/${locale}`,
      siteName: meta.brandName,
      locale: LOCALE_MAP[locale] || "pt_PT",
      type: "website",
      images: [
        {
          url: meta.ogImageUrl,
          width: 1200,
          height: 630,
          alt: meta.brandName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
      images: [meta.ogImageUrl],
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
      <GoogleTagManager />
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
