import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/product-ingredients?productId=xxx
 * Get ingredients for a specific product, or all products if no productId
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const productId = new URL(request.url).searchParams.get("productId");
    const supabase = createAdminClient();

    let query = supabase
      .from("product_ingredients")
      .select("*, ingredients(name, unit)")
      .order("created_at", { ascending: true });

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ingredients = (data ?? []).map((d) => ({
      id: d.id,
      productId: d.product_id,
      ingredientId: d.ingredient_id,
      quantity: Number(d.quantity),
      ingredientName: (d.ingredients as { name: string; unit: string } | null)?.name ?? "",
      ingredientUnit: (d.ingredients as { name: string; unit: string } | null)?.unit ?? "",
      createdAt: d.created_at,
    }));

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Admin product-ingredients GET error:", error);
    return NextResponse.json({ error: "Erro ao obter ingredientes do produto" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/product-ingredients
 * Replace all ingredients for a product (atomic: delete + insert)
 * Body: { productId, ingredients: [{ ingredientId, quantity }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, ingredients } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId obrigatorio" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Atomic delete + insert via RPC (single transaction)
    const { error: rpcError } = await supabase.rpc("set_product_ingredients", {
      p_product_id: productId,
      p_ingredients: Array.isArray(ingredients)
        ? ingredients.map((ing: { ingredientId: string; quantity: number }) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
          }))
        : [],
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // Return new set
    const { data, error } = await supabase
      .from("product_ingredients")
      .select("*, ingredients(name, unit)")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((d) => ({
      id: d.id,
      productId: d.product_id,
      ingredientId: d.ingredient_id,
      quantity: Number(d.quantity),
      ingredientName: (d.ingredients as { name: string; unit: string } | null)?.name ?? "",
      ingredientUnit: (d.ingredients as { name: string; unit: string } | null)?.unit ?? "",
      createdAt: d.created_at,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin product-ingredients PUT error:", error);
    return NextResponse.json({ error: "Erro ao definir ingredientes do produto" }, { status: 500 });
  }
}
