import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SupabaseOrderRepository } from "@/infrastructure/repositories/SupabaseOrderRepository";
import { SupabaseProductRepository } from "@/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseSessionRepository } from "@/infrastructure/repositories/SupabaseSessionRepository";
import { CreateOrderUseCase } from "@/application/use-cases/orders/CreateOrderUseCase";
import { SupabaseReservationSettingsRepository } from "@/infrastructure/repositories/SupabaseReservationSettingsRepository";
import { GetReservationSettingsUseCase } from "@/application/use-cases/reservation-settings";
import type { CreateOrderDTO } from "@/application/dto/OrderDTO";

export const dynamic = "force-dynamic";

interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  sessionCustomerId?: string;
}

/**
 * POST /api/orders
 * Create orders with server-side price validation.
 * No auth required — called from mesa page by customers.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo do pedido invalido" },
        { status: 400 },
      );
    }

    const { sessionId, items } = body;

    // Validate sessionId
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "ID da sessao obrigatorio" },
        { status: 400 },
      );
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items do pedido obrigatorios" },
        { status: 400 },
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || typeof item.productId !== "string") {
        return NextResponse.json(
          { error: "productId obrigatorio em cada item" },
          { status: 400 },
        );
      }
      if (
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return NextResponse.json(
          { error: "Quantidade invalida (1-99)" },
          { status: 400 },
        );
      }
    }

    // Instantiate repositories with admin client (bypasses RLS)
    const supabase = createAdminClient();
    const orderRepository = new SupabaseOrderRepository(supabase);
    const productRepository = new SupabaseProductRepository(supabase);
    const sessionRepository = new SupabaseSessionRepository(supabase);

    // Validate session exists and is active
    const session = await sessionRepository.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Sessao nao encontrada" },
        { status: 404 },
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Sessao nao esta ativa" },
        { status: 400 },
      );
    }

    // Check ordering mode
    if (session.orderingMode === "waiter_only") {
      return NextResponse.json(
        { error: "Apenas o empregado pode fazer pedidos neste momento" },
        { status: 403 },
      );
    }

    // Piece limiter enforcement (block mode only, rodizio sessions)
    if (session.isRodizio) {
      const settingsRepo = new SupabaseReservationSettingsRepository(supabase);
      const settingsUseCase = new GetReservationSettingsUseCase(settingsRepo);
      const settingsResult = await settingsUseCase.execute();

      if (settingsResult.success && settingsResult.data.pieceLimiterEnabled) {
        const settings = settingsResult.data;

        if (settings.pieceLimiterMode === "block") {
          const totalPieces = (items as OrderItemInput[]).reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          const maxPieces =
            settings.pieceLimiterMaxPerPerson * (session.numPeople || 1);

          if (totalPieces > maxPieces) {
            return NextResponse.json(
              {
                error: `Limite excedido: máximo ${maxPieces} peças por pedido (${settings.pieceLimiterMaxPerPerson} por pessoa)`,
                code: "PIECE_LIMIT_EXCEEDED",
              },
              { status: 400 },
            );
          }
        }
      }
    }

    // Create orders via use case (server-side price validation)
    const createOrderUseCase = new CreateOrderUseCase(
      orderRepository,
      productRepository,
    );

    const orderDTOs: CreateOrderDTO[] = (items as OrderItemInput[]).map(
      (item) => ({
        sessionId,
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes || undefined,
        sessionCustomerId: item.sessionCustomerId || undefined,
      }),
    );

    const result = await createOrderUseCase.executeMultiple(orderDTOs);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Recalculate and update session total
    const newTotal = await sessionRepository.calculateTotal(sessionId);
    await sessionRepository.update(sessionId, { totalAmount: newTotal });

    // Return created orders in snake_case
    const orders = result.data.map((order) => ({
      id: order.id,
      session_id: order.sessionId,
      product_id: order.productId,
      quantity: order.quantity,
      unit_price: order.unitPrice,
      notes: order.notes,
      status: order.status,
      session_customer_id: order.sessionCustomerId,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      { orders, total_amount: newTotal },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API /orders POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao criar pedidos" },
      { status: 500 },
    );
  }
}
