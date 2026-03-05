/**
 * POST /api/kitchen/print
 * Manually trigger kitchen printing for a session's orders
 *
 * Body: { sessionId: string, locationSlug: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/SupabaseRestaurantRepository';
import { VendusKitchenPrinter } from '@/infrastructure/services/VendusKitchenPrinter';
import { BrowserKitchenPrinter } from '@/infrastructure/services/BrowserKitchenPrinter';
import { PrintKitchenOrderUseCase } from '@/application/use-cases/kitchen-printing';
import type { OrderForPrint } from '@/domain/services/KitchenPrintService';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !['admin', 'kitchen', 'waiter'].includes(user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { sessionId, locationSlug } = await request.json();
    if (!sessionId || !locationSlug) {
      return NextResponse.json(
        { error: 'sessionId e locationSlug são obrigatórios' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Fetch session with table
    const { data: session } = await supabase
      .from('sessions')
      .select(`
        id,
        table:tables!inner(id, number, name, location)
      `)
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Fetch pending/preparing orders with product + category + zone
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, quantity, notes,
        product:products!inner(
          name,
          category:categories(
            kitchen_zone:kitchen_zones(id, name, slug, color)
          )
        )
      `)
      .eq('session_id', sessionId)
      .in('status', ['pending', 'preparing']);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'Sem pedidos para imprimir', ticketCount: 0 });
    }

    const table = session.table as { id: string; number: number; name: string; location: string };

    const ordersForPrint: OrderForPrint[] = orders.map((o: any) => {
      const zone = o.product?.category?.kitchen_zone;
      return {
        productName: o.product?.name || 'Produto',
        quantity: o.quantity,
        notes: o.notes,
        zone: zone ? { id: zone.id, name: zone.name, slug: zone.slug, color: zone.color } : null,
      };
    });

    // Execute use case
    const restaurantRepo = new SupabaseRestaurantRepository(supabase);
    const vendusPrinter = new VendusKitchenPrinter();
    const browserPrinter = new BrowserKitchenPrinter();
    const useCase = new PrintKitchenOrderUseCase(restaurantRepo, vendusPrinter, browserPrinter);

    const result = await useCase.execute({
      locationSlug,
      table: { name: table.name || `Mesa ${table.number}`, number: table.number },
      orders: ordersForPrint,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API /kitchen/print] Error:', error);
    return NextResponse.json({ error: 'Erro ao imprimir' }, { status: 500 });
  }
}
