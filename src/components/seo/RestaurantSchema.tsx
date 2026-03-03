import { unstable_cache } from "next/cache";
import { APP_URL } from "@/lib/config/constants";
import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  address: string;
  description: string | null;
  address_locality: string | null;
  address_country: string | null;
  google_maps_url: string | null;
  phone: string | null;
  opens_at: string | null;
  closes_at: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

interface ProductRow {
  id: number | string;
  name: string;
  description: string | null;
  descriptions: Record<string, string> | null;
  seo_description: string | null;
  seo_descriptions: Record<string, string> | null;
  price: number;
  image_url: string | null;
  category: { id: number | string; name: string } | null;
}

interface SiteSettingsRow {
  brand_name: string;
  description: string | null;
  price_range: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_reviews_url: string | null;
  tripadvisor_url: string | null;
  thefork_url: string | null;
  zomato_url: string | null;
  google_maps_url: string | null;
}

interface ClosureRow {
  location: string | null;
  recurring_day_of_week: number;
}

interface HoursRow {
  restaurant_slug: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
}

// Day index (0=Sun) → schema.org day name
const SCHEMA_DAY: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function fetchSchemaData() {
  try {
    const supabase = await createClient();

    // biome-ignore lint/suspicious/noExplicitAny: DB types don't include newer columns yet
    const [restaurantsRes, productsRes, settingsRes, closuresRes, hoursRes] = await Promise.all([
      (supabase as any)
        .from("restaurants")
        .select(
          "id, name, slug, address, description, address_locality, address_country, google_maps_url, phone, opens_at, closes_at, latitude, longitude, is_active",
        )
        .eq("is_active", true)
        .order("name", { ascending: true }),

      (supabase as any)
        .from("products")
        .select(
          "id, name, description, descriptions, seo_description, seo_descriptions, price, image_url, category:categories(id, name)",
        )
        .eq("is_available", true)
        .order("sort_order", { ascending: true }),

      (supabase as any)
        .from("site_settings")
        .select("brand_name, description, price_range, facebook_url, instagram_url, google_reviews_url, tripadvisor_url, thefork_url, zomato_url, google_maps_url")
        .eq("id", 1)
        .single(),

      (supabase as any)
        .from("restaurant_closures")
        .select("location, recurring_day_of_week")
        .eq("is_recurring", true),

      (supabase as any)
        .from("restaurant_hours")
        .select("restaurant_slug, day_of_week, opens_at, closes_at")
        .order("day_of_week", { ascending: true }),
    ]);

    const restaurants: RestaurantRow[] = restaurantsRes.data ?? [];
    const products: ProductRow[] = productsRes.data ?? [];
    const settings: SiteSettingsRow | null = settingsRes.data ?? null;
    const closures: ClosureRow[] = closuresRes.data ?? [];
    const hours: HoursRow[] = hoursRes.data ?? [];

    return { restaurants, products, settings, closures, hours };
  } catch {
    return { restaurants: [], products: [], settings: null, closures: [], hours: [] };
  }
}

const getCachedSchemaData = unstable_cache(
  fetchSchemaData,
  ["restaurant-schema-data"],
  { revalidate: 86400, tags: ["restaurant-menu-schema"] },
);

// ─── Builders ────────────────────────────────────────────────────────────────

function buildMenuSections(products: ProductRow[]) {
  if (!products.length) return null;

  const sectionMap = new Map<string, { name: string; items: ProductRow[] }>();
  for (const product of products) {
    const cat = Array.isArray(product.category)
      ? product.category[0]
      : product.category;
    if (!cat) continue;
    const catId = String(cat.id);
    if (!sectionMap.has(catId)) {
      sectionMap.set(catId, { name: cat.name, items: [] });
    }
    sectionMap.get(catId)!.items.push(product);
  }

  return Array.from(sectionMap.values()).map((section) => ({
    "@type": "MenuSection",
    name: section.name,
    hasMenuItem: section.items.map((p) => {
      const desc =
        p.seo_descriptions?.pt ||
        p.seo_description ||
        p.descriptions?.pt ||
        p.description ||
        undefined;

      const item: Record<string, unknown> = {
        "@type": "MenuItem",
        name: p.name,
        offers: {
          "@type": "Offer",
          price: p.price.toFixed(2),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
      };
      if (desc) item.description = desc;
      if (p.image_url) item.image = p.image_url;
      return item;
    }),
  }));
}

/** Returns the days of the week a restaurant is open, excluding recurring closures. */
function buildOpenDays(slug: string, closures: ClosureRow[]): string[] {
  // A closure applies if location matches slug, OR location is null (applies to all)
  const closedDays = new Set(
    closures
      .filter((c) => c.location === slug || c.location === null)
      .map((c) => c.recurring_day_of_week),
  );

  return [0, 1, 2, 3, 4, 5, 6]
    .filter((d) => !closedDays.has(d))
    .map((d) => SCHEMA_DAY[d]);
}

/** Builds schema.org OpeningHoursSpecification from per-day hours, grouping identical shifts. */
function buildOpeningHoursSpecs(slug: string, hours: HoursRow[]) {
  const restaurantHours = hours.filter((h) => h.restaurant_slug === slug);
  if (restaurantHours.length === 0) return undefined;

  // Group by shift (same opens+closes) → collect days
  const shiftMap = new Map<string, number[]>();
  for (const h of restaurantHours) {
    const key = `${h.opens_at}|${h.closes_at}`;
    if (!shiftMap.has(key)) shiftMap.set(key, []);
    shiftMap.get(key)!.push(h.day_of_week);
  }

  return Array.from(shiftMap.entries()).map(([key, days]) => {
    const [opens, closes] = key.split("|");
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days.sort((a, b) => a - b).map((d) => SCHEMA_DAY[d]),
      opens,
      closes,
    };
  });
}

