/**
 * PrintKitchenOrderUseCase - Prints kitchen tickets for a session's orders
 * Reads restaurant config to decide: split by zone or combined, Vendus or browser
 */

import type { IKitchenPrinter, PrintResult } from '@/application/ports/IKitchenPrinter';
import type { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import {
  KitchenPrintService,
  type OrderForPrint,
  type TableForPrint,
} from '@/domain/services/KitchenPrintService';
import { Result, Results } from '../Result';

export interface PrintKitchenOrderInput {
  locationSlug: string;
  table: TableForPrint;
  orders: OrderForPrint[];
  waiterName?: string | null;
}

export interface PrintKitchenOrderOutput {
  mode: 'vendus' | 'browser' | 'none';
  ticketCount: number;
  html?: string; // Only for browser mode
}

export class PrintKitchenOrderUseCase {
  constructor(
    private restaurantRepository: IRestaurantRepository,
    private vendusPrinter: IKitchenPrinter,
    private browserPrinter: IKitchenPrinter & { printTickets(tickets: any[], slug: string): Promise<PrintResult & { html?: string }> },
  ) {}

  async execute(input: PrintKitchenOrderInput): Promise<Result<PrintKitchenOrderOutput>> {
    try {
      const { locationSlug, table, orders, waiterName } = input;

      if (orders.length === 0) {
        return Results.success({ mode: 'none', ticketCount: 0 });
      }

      // Get restaurant config
      const restaurant = await this.restaurantRepository.findBySlug(locationSlug);
      if (!restaurant) {
        return Results.error('Restaurante não encontrado', 'RESTAURANT_NOT_FOUND');
      }

      const { kitchenPrintMode, zoneSplitPrinting } = restaurant;

      if (kitchenPrintMode === 'none') {
        return Results.success({ mode: 'none', ticketCount: 0 });
      }

      // Build tickets based on config
      const tickets = zoneSplitPrinting
        ? KitchenPrintService.splitByZone(table, orders, waiterName)
        : [KitchenPrintService.combinedTicket(table, orders, waiterName)];

      if (kitchenPrintMode === 'vendus') {
        const result = await this.vendusPrinter.printTickets(tickets, locationSlug);
        if (!result.success) {
          return Results.error(result.error || 'Erro ao imprimir via Vendus', 'PRINT_ERROR');
        }
        return Results.success({ mode: 'vendus', ticketCount: tickets.length });
      }

      if (kitchenPrintMode === 'browser') {
        const result = await this.browserPrinter.printTickets(tickets, locationSlug);
        if (!result.success) {
          return Results.error(result.error || 'Erro ao gerar impressão', 'PRINT_ERROR');
        }
        return Results.success({
          mode: 'browser',
          ticketCount: tickets.length,
          html: result.html,
        });
      }

      return Results.success({ mode: 'none', ticketCount: 0 });
    } catch (error) {
      return Results.error(
        error instanceof Error ? error.message : 'Erro ao imprimir pedido',
        'PRINT_ERROR',
      );
    }
  }
}
