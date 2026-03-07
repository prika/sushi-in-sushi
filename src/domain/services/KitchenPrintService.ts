/**
 * KitchenPrintService - Domain service for kitchen printing logic
 * Handles splitting orders by zone and building print tickets
 */

export interface KitchenPrintItem {
  productName: string;
  quantity: number;
  notes: string | null;
}

export interface KitchenPrintTicket {
  tableName: string;
  tableNumber: number | null;
  waiterName: string | null;
  zoneName: string | null;
  zoneColor: string | null;
  items: KitchenPrintItem[];
  timestamp: Date;
}

export interface OrderForPrint {
  productName: string;
  quantity: number;
  notes: string | null;
  zone: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
}

export interface TableForPrint {
  name: string;
  number: number | null;
}

export class KitchenPrintService {
  /**
   * Split orders by zone into separate tickets (1 per zone)
   * Orders without a zone go into a "Geral" ticket
   */
  static splitByZone(
    table: TableForPrint,
    orders: OrderForPrint[],
    waiterName?: string | null,
  ): KitchenPrintTicket[] {
    const now = new Date();
    const zoneMap = new Map<string, { zone: OrderForPrint['zone']; items: KitchenPrintItem[] }>();

    for (const order of orders) {
      const zoneKey = order.zone?.id || '__no_zone__';

      if (!zoneMap.has(zoneKey)) {
        zoneMap.set(zoneKey, { zone: order.zone, items: [] });
      }

      zoneMap.get(zoneKey)!.items.push({
        productName: order.productName,
        quantity: order.quantity,
        notes: order.notes,
      });
    }

    return Array.from(zoneMap.values()).map(({ zone, items }) => ({
      tableName: table.name,
      tableNumber: table.number,
      waiterName: waiterName || null,
      zoneName: zone?.name || null,
      zoneColor: zone?.color || null,
      items,
      timestamp: now,
    }));
  }

  /**
   * Combine all orders into a single ticket (no zone split)
   */
  static combinedTicket(
    table: TableForPrint,
    orders: OrderForPrint[],
    waiterName?: string | null,
  ): KitchenPrintTicket {
    return {
      tableName: table.name,
      tableNumber: table.number,
      waiterName: waiterName || null,
      zoneName: null,
      zoneColor: null,
      items: orders.map((o) => ({
        productName: o.productName,
        quantity: o.quantity,
        notes: o.notes,
      })),
      timestamp: new Date(),
    };
  }
}
