import { APP_URL } from "@/lib/config/constants";

interface RestaurantLocation {
  name: string;
  streetAddress: string;
  telephone: string;
  openingHours: string;
  latitude?: number;
  longitude?: number;
}

const locations: RestaurantLocation[] = [
  {
    name: "Sushi in Sushi Circunvalação",
    streetAddress: "Estr. da Circunvalação 12468",
    telephone: "+351912348545",
    openingHours: "Mo-Su 12:00-23:00",
    latitude: 41.1679,
    longitude: -8.6291,
  },
  {
    name: "Sushi in Sushi Boavista",
    streetAddress: "Shopping Brasilia, R. Luís Veiga Leitão 116, 2º piso",
    telephone: "+351924667938",
    openingHours: "Mo-Su 12:00-22:00",
    latitude: 41.1579,
    longitude: -8.6448,
  },
];

export function RestaurantSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Sushi in Sushi",
    description:
      "Restaurante de sushi fusion no Porto. Rodízio, à carta, delivery e takeaway. Tradição japonesa com criatividade contemporânea.",
    url: APP_URL,
    logo: `${APP_URL}/logo.png`,
    image: `${APP_URL}/restaurant-hero.jpg`,
    servesCuisine: ["Japanese", "Sushi", "Fusion"],
    priceRange: "€€",
    acceptsReservations: true,
    menu: `${APP_URL}/pt/menu`,
    address: locations.map((loc) => ({
      "@type": "PostalAddress",
      streetAddress: loc.streetAddress,
      addressLocality: "Porto",
      addressCountry: "PT",
    })),
    telephone: locations[0].telephone,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "12:00",
        closes: "23:00",
      },
    ],
    hasMap:
      "https://www.google.com/maps/search/?api=1&query=Estr.+da+Circunvalação+12468+Porto",
    sameAs: [
      "https://www.instagram.com/sushi_in_sushi_porto",
      "https://www.facebook.com/sushinsushi",
    ],
    department: locations.map((loc) => ({
      "@type": "Restaurant",
      name: loc.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: loc.streetAddress,
        addressLocality: "Porto",
        addressCountry: "PT",
      },
      telephone: loc.telephone,
      ...(loc.latitude && loc.longitude
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: loc.latitude,
              longitude: loc.longitude,
            },
          }
        : {}),
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "12:00",
        closes: loc.openingHours.includes("23:00") ? "23:00" : "22:00",
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
