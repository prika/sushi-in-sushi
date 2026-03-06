import type { Metadata } from "next";
import { APP_URL } from "@/lib/config/constants";
import { getSiteMetadata } from "@/lib/metadata";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const locales = ["pt", "en", "fr", "de", "it", "es"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getSiteMetadata();
  const page = meta.pageMeta?.menu;

  const title = page?.titles?.[locale] || page?.titles?.pt || "Menu";
  const description = page?.descriptions?.[locale] || page?.descriptions?.pt || meta.description;

  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/${locale}/menu`,
      languages: Object.fromEntries(locales.map((l) => [l, `${APP_URL}/${l}/menu`])),
    },
  };
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
