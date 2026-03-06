import { createClient } from "@/lib/supabase/server";
import { SupabaseProductRepository } from "@/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseCategoryRepository } from "@/infrastructure/repositories/SupabaseCategoryRepository";
import { MenuContent } from "@/components/menu/MenuContent";
import { MenuSchema } from "@/components/seo/MenuSchema";
import { getSiteMetadata } from "@/lib/metadata";
import type { ProductWithCategory } from "@/domain/entities/Product";


async function getMenuData() {
  const supabase = await createClient();
  const productRepo = new SupabaseProductRepository(supabase);
  const categoryRepo = new SupabaseCategoryRepository(supabase);

  const [products, categories] = await Promise.all([
    productRepo.findAllWithCategory({ onlyAvailable: true }),
    categoryRepo.findAll(),
  ]);

  // Group products by category, ordered by category sortOrder
  const categoryMap = new Map<string, ProductWithCategory[]>();
  for (const product of products) {
    const catId = product.category.id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, []);
    }
    categoryMap.get(catId)!.push(product);
  }

  // Build ordered categories with their products
  const menuCategories = categories
    .filter((cat) => categoryMap.has(cat.id))
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      products: categoryMap.get(cat.id)!.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        quantity: p.quantity,
        descriptions: p.descriptions,
        price: p.price,
      })),
    }));

  return { menuCategories, products };
}

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: restaurantRows } = await supabase
    .from("restaurants")
    .select("slug, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const restaurants = (restaurantRows || []).map((r) => ({
    id: r.slug,
    name: r.name,
  }));

  const { menuCategories, products } = await getMenuData();
  const meta = await getSiteMetadata();

  return (
    <>
      <MenuSchema products={products} restaurantName={meta.brandName} />
      <MenuContent categories={menuCategories} restaurants={restaurants} />
    </>
  );
}
