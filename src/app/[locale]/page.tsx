import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Menu } from "@/components/Menu";
import { About } from "@/components/About";
import { Gallery } from "@/components/Gallery";
import { Reviews } from "@/components/Reviews";
import { Locations } from "@/components/Locations";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Menu />
        <About />
        <Gallery />
        <Reviews />
        <Locations />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
