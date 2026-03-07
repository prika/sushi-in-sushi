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

    // Fetch waiter name for this table
    const { data: waiterAssignment } = await supabase
      .from('waiter_tables')
      .select('staff:staff!inner(name)')
      .eq('table_id', (session.table as { id: string }).id)
      .limit(1)
      .maybeSingle();

    const waiterName = (waiterAssignment?.staff as { name: string } | null)?.name || null;

    // Fetch pending/preparing orders with product + category + zone
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, quantity, notes, status,
        product:products!inner(
          name,
          category:categories!category_id(
            zone_id,
            kitchen_zone:kitchen_zones!zone_id(id, name, slug, color)
          )
        )
      `)
      .eq('session_id', sessionId)
      .in('status', ['pending', 'preparing']);

    if (ordersError) {
      console.error('[API /kitchen/print] Orders query error:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

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

    // Log zone distribution for debugging
    const zoneCounts = new Map<string, number>();
    ordersForPrint.forEach(o => {
      const key = o.zone?.name || 'Sem zona';
      zoneCounts.set(key, (zoneCounts.get(key) || 0) + 1);
    });
    console.info('[API /kitchen/print] Zone distribution:', Object.fromEntries(zoneCounts));

    // Execute use case
    const restaurantRepo = new SupabaseRestaurantRepository(supabase);
    const vendusPrinter = new VendusKitchenPrinter();
    const browserPrinter = new BrowserKitchenPrinter();
    const useCase = new PrintKitchenOrderUseCase(restaurantRepo, vendusPrinter, browserPrinter);

    const result = await useCase.execute({
      locationSlug,
      table: { name: table.name || `Mesa ${table.number}`, number: table.number },
      orders: ordersForPrint,
      waiterName,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Auto-advance pending orders to "preparing" after successful print
    const pendingOrderIds = orders
      .filter((o: any) => o.status === 'pending')
      .map((o: any) => o.id);

    if (pendingOrderIds.length > 0) {
      await supabase
        .from('orders')
        .update({ status: 'preparing', preparing_started_at: new Date().toISOString() })
        .in('id', pendingOrderIds);
    }

    return NextResponse.json({
      ...result.data,
      advancedCount: pendingOrderIds.length,
    });
  } catch (error) {
    console.error('[API /kitchen/print] Error:', error);
    return NextResponse.json({ error: 'Erro ao imprimir' }, { status: 500 });
  }
}
