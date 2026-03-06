import dynamic from "next/dynamic";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RestaurantSchema } from "@/components/seo/RestaurantSchema";

const Menu = dynamic(() =>
  import("@/components/Menu").then((m) => ({ default: m.Menu })),
);
const About = dynamic(() =>
  import("@/components/About").then((m) => ({ default: m.About })),
);
const Team = dynamic(() =>
  import("@/components/Team").then((m) => ({ default: m.Team })),
);
const Gallery = dynamic(() =>
  import("@/components/Gallery").then((m) => ({ default: m.Gallery })),
);
const Reviews = dynamic(() =>
  import("@/components/Reviews").then((m) => ({ default: m.Reviews })),
);
const Locations = dynamic(() =>
  import("@/components/Locations").then((m) => ({ default: m.Locations })),
);
const Contact = dynamic(() =>
  import("@/components/Contact").then((m) => ({ default: m.Contact })),
);
const Footer = dynamic(() =>
  import("@/components/Footer").then((m) => ({ default: m.Footer })),
);

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <RestaurantSchema />
      <Header />
      <main id="main-content">
        <Hero />
        <Menu />
        <About />
        <Team />
        <Gallery />
        <Reviews />
        <Locations />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
