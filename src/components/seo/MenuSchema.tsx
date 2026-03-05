import { APP_URL } from "@/lib/config/constants";
import type { ProductWithCategory } from "@/domain/entities/Product";

interface MenuSchemaProps {
  products: ProductWithCategory[];
  restaurantName?: string;
}

export function MenuSchema({
  products,
  restaurantName = "Sushi in Sushi",
}: MenuSchemaProps) {
  // Group products by category
  const sectionMap = new Map<string, { name: string; items: ProductWithCategory[] }>();
  for (const product of products) {
    const catName = product.category.name;
    if (!sectionMap.has(catName)) {
      sectionMap.set(catName, { name: catName, items: [] });
    }
    sectionMap.get(catName)!.items.push(product);
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Menu ${restaurantName}`,
    description: `Menu completo do restaurante ${restaurantName} no Porto.`,
    url: `${APP_URL}/pt/menu`,
    inLanguage: "pt",
    hasMenuSection: Array.from(sectionMap.values()).map((section) => ({
      "@type": "MenuSection",
      name: section.name,
      hasMenuItem: section.items.slice(0, 20).map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: item.price.toFixed(2),
        },
        ...(item.imageUrl ? { image: item.imageUrl.startsWith("http") ? item.imageUrl : `${APP_URL}${item.imageUrl}` } : {}),
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
