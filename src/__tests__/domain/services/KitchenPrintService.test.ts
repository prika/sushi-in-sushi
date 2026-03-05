import { describe, it, expect } from 'vitest';
import {
  KitchenPrintService,
  type OrderForPrint,
  type TableForPrint,
} from '@/domain/services/KitchenPrintService';

const table: TableForPrint = { name: 'Mesa 5', number: 5 };

function zone(id: string, name: string, color: string) {
  return { id, name, slug: name.toLowerCase(), color };
}

const quentes = zone('z1', 'Quentes', '#ef4444');
const frios = zone('z2', 'Frios', '#3b82f6');
const bar = zone('z3', 'Bar', '#f59e0b');

function order(productName: string, zoneData: OrderForPrint['zone'], overrides: Partial<OrderForPrint> = {}): OrderForPrint {
  return { productName, quantity: 1, notes: null, zone: zoneData, ...overrides };
}

describe('KitchenPrintService', () => {
  describe('splitByZone', () => {
    it('deve retornar array vazio se não há pedidos', () => {
      const tickets = KitchenPrintService.splitByZone(table, []);
      expect(tickets).toHaveLength(0);
    });

    it('deve criar 1 ticket se todos os pedidos são da mesma zona', () => {
      const orders = [
        order('Salmão Grelhado', quentes),
        order('Camarão Tempura', quentes, { quantity: 2 }),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      expect(tickets).toHaveLength(1);
      expect(tickets[0].zoneName).toBe('Quentes');
      expect(tickets[0].zoneColor).toBe('#ef4444');
      expect(tickets[0].items).toHaveLength(2);
      expect(tickets[0].items[0].productName).toBe('Salmão Grelhado');
      expect(tickets[0].items[1].quantity).toBe(2);
    });

    it('deve criar 1 ticket por zona distinta', () => {
      const orders = [
        order('Salmão Grelhado', quentes),
        order('Sashimi Misto', frios),
        order('Mojito', bar),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      expect(tickets).toHaveLength(3);

      const names = tickets.map((t) => t.zoneName);
      expect(names).toContain('Quentes');
      expect(names).toContain('Frios');
      expect(names).toContain('Bar');
    });

    it('deve agrupar pedidos da mesma zona', () => {
      const orders = [
        order('Salmão Grelhado', quentes),
        order('Sashimi Misto', frios),
        order('Camarão Tempura', quentes),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      expect(tickets).toHaveLength(2);
      const quentesTicket = tickets.find((t) => t.zoneName === 'Quentes')!;
      expect(quentesTicket.items).toHaveLength(2);
      expect(quentesTicket.items[0].productName).toBe('Salmão Grelhado');
      expect(quentesTicket.items[1].productName).toBe('Camarão Tempura');
    });

    it('deve colocar pedidos sem zona num ticket com zoneName=null', () => {
      const orders = [
        order('Salmão Grelhado', quentes),
        order('Item Sem Zona', null),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      expect(tickets).toHaveLength(2);
      const noZone = tickets.find((t) => t.zoneName === null)!;
      expect(noZone).toBeDefined();
      expect(noZone.items).toHaveLength(1);
      expect(noZone.items[0].productName).toBe('Item Sem Zona');
      expect(noZone.zoneColor).toBeNull();
    });

    it('deve preservar dados da mesa em todos os tickets', () => {
      const orders = [
        order('Item A', quentes),
        order('Item B', frios),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      for (const ticket of tickets) {
        expect(ticket.tableName).toBe('Mesa 5');
        expect(ticket.tableNumber).toBe(5);
      }
    });

    it('deve incluir timestamp em todos os tickets', () => {
      const orders = [order('Item A', quentes), order('Item B', frios)];
      const before = new Date();

      const tickets = KitchenPrintService.splitByZone(table, orders);

      for (const ticket of tickets) {
        expect(ticket.timestamp).toBeInstanceOf(Date);
        expect(ticket.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }
    });

    it('deve usar o mesmo timestamp para todos os tickets do mesmo split', () => {
      const orders = [
        order('A', quentes),
        order('B', frios),
        order('C', bar),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      const ts = tickets[0].timestamp.getTime();
      expect(tickets[1].timestamp.getTime()).toBe(ts);
      expect(tickets[2].timestamp.getTime()).toBe(ts);
    });

    it('deve preservar notes nos items', () => {
      const orders = [
        order('Salmão', quentes, { notes: 'Sem wasabi' }),
        order('Camarão', quentes, { notes: null }),
      ];

      const tickets = KitchenPrintService.splitByZone(table, orders);

      expect(tickets[0].items[0].notes).toBe('Sem wasabi');
      expect(tickets[0].items[1].notes).toBeNull();
    });

    it('deve funcionar com mesa sem número', () => {
      const tableNoNumber: TableForPrint = { name: 'Balcão', number: null };
      const orders = [order('Cerveja', bar)];

      const tickets = KitchenPrintService.splitByZone(tableNoNumber, orders);

      expect(tickets[0].tableName).toBe('Balcão');
      expect(tickets[0].tableNumber).toBeNull();
    });
  });

  describe('combinedTicket', () => {
    it('deve criar um único ticket com todos os pedidos', () => {
      const orders = [
        order('Salmão', quentes),
        order('Sashimi', frios),
        order('Mojito', bar),
      ];

      const ticket = KitchenPrintService.combinedTicket(table, orders);

      expect(ticket.items).toHaveLength(3);
      expect(ticket.zoneName).toBeNull();
      expect(ticket.zoneColor).toBeNull();
    });

    it('deve retornar ticket com items vazio se não há pedidos', () => {
      const ticket = KitchenPrintService.combinedTicket(table, []);

      expect(ticket.items).toHaveLength(0);
      expect(ticket.tableName).toBe('Mesa 5');
    });

    it('deve preservar dados da mesa', () => {
      const ticket = KitchenPrintService.combinedTicket(table, [order('A', quentes)]);

      expect(ticket.tableName).toBe('Mesa 5');
      expect(ticket.tableNumber).toBe(5);
    });

    it('deve preservar quantity e notes de cada item', () => {
      const orders = [
        order('Salmão', quentes, { quantity: 3, notes: 'Bem passado' }),
        order('Água', null, { quantity: 1, notes: null }),
      ];

      const ticket = KitchenPrintService.combinedTicket(table, orders);

      expect(ticket.items[0].quantity).toBe(3);
      expect(ticket.items[0].notes).toBe('Bem passado');
      expect(ticket.items[1].quantity).toBe(1);
      expect(ticket.items[1].notes).toBeNull();
    });

    it('deve ignorar zonas dos pedidos (tudo combinado)', () => {
      const orders = [
        order('A', quentes),
        order('B', frios),
        order('C', null),
      ];

      const ticket = KitchenPrintService.combinedTicket(table, orders);

      expect(ticket.zoneName).toBeNull();
      expect(ticket.zoneColor).toBeNull();
      expect(ticket.items).toHaveLength(3);
    });

    it('deve incluir timestamp', () => {
      const before = new Date();
      const ticket = KitchenPrintService.combinedTicket(table, [order('A', quentes)]);

      expect(ticket.timestamp).toBeInstanceOf(Date);
      expect(ticket.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
