import { NextResponse } from "next/server";
import { login, setAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e palavra-passe são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await login(email, password);

    if (!result.success || !result.user || !result.token) {
      return NextResponse.json(
        { error: result.error || "Credenciais inválidas" },
        { status: 401 }
      );
    }

    await setAuthCookie(result.token);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        location: result.user.location,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
