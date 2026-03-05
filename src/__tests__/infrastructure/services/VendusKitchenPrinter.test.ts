import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KitchenPrintTicket } from '@/domain/services/KitchenPrintService';

// Mock vendus modules before import
const mockPost = vi.fn().mockResolvedValue({});
vi.mock('@/lib/vendus/client', () => ({
  getVendusClient: vi.fn(() => ({ post: mockPost })),
}));

const mockGetVendusConfig = vi.fn();
vi.mock('@/lib/vendus/config', () => ({
  getVendusConfig: (...args: unknown[]) => mockGetVendusConfig(...args),
}));

const mockInsert = vi.fn().mockReturnValue({ error: null });
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

// Import after mocks
import { VendusKitchenPrinter } from '@/infrastructure/services/VendusKitchenPrinter';

function createTestTicket(overrides: Partial<KitchenPrintTicket> = {}): KitchenPrintTicket {
  return {
    tableName: 'Mesa 1',
    tableNumber: 1,
    zoneName: 'Quentes',
    zoneColor: '#ef4444',
    items: [
      { productName: 'Salmão Grelhado', quantity: 2, notes: 'Bem passado' },
    ],
    timestamp: new Date(),
    ...overrides,
  };
}

describe('VendusKitchenPrinter', () => {
  let printer: VendusKitchenPrinter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({});
    printer = new VendusKitchenPrinter();
  });

  describe('printTicket', () => {
    it('deve retornar success=true se Vendus não está configurado (skip silently)', async () => {
      mockGetVendusConfig.mockResolvedValue(null);

      const result = await printer.printTicket(createTestTicket(), 'circunvalacao');

      expect(result.success).toBe(true);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('deve chamar Vendus API com dados corretos', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });

      await printer.printTicket(createTestTicket(), 'circunvalacao');

      expect(mockPost).toHaveBeenCalledWith(
        '/kitchen/print',
        expect.objectContaining({
          table_name: 'Mesa 1',
          table_number: 1,
          zone_name: 'Quentes',
          items: [
            expect.objectContaining({
              product_name: 'Salmão Grelhado',
              quantity: 2,
              notes: 'Bem passado',
            }),
          ],
        }),
      );
    });

    it('deve logar sucesso no vendus_sync_log', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });

      await printer.printTicket(createTestTicket({ zoneName: 'Frios' }), 'circunvalacao');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'kitchen_print',
          direction: 'push',
          entity_type: 'order',
          entity_id: 'Frios',
          status: 'success',
        }),
      );
    });

    it('deve usar entity_id "combined" quando zoneName é null', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });

      await printer.printTicket(createTestTicket({ zoneName: null }), 'circunvalacao');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ entity_id: 'combined' }),
      );
    });

    it('deve retornar erro e logar falha se Vendus API falhar', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });
      mockPost.mockRejectedValue(new Error('API timeout'));

      const result = await printer.printTicket(createTestTicket(), 'circunvalacao');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API timeout');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          error_message: 'API timeout',
        }),
      );
    });

    it('deve converter notes null para undefined', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });
      const ticket = createTestTicket({
        items: [{ productName: 'Água', quantity: 1, notes: null }],
      });

      await printer.printTicket(ticket, 'circunvalacao');

      const sentItems = mockPost.mock.calls[0][1].items;
      expect(sentItems[0].notes).toBeUndefined();
    });
  });

  describe('printTickets', () => {
    it('deve imprimir todos os tickets sequencialmente', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });

      const tickets = [
        createTestTicket({ zoneName: 'Quentes' }),
        createTestTicket({ zoneName: 'Frios' }),
      ];

      const result = await printer.printTickets(tickets, 'circunvalacao');

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('deve parar no primeiro erro', async () => {
      mockGetVendusConfig.mockResolvedValue({ apiKey: 'key', storeId: '1', registerId: '1' });
      mockPost
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Falha no segundo'));

      const tickets = [
        createTestTicket({ zoneName: 'Quentes' }),
        createTestTicket({ zoneName: 'Frios' }),
        createTestTicket({ zoneName: 'Bar' }),
      ];

      const result = await printer.printTickets(tickets, 'circunvalacao');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha no segundo');
      // Parou no 2o, não tentou o 3o
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('deve funcionar com array vazio', async () => {
      const result = await printer.printTickets([], 'circunvalacao');

      expect(result.success).toBe(true);
      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
