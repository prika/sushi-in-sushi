/**
 * VendusKitchenPrinter - Sends kitchen tickets via Vendus API
 */

import type { IKitchenPrinter, PrintResult } from '@/application/ports/IKitchenPrinter';
import type { KitchenPrintTicket } from '@/domain/services/KitchenPrintService';
import { getVendusClient } from '@/lib/vendus/client';
import { getVendusConfig } from '@/lib/vendus/config';
import { createAdminClient } from '@/lib/supabase/server';

export class VendusKitchenPrinter implements IKitchenPrinter {
  async printTicket(ticket: KitchenPrintTicket, locationSlug: string): Promise<PrintResult> {
    const config = await getVendusConfig(locationSlug);
    if (!config) {
      return { success: true }; // Vendus not configured — skip silently
    }

    const client = getVendusClient(config, locationSlug);
    const supabase = createAdminClient();

    try {
      const kitchenOrder = {
        table_name: ticket.tableName,
        table_number: ticket.tableNumber,
        waiter_name: ticket.waiterName || undefined,
        zone_name: ticket.zoneName,
        items: ticket.items.map((item) => ({
          product_name: item.productName,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      };

      await client.post('/kitchen/print', kitchenOrder as unknown as Record<string, unknown>);

      await supabase.from('vendus_sync_log').insert({
        operation: 'kitchen_print',
        direction: 'push',
        entity_type: 'order',
        entity_id: ticket.zoneName || 'combined',
        status: 'success',
        records_processed: ticket.items.length,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('[VendusKitchenPrinter] Print failed:', errorMessage);

      await supabase.from('vendus_sync_log').insert({
        operation: 'kitchen_print',
        direction: 'push',
        entity_type: 'order',
        entity_id: ticket.zoneName || 'combined',
        status: 'error',
        error_message: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  async printTickets(tickets: KitchenPrintTicket[], locationSlug: string): Promise<PrintResult> {
    for (const ticket of tickets) {
      const result = await this.printTicket(ticket, locationSlug);
      if (!result.success) {
        return result;
      }
    }
    return { success: true };
  }
}
