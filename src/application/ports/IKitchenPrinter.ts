/**
 * IKitchenPrinter - Port for kitchen printing
 * Abstracts the actual printing mechanism (Vendus API, Browser, etc.)
 */

import type { KitchenPrintTicket } from '@/domain/services/KitchenPrintService';

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface IKitchenPrinter {
  printTicket(ticket: KitchenPrintTicket, locationSlug: string): Promise<PrintResult>;
  printTickets(tickets: KitchenPrintTicket[], locationSlug: string): Promise<PrintResult>;
}
