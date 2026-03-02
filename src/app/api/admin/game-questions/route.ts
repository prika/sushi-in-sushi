import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabaseGameQuestionRepository } from "@/infrastructure/repositories/SupabaseGameQuestionRepository";
import type {
  GameQuestionFilter,
  CreateGameQuestionData,
  UpdateGameQuestionData,
  GameType,
} from "@/domain/entities/GameQuestion";

// GET - List game questions (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const repo = new SupabaseGameQuestionRepository(supabase);

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("gameType") as GameType | null;
    const isActive = searchParams.get("isActive");

    const filter: GameQuestionFilter = {};
    if (gameType) filter.gameType = gameType;
    if (isActive !== null) filter.isActive = isActive === "true";

    const questions = await repo.findAll(filter);

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching game questions:", error);
    return NextResponse.json(
      { error: "Erro ao carregar perguntas" },
      { status: 500 }
    );
  }
}

// POST - Create game question (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const repo = new SupabaseGameQuestionRepository(supabase);

    const body = await request.json();

    const data: CreateGameQuestionData = {
      gameType: body.gameType,
      questionText: body.questionText,
      options: body.options ?? null,
      correctAnswerIndex: body.correctAnswerIndex ?? null,
      optionA: body.optionA ?? null,
      optionB: body.optionB ?? null,
      category: body.category ?? null,
      difficulty: body.difficulty ?? 1,
      points: body.points ?? 10,
      isActive: body.isActive ?? true,
      restaurantId: body.restaurantId ?? null,
    };

    if (!data.gameType || !data.questionText) {
      return NextResponse.json(
        { error: "gameType e questionText são obrigatórios" },
        { status: 400 }
      );
    }

    const question = await repo.create(data);
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("Error creating game question:", error);
    return NextResponse.json(
      { error: "Erro ao criar pergunta" },
      { status: 500 }
    );
  }
}

// PUT - Update game question (admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const repo = new SupabaseGameQuestionRepository(supabase);

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id é obrigatório" },
        { status: 400 }
      );
    }

    const data: UpdateGameQuestionData = {};
    if (fields.questionText !== undefined) data.questionText = fields.questionText;
    if (fields.options !== undefined) data.options = fields.options;
    if (fields.correctAnswerIndex !== undefined) data.correctAnswerIndex = fields.correctAnswerIndex;
    if (fields.optionA !== undefined) data.optionA = fields.optionA;
    if (fields.optionB !== undefined) data.optionB = fields.optionB;
    if (fields.category !== undefined) data.category = fields.category;
    if (fields.difficulty !== undefined) data.difficulty = fields.difficulty;
    if (fields.points !== undefined) data.points = fields.points;
    if (fields.isActive !== undefined) data.isActive = fields.isActive;

    const question = await repo.update(id, data);
    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating game question:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar pergunta" },
      { status: 500 }
    );
  }
}

// DELETE - Delete game question (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const repo = new SupabaseGameQuestionRepository(supabase);

    await repo.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting game question:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar pergunta" },
      { status: 500 }
    );
  }
}
