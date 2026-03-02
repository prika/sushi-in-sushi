import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getVendusConfig } from "@/lib/vendus/config";
import { getVendusClient } from "@/lib/vendus/client";
import type { VendusProduct, VendusProductsResponse } from "@/lib/vendus/types";

export const dynamic = "force-dynamic";

interface VendusCategory {
  id: string;
  title?: string;
  name?: string;
}

interface VendusCategoriesResponse {
  categories?: VendusCategory[];
  data?: VendusCategory[];
}

function vendusCategoryToServiceMode(categoryName: string | undefined | null): string | null {
  if (!categoryName) return null;
  const n = categoryName.toLowerCase().trim();
  if (n.includes("delivery") || n.includes("entrega")) return "delivery";
  if (n.includes("take away") || n.includes("takeaway") || n.includes("levar"))
    return "takeaway";
  return null;
}

/**
 * GET /api/vendus/products/list?locationSlug=circunvalacao
 * Fetch products directly from Vendus API (read-only view)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso nao autorizado" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const locationSlug = searchParams.get("locationSlug");

    if (!locationSlug) {
      return NextResponse.json(
        { error: "locationSlug obrigatorio" },
        { status: 400 },
      );
    }

    const config = await getVendusConfig(locationSlug);
    if (!config) {
      return NextResponse.json(
        { error: `Vendus nao configurado para ${locationSlug}` },
        { status: 400 },
      );
    }

    const client = getVendusClient(config, locationSlug);

    // Fetch products
    let products: VendusProduct[] = [];
    let page = 1;
    const perPage = 200;
    let hasMore = true;

    while (hasMore) {
      const raw = await client.get<VendusProduct[] | VendusProductsResponse>(
        `/products?per_page=${perPage}&page=${page}`,
      );
      const pageProducts = Array.isArray(raw) ? raw : raw.products || [];
      products = products.concat(pageProducts);
      hasMore = pageProducts.length === perPage;
      page++;
    }

    // Fetch Vendus categories to resolve category_id → service mode
    const vendusCategoryMap = new Map<number, string>();
    try {
      const rawCats = await client.get<
        VendusCategory[] | VendusCategoriesResponse
      >("/products/categories?per_page=500");
      let cats: VendusCategory[] = [];
      if (Array.isArray(rawCats)) {
        cats = rawCats;
      } else if (rawCats && typeof rawCats === "object") {
        const obj = rawCats as Record<string, unknown>;
        cats = (obj.categories || obj.product_categories || obj.data || []) as VendusCategory[];
        if (!Array.isArray(cats) || cats.length === 0) {
          for (const val of Object.values(obj)) {
            if (Array.isArray(val) && val.length > 0 && val[0]?.id !== undefined) {
              cats = val as VendusCategory[];
              break;
            }
          }
        }
      }
      for (const vc of cats) {
        const catName = vc.title || vc.name;
        if (catName) vendusCategoryMap.set(Number(vc.id), catName);
      }
    } catch {
      // Categories unavailable — products will have no service_mode
    }

    return NextResponse.json({
      count: products.length,
      categoriesLoaded: vendusCategoryMap.size,
      categories: Array.from(vendusCategoryMap.entries()).map(([id, name]) => ({
        id,
        name,
        service_mode: vendusCategoryToServiceMode(name),
      })),
      products: products.map((p) => {
        const catName = p.category_id
          ? vendusCategoryMap.get(Number(p.category_id)) || null
          : null;
        const serviceMode = vendusCategoryToServiceMode(catName);
        return {
          id: String(p.id),
          title: p.title,
          reference: p.reference,
          gross_price: p.gross_price,
          tax_id: p.tax_id,
          category_id: p.category_id ? String(p.category_id) : null,
          category_name: catName,
          service_mode: serviceMode,
          status: p.status,
          updated_at: p.updated_at,
        };
      }),
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao contactar Vendus";
    console.error("Erro ao listar produtos Vendus:", error);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
