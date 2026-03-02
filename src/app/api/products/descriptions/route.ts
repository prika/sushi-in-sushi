import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * PUT /api/products/descriptions
 * Save multi-lang descriptions JSONB for a product
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 });
    }

    const { productId, descriptions } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("products")
      .update({
        descriptions: descriptions || {},
        description: descriptions?.pt ?? null,
      } as Record<string, unknown>)
      .eq("id", productId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Error saving descriptions:", error);
    return NextResponse.json({ error: "Failed to save descriptions" }, { status: 500 });
  }
}
