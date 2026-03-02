import { setRequestLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ReservationForm } from "@/components/ReservationForm";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: string }>;
};

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
