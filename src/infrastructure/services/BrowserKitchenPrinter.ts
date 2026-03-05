/**
 * BrowserKitchenPrinter - Generates HTML for browser-based thermal ticket printing
 * Returns HTML string that can be rendered in a print window on the client side
 */

import type { IKitchenPrinter, PrintResult } from '@/application/ports/IKitchenPrinter';
import type { KitchenPrintTicket } from '@/domain/services/KitchenPrintService';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class BrowserKitchenPrinter implements IKitchenPrinter {
  /**
   * Generate print HTML for a single ticket
   * This returns the HTML — the API route sends it to the client for window.print()
   */
  async printTicket(ticket: KitchenPrintTicket, _locationSlug: string): Promise<PrintResult & { html?: string }> {
    try {
      const html = BrowserKitchenPrinter.generateTicketHtml(ticket);
      return { success: true, html };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async printTickets(tickets: KitchenPrintTicket[], _locationSlug: string): Promise<PrintResult & { html?: string }> {
    try {
      const htmlParts = tickets.map((t) => BrowserKitchenPrinter.generateTicketHtml(t));
      const html = htmlParts.join('<div style="page-break-after: always;"></div>');
      return { success: true, html };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate thermal-style ticket HTML
   * 80mm width (typical thermal printer)
   */
  static generateTicketHtml(ticket: KitchenPrintTicket): string {
    const time = ticket.timestamp.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const zoneHeader = ticket.zoneName
      ? `<div style="background:${escapeHtml(ticket.zoneColor || '#333')};color:#fff;text-align:center;padding:4px 0;font-weight:bold;font-size:14px;margin-bottom:8px;">
           ${escapeHtml(ticket.zoneName.toUpperCase())}
         </div>`
      : '';

    const itemsHtml = ticket.items
      .map(
        (item) => `
        <tr>
          <td style="font-size:16px;font-weight:bold;padding:4px 0;">${item.quantity}x</td>
          <td style="font-size:14px;padding:4px 8px;">
            ${escapeHtml(item.productName)}
            ${item.notes ? `<br><small style="color:#666;">📝 ${escapeHtml(item.notes)}</small>` : ''}
          </td>
        </tr>`,
      )
      .join('');

    return `
      <div style="width:72mm;font-family:monospace;padding:8px;">
        ${zoneHeader}
        <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
          <div style="font-size:24px;font-weight:bold;">Mesa ${escapeHtml(String(ticket.tableNumber ?? ticket.tableName))}</div>
          <div style="font-size:12px;color:#666;">${time}</div>
        </div>
        <table style="width:100%;">
          ${itemsHtml}
        </table>
        <div style="border-top:1px dashed #000;margin-top:8px;padding-top:4px;text-align:center;font-size:10px;color:#999;">
          ${ticket.items.length} item(s)
        </div>
      </div>
    `;
  }
}
