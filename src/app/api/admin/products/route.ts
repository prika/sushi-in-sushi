import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 * List all products with categories (admin, bypasses RLS)
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("*").order("sort_order", { ascending: true }),
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    ]);

    if (productsRes.error) {
      return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
    }
    if (categoriesRes.error) {
      return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
    }

    // Count products per category
    const countMap: Record<string, number> = {};
    for (const p of productsRes.data ?? []) {
      countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
    }

    const products = (productsRes.data ?? []).map(mapProductToApi);
    const categories = (categoriesRes.data ?? []).map((c) => ({
      ...mapCategoryToApi(c),
      productCount: countMap[c.id] ?? 0,
    }));

    return NextResponse.json({ products, categories });
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json({ error: "Erro ao obter produtos" }, { status: 500 });
  }
}

/**
 * POST /api/admin/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    const imageUrls = body.imageUrls ?? (body.imageUrl ? [body.imageUrl] : []);
    const firstImage = imageUrls[0] ?? body.imageUrl ?? null;

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: body.name,
        description: body.description || null,
        price: body.price,
        category_id: body.categoryId,
        image_url: firstImage,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        is_available: body.isAvailable ?? true,
        is_rodizio: body.isRodizio ?? false,
        sort_order: body.sortOrder ?? 0,
        quantity: body.quantity ?? 1,
        service_modes: body.serviceModes ?? [],
        service_prices: body.servicePrices ?? {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapProductToApi(data));
  } catch (error) {
    console.error("Admin products POST error:", error);
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products
 * Update a product (expects { id, ...data } in body)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.imageUrls !== undefined) {
      updateData.image_urls = data.imageUrls.length > 0 ? data.imageUrls : null;
      updateData.image_url = data.imageUrls[0] ?? null;
    } else if (data.imageUrl !== undefined) {
      updateData.image_url = data.imageUrl;
    }
    if (data.isAvailable !== undefined) updateData.is_available = data.isAvailable;
    if (data.isRodizio !== undefined) updateData.is_rodizio = data.isRodizio;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.serviceModes !== undefined) updateData.service_modes = data.serviceModes;
    if (data.servicePrices !== undefined) updateData.service_prices = data.servicePrices;

    const { data: product, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "Produto nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(mapProductToApi(product));
  } catch (error) {
    console.error("Admin products PATCH error:", error);
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products
 * Delete a product (expects { id } in body)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin products DELETE error:", error);
    return NextResponse.json({ error: "Erro ao eliminar produto" }, { status: 500 });
  }
}

// --- Helpers ---

function mapProductToApi(data: Record<string, unknown>) {
  const imageUrls = Array.isArray(data.image_urls) && data.image_urls.length > 0
    ? data.image_urls
    : data.image_url
      ? [data.image_url]
      : [];
  const imageUrl = imageUrls[0] ?? data.image_url ?? null;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    categoryId: data.category_id,
    imageUrl,
    imageUrls,
    isAvailable: data.is_available,
    isRodizio: data.is_rodizio,
    sortOrder: data.sort_order,
    quantity: data.quantity ?? 1,
    serviceModes: data.service_modes ?? [],
    servicePrices: data.service_prices ?? {},
    createdAt: data.created_at,
    updatedAt: data.updated_at ?? data.created_at,
  };
}

function mapCategoryToApi(data: Record<string, unknown>) {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    icon: data.icon,
    sortOrder: data.sort_order,
    zoneId: data.zone_id,
    createdAt: data.created_at,
  };
}
