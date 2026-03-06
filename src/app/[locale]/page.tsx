import dynamic from "next/dynamic";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/presentation/components/layout/Header";
import { Hero } from "@/presentation/components/homepage/Hero";
import { RestaurantSchema } from "@/presentation/components/seo/RestaurantSchema";

const Menu = dynamic(() =>
  import("@/presentation/components/products/Menu").then((m) => ({ default: m.Menu })),
);
const About = dynamic(() =>
  import("@/presentation/components/homepage/About").then((m) => ({ default: m.About })),
);
const Team = dynamic(() =>
  import("@/presentation/components/homepage/Team").then((m) => ({ default: m.Team })),
);
const Gallery = dynamic(() =>
  import("@/presentation/components/homepage/Gallery").then((m) => ({ default: m.Gallery })),
);
const Reviews = dynamic(() =>
  import("@/presentation/components/homepage/Reviews").then((m) => ({ default: m.Reviews })),
);
const Locations = dynamic(() =>
  import("@/presentation/components/homepage/Locations").then((m) => ({ default: m.Locations })),
);
const Contact = dynamic(() =>
  import("@/presentation/components/homepage/Contact").then((m) => ({ default: m.Contact })),
);
const Footer = dynamic(() =>
  import("@/presentation/components/layout/Footer").then((m) => ({ default: m.Footer })),
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
