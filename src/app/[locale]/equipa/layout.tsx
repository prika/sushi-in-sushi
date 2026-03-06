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
  const page = meta.pageMeta?.equipa;

  const title = page?.titles?.[locale] || page?.titles?.pt || "A Nossa Equipa";
  const description = page?.descriptions?.[locale] || page?.descriptions?.pt || meta.description;

  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/${locale}/equipa`,
      languages: Object.fromEntries(locales.map((l) => [l, `${APP_URL}/${l}/equipa`])),
    },
  };
}

export default function EquipaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
