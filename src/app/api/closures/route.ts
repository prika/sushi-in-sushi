import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth";
import { SupabaseRestaurantClosureRepository } from "@/infrastructure/repositories/SupabaseRestaurantClosureRepository";
import {
  GetAllClosuresUseCase,
  CreateClosureUseCase,
  DeleteClosureUseCase,
} from "@/application/use-cases/closures";
import type { ClosureFilter, CreateClosureData } from "@/domain/entities/RestaurantClosure";
import type { Location } from "@/types/database";

// GET - List closures
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantClosureRepository(supabase);
    const getAllClosures = new GetAllClosuresUseCase(repository);

    const { searchParams } = new URL(request.url);

    const location = searchParams.get("location") as Location | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeRecurring = searchParams.get("includeRecurring") !== "false";

    const filter: ClosureFilter = {};

    if (location) {
      filter.location = location;
    }
    if (startDate) {
      filter.dateFrom = startDate;
    }
    if (endDate) {
      filter.dateTo = endDate;
    }
    if (!includeRecurring) {
      filter.isRecurring = false;
    }

    const result = await getAllClosures.execute(filter);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Map to database format for backwards compatibility
    const data = result.data.map((closure) => ({
      id: closure.id,
      closure_date: closure.closureDate,
      location: closure.location,
      reason: closure.reason,
      is_recurring: closure.isRecurring,
      recurring_day_of_week: closure.recurringDayOfWeek,
      created_by: closure.createdBy,
      created_at: closure.createdAt.toISOString(),
      updated_at: closure.updatedAt.toISOString(),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching closures:", error);
    return NextResponse.json(
      { error: "Erro ao carregar dias de folga" },
      { status: 500 }
    );
  }
}

// POST - Create new closure (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Only admins can create closures
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir dias de folga" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantClosureRepository(supabase);
    const createClosure = new CreateClosureUseCase(repository);

    const body = await request.json();

    // Validate required fields
    if (!body.closure_date && !body.closureDate && !body.is_recurring && !body.isRecurring) {
      return NextResponse.json(
        { error: "Data de fecho é obrigatória" },
        { status: 400 }
      );
    }

    const isRecurring = body.is_recurring ?? body.isRecurring ?? false;
    const recurringDayOfWeek = body.recurring_day_of_week ?? body.recurringDayOfWeek;

    if (isRecurring && (recurringDayOfWeek === undefined || recurringDayOfWeek === null)) {
      return NextResponse.json(
        { error: "Dia da semana é obrigatório para fechos recorrentes" },
        { status: 400 }
      );
    }

    // Build CreateClosureData from request body (supporting both camelCase and snake_case)
    const closureData: CreateClosureData = {
      closureDate: body.closureDate || body.closure_date || (isRecurring ? "1970-01-01" : ""),
      location: body.location || null,
      reason: body.reason || null,
      isRecurring,
      recurringDayOfWeek: isRecurring ? recurringDayOfWeek : null,
    };

    const result = await createClosure.execute(closureData, auth.id);

    if (!result.success) {
      if (result.error.includes("duplicate") || result.error.includes("já existe")) {
        return NextResponse.json(
          { error: "Já existe um fecho para esta data/localização" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Map to database format for backwards compatibility
    const data = {
      id: result.data.id,
      closure_date: result.data.closureDate,
      location: result.data.location,
      reason: result.data.reason,
      is_recurring: result.data.isRecurring,
      recurring_day_of_week: result.data.recurringDayOfWeek,
      created_by: result.data.createdBy,
      created_at: result.data.createdAt.toISOString(),
      updated_at: result.data.updatedAt.toISOString(),
    };

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating closure:", error);
    return NextResponse.json(
      { error: "Erro ao criar dia de folga" },
      { status: 500 }
    );
  }
}

// DELETE - Remove closure (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Only admins can delete closures
    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem gerir dias de folga" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const repository = new SupabaseRestaurantClosureRepository(supabase);
    const deleteClosure = new DeleteClosureUseCase(repository);

    const result = await deleteClosure.execute(parseInt(id));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting closure:", error);
    return NextResponse.json(
      { error: "Erro ao remover dia de folga" },
      { status: 500 }
    );
  }
}
