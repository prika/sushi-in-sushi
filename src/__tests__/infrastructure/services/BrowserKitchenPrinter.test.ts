import { describe, it, expect } from 'vitest';
import { BrowserKitchenPrinter } from '@/infrastructure/services/BrowserKitchenPrinter';
import type { KitchenPrintTicket } from '@/domain/services/KitchenPrintService';

function createTestTicket(overrides: Partial<KitchenPrintTicket> = {}): KitchenPrintTicket {
  return {
    tableName: 'Mesa 3',
    tableNumber: 3,
    zoneName: null,
    zoneColor: null,
    items: [
      { productName: 'Salmão Grelhado', quantity: 2, notes: null },
      { productName: 'Edamame', quantity: 1, notes: 'Sem sal' },
    ],
    timestamp: new Date('2026-03-04T20:00:00Z'),
    ...overrides,
  };
}

describe('BrowserKitchenPrinter', () => {
  const printer = new BrowserKitchenPrinter();

  describe('printTicket', () => {
    it('deve retornar success=true com HTML', async () => {
      const result = await printer.printTicket(createTestTicket());

      expect(result.success).toBe(true);
      expect(result.html).toBeDefined();
      expect(typeof result.html).toBe('string');
    });

    it('HTML deve conter nome da mesa', async () => {
      const result = await printer.printTicket(createTestTicket({ tableNumber: 7 }));

      expect(result.html).toContain('Mesa 7');
    });

    it('HTML deve conter nomes dos produtos', async () => {
      const result = await printer.printTicket(createTestTicket());

      expect(result.html).toContain('Salmão Grelhado');
      expect(result.html).toContain('Edamame');
    });

    it('HTML deve conter quantidades', async () => {
      const result = await printer.printTicket(createTestTicket());

      expect(result.html).toContain('2x');
      expect(result.html).toContain('1x');
    });

    it('HTML deve conter notes quando presentes', async () => {
      const result = await printer.printTicket(createTestTicket());

      expect(result.html).toContain('Sem sal');
    });

    it('HTML deve usar tableName como fallback quando tableNumber é null', async () => {
      const result = await printer.printTicket(
        createTestTicket({ tableName: 'Balcão', tableNumber: null }),
      );

      expect(result.html).toContain('Mesa Balcão');
    });
  });

  describe('printTicket com zona', () => {
    it('deve incluir header colorido da zona', async () => {
      const result = await printer.printTicket(
        createTestTicket({ zoneName: 'Quentes', zoneColor: '#ef4444' }),
      );

      expect(result.html).toContain('QUENTES');
      expect(result.html).toContain('#ef4444');
    });

    it('deve usar cor #333 se zoneColor é null', async () => {
      const result = await printer.printTicket(
        createTestTicket({ zoneName: 'Geral', zoneColor: null }),
      );

      expect(result.html).toContain('GERAL');
      expect(result.html).toContain('#333');
    });

    it('não deve incluir zone header quando zoneName é null', async () => {
      const result = await printer.printTicket(createTestTicket({ zoneName: null }));

      expect(result.html).not.toContain('QUENTES');
      // No zone header div
      expect(result.html).not.toMatch(/background:#[a-f0-9]+;color:#fff.*font-weight:bold/);
    });
  });

  describe('printTickets', () => {
    it('deve combinar múltiplos tickets com page-break', async () => {
      const tickets = [
        createTestTicket({ zoneName: 'Quentes' }),
        createTestTicket({ zoneName: 'Frios' }),
      ];

      const result = await printer.printTickets(tickets);

      expect(result.success).toBe(true);
      expect(result.html).toContain('QUENTES');
      expect(result.html).toContain('FRIOS');
      expect(result.html).toContain('page-break-after');
    });

    it('deve funcionar com um único ticket (sem page-break)', async () => {
      const result = await printer.printTickets([createTestTicket()]);

      expect(result.success).toBe(true);
      expect(result.html).not.toContain('page-break-after');
    });

    it('deve funcionar com array vazio', async () => {
      const result = await printer.printTickets([]);

      expect(result.success).toBe(true);
      expect(result.html).toBe('');
    });
  });

  describe('generateTicketHtml (static)', () => {
    it('deve ter largura 72mm', () => {
      const html = BrowserKitchenPrinter.generateTicketHtml(createTestTicket());

      expect(html).toContain('width:72mm');
    });

    it('deve usar font monospace', () => {
      const html = BrowserKitchenPrinter.generateTicketHtml(createTestTicket());

      expect(html).toContain('font-family:monospace');
    });

    it('deve mostrar contagem de items', () => {
      const ticket = createTestTicket({
        items: [
          { productName: 'A', quantity: 1, notes: null },
          { productName: 'B', quantity: 1, notes: null },
          { productName: 'C', quantity: 1, notes: null },
        ],
      });

      const html = BrowserKitchenPrinter.generateTicketHtml(ticket);

      expect(html).toContain('3 item(s)');
    });
  });
});