function buildDepartment(restaurant: RestaurantRow, closures: ClosureRow[], hours: HoursRow[]) {
  const hoursSpecs = buildOpeningHoursSpecs(restaurant.slug, hours);

  // Fallback to opens_at/closes_at if no per-day hours exist
  const openingHoursSpecification = hoursSpecs ?? (() => {
    const openDays = buildOpenDays(restaurant.slug, closures);
    return openDays.length > 0
      ? [{
          "@type": "OpeningHoursSpecification" as const,
          dayOfWeek: openDays,
          opens: restaurant.opens_at ?? "12:00",
          closes: restaurant.closes_at ?? "23:00",
        }]
      : undefined;
  })();

  const dept: Record<string, unknown> = {
    "@type": "Restaurant",
    name: restaurant.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.address,
      addressLocality: restaurant.address_locality ?? "Porto",
      addressCountry: restaurant.address_country ?? "PT",
    },
    openingHoursSpecification,
  };

  if (restaurant.phone) dept.telephone = restaurant.phone;
  if (restaurant.description) dept.description = restaurant.description;
  if (restaurant.google_maps_url) dept.hasMap = restaurant.google_maps_url;
  if (restaurant.latitude && restaurant.longitude) {
    dept.geo = {
      "@type": "GeoCoordinates",
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    };
  }

  return dept;
}

// ─── Component ───────────────────────────────────────────────────────────────

export async function RestaurantSchema() {
  const { restaurants, products, settings, closures, hours } = await getCachedSchemaData();

  const menuSections = buildMenuSections(products);

  // Brand data — fall back to sensible defaults if DB not yet populated
  const brandName = settings?.brand_name ?? "Sushi in Sushi";
  const brandDescription =
    settings?.description ??
    "Restaurante de sushi fusion no Porto. Rodízio, à carta, delivery e takeaway.";
  const priceRange = settings?.price_range ?? "€€-€€€";

  // sameAs: social media + review/discovery platforms
  const sameAs: string[] = [];
  if (settings?.instagram_url) sameAs.push(settings.instagram_url);
  if (settings?.facebook_url) sameAs.push(settings.facebook_url);
  if (settings?.google_reviews_url) sameAs.push(settings.google_reviews_url);
  if (settings?.tripadvisor_url) sameAs.push(settings.tripadvisor_url);
  if (settings?.thefork_url) sameAs.push(settings.thefork_url);
  if (settings?.zomato_url) sameAs.push(settings.zomato_url);

  const globalMapsUrl = settings?.google_maps_url;

  // Primary opening hours (from first active restaurant)
  const primaryRestaurant = restaurants[0];
  const primaryHoursSpecs = primaryRestaurant
    ? buildOpeningHoursSpecs(primaryRestaurant.slug, hours)
    : undefined;

  // Fallback to opens_at/closes_at if no per-day hours
  const primaryOpeningHours = primaryHoursSpecs ?? (() => {
    const openDays = primaryRestaurant
      ? buildOpenDays(primaryRestaurant.slug, closures)
      : Object.values(SCHEMA_DAY);
    return openDays.length > 0
      ? [{
          "@type": "OpeningHoursSpecification" as const,
          dayOfWeek: openDays,
          opens: primaryRestaurant?.opens_at ?? "12:00",
          closes: primaryRestaurant?.closes_at ?? "23:00",
        }]
      : undefined;
  })();

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: brandName,
    description: brandDescription,
    url: APP_URL,
    logo: `${APP_URL}/logo.png`,
    image: [
      {
        "@type": "ImageObject",
        url: `${APP_URL}/restaurant-hero.jpg`,
        width: 840,
        height: 630,
      },
      {
        "@type": "ImageObject",
        url: `${APP_URL}/logo.png`,
        width: 500,
        height: 500,
      },
    ],
    servesCuisine: "Japanese, Sushi, Fusion",
    priceRange,
    acceptsReservations: true,
    menu: `${APP_URL}/pt/menu`,
    openingHoursSpecification: primaryOpeningHours,
  };

  if (primaryRestaurant?.phone) schema.telephone = primaryRestaurant.phone;
  if (globalMapsUrl) schema.hasMap = globalMapsUrl;
  if (sameAs.length > 0) schema.sameAs = sameAs;

  if (restaurants.length > 0) {
    schema.address = restaurants.map((r) => ({
      "@type": "PostalAddress",
      streetAddress: r.address,
      addressLocality: r.address_locality ?? "Porto",
      addressCountry: r.address_country ?? "PT",
    }));

    if (restaurants.length > 1) {
      schema.department = restaurants.map((r) => buildDepartment(r, closures, hours));
    }
  }

  if (menuSections) {
    schema.hasMenu = {
      "@type": "Menu",
      hasMenuSection: menuSections,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
