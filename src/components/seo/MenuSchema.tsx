import { APP_URL } from "@/lib/config/constants";

interface MenuSchemaItem {
  name: string;
  description?: string;
  price: number;
  pieces?: number;
  image?: string;
}

interface MenuSchemaCategory {
  name: string;
  items: MenuSchemaItem[];
}

interface MenuSchemaProps {
  categories: MenuSchemaCategory[];
  restaurantName?: string;
}

export function MenuSchema({
  categories,
  restaurantName = "Circunvalação",
}: MenuSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Menu ${restaurantName}`,
    description: `Menu completo do restaurante ${restaurantName} no Porto.`,
    url: `${APP_URL}/pt/menu`,
    inLanguage: "pt",
    hasMenuSection: categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      hasMenuItem: category.items.slice(0, 20).map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: item.price.toFixed(2),
        },
        ...(item.image ? { image: `${APP_URL}${item.image}` } : {}),
      })),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
