import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ingredients
 * List all ingredients with product usage count
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const [ingRes, piRes] = await Promise.all([
      supabase.from("ingredients").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_ingredients").select("ingredient_id"),
    ]);

    if (ingRes.error) {
      return NextResponse.json({ error: ingRes.error.message }, { status: 500 });
    }
    if (piRes.error) {
      return NextResponse.json({ error: piRes.error.message }, { status: 500 });
    }

    // Count products per ingredient
    const countMap: Record<string, number> = {};
    for (const pi of piRes.data ?? []) {
      countMap[pi.ingredient_id] = (countMap[pi.ingredient_id] ?? 0) + 1;
    }

    const ingredients = (ingRes.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      unit: d.unit,
      sortOrder: d.sort_order,
      productCount: countMap[d.id] ?? 0,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Admin ingredients GET error:", error);
    return NextResponse.json({ error: "Erro ao obter ingredientes" }, { status: 500 });
  }
}

/**
 * POST /api/admin/ingredients
 * Create a new ingredient
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { name, unit, sortOrder } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
    }
    if (!["g", "kg", "ml", "L", "un"].includes(unit)) {
      return NextResponse.json({ error: "Unidade invalida" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check uniqueness
    const { data: existing } = await supabase
      .from("ingredients")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Ingrediente com este nome ja existe" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("ingredients")
      .insert({ name: name.trim(), unit, sort_order: sortOrder ?? 0 })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      unit: data.unit,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error("Admin ingredients POST error:", error);
    return NextResponse.json({ error: "Erro ao criar ingrediente" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/ingredients
 * Update an ingredient (expects { id, ...data })
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
      }
      // Check uniqueness for new name
      const { data: existing } = await supabase
        .from("ingredients")
        .select("id")
        .ilike("name", updates.name.trim())
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "Ingrediente com este nome ja existe" }, { status: 409 });
      }
      updateData.name = updates.name.trim();
    }
    if (updates.unit !== undefined) {
      if (!["g", "kg", "ml", "L", "un"].includes(updates.unit)) {
        return NextResponse.json({ error: "Unidade invalida" }, { status: 400 });
      }
      updateData.unit = updates.unit;
    }
    if (updates.sortOrder !== undefined) updateData.sort_order = Number(updates.sortOrder) || 0;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("ingredients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      unit: data.unit,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error("Admin ingredients PATCH error:", error);
    return NextResponse.json({ error: "Erro ao atualizar ingrediente" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/ingredients
 * Delete an ingredient (expects { id })
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

    // Check if in use
    const { data: usages } = await supabase
      .from("product_ingredients")
      .select("id")
      .eq("ingredient_id", id);

    if (usages && usages.length > 0) {
      return NextResponse.json(
        { error: `Ingrediente em uso por ${usages.length} produto(s). Remova as associacoes primeiro.` },
        { status: 409 },
      );
    }

    const { data: deleted, error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Ingrediente nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin ingredients DELETE error:", error);
    return NextResponse.json({ error: "Erro ao eliminar ingrediente" }, { status: 500 });
  }
}
