import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { action, entityType, entityId, details } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    await logActivity(user.id, action, entityType, entityId, details);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json(
      { error: "Erro ao registar atividade" },
      { status: 500 }
    );
  }
}
