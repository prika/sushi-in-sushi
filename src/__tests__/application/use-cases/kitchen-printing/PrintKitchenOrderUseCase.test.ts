import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintKitchenOrderUseCase } from '@/application/use-cases/kitchen-printing/PrintKitchenOrderUseCase';
import type { IRestaurantRepository } from '@/domain/repositories/IRestaurantRepository';
import type { IKitchenPrinter } from '@/application/ports/IKitchenPrinter';
import type { Restaurant } from '@/domain/entities/Restaurant';
import type { OrderForPrint, TableForPrint } from '@/domain/services/KitchenPrintService';

function createMockRestaurantRepository(): IRestaurantRepository {
  return {
    findAll: vi.fn(),
    findActive: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    validateSlugUnique: vi.fn(),
  };
}

function createMockPrinter(): IKitchenPrinter & { printTickets: ReturnType<typeof vi.fn> } {
  return {
    printTicket: vi.fn().mockResolvedValue({ success: true }),
    printTickets: vi.fn().mockResolvedValue({ success: true }),
  };
}

function createTestRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'rest-1',
    name: 'Circunvalação',
    slug: 'circunvalacao',
    address: 'Rua Test',
    description: null,
    addressLocality: 'Porto',
    addressCountry: 'PT',
    googleMapsUrl: null,
    phone: null,
    opensAt: '12:00',
    closesAt: '23:00',
    latitude: null,
    longitude: null,
    maxCapacity: 50,
    defaultPeoplePerTable: 4,
    autoTableAssignment: true,
    autoReservations: false,
    autoReservationMaxPartySize: 6,
    orderCooldownMinutes: 0,
    showUpgradeAfterOrder: false,
    showUpgradeAtBill: false,
    gamesEnabled: false,
    gamesMode: 'selection',
    gamesPrizeType: 'none',
    gamesPrizeValue: null,
    gamesPrizeProductId: null,
    gamesMinRoundsForPrize: 3,
    gamesQuestionsPerRound: 5,
    kitchenPrintMode: 'none' as const,
    zoneSplitPrinting: true,
    autoPrintOnOrder: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const table: TableForPrint = { name: 'Mesa 1', number: 1 };

function order(productName: string, zoneId: string | null = null): OrderForPrint {
  return {
    productName,
    quantity: 1,
    notes: null,
    zone: zoneId
      ? { id: zoneId, name: `Zone ${zoneId}`, slug: `zone-${zoneId}`, color: '#ff0000' }
      : null,
  };
}

describe('PrintKitchenOrderUseCase', () => {
  let useCase: PrintKitchenOrderUseCase;
  let mockRestaurantRepo: IRestaurantRepository;
  let mockVendusPrinter: ReturnType<typeof createMockPrinter>;
  let mockBrowserPrinter: ReturnType<typeof createMockPrinter>;

  beforeEach(() => {
    mockRestaurantRepo = createMockRestaurantRepository();
    mockVendusPrinter = createMockPrinter();
    mockBrowserPrinter = createMockPrinter();
    useCase = new PrintKitchenOrderUseCase(
      mockRestaurantRepo,
      mockVendusPrinter,
      mockBrowserPrinter,
    );
  });

  it('deve retornar mode=none e ticketCount=0 se não há pedidos', async () => {
    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('none');
      expect(result.data.ticketCount).toBe(0);
    }
    expect(mockRestaurantRepo.findBySlug).not.toHaveBeenCalled();
  });

  it('deve retornar erro se restaurante não encontrado', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(null);

    const result = await useCase.execute({
      locationSlug: 'inexistente',
      table,
      orders: [order('Salmão')],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('RESTAURANT_NOT_FOUND');
    }
  });

  it('deve retornar mode=none se kitchenPrintMode é none', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'none' }),
    );

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão')],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('none');
      expect(result.data.ticketCount).toBe(0);
    }
    expect(mockVendusPrinter.printTickets).not.toHaveBeenCalled();
    expect(mockBrowserPrinter.printTickets).not.toHaveBeenCalled();
  });

  it('deve usar Vendus printer quando modo é vendus', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'vendus', zoneSplitPrinting: false }),
    );

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão'), order('Camarão')],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('vendus');
      expect(result.data.ticketCount).toBe(1); // combined = 1 ticket
    }
    expect(mockVendusPrinter.printTickets).toHaveBeenCalledTimes(1);
    expect(mockBrowserPrinter.printTickets).not.toHaveBeenCalled();
  });

  it('deve usar Browser printer quando modo é browser', async () => {
    mockBrowserPrinter.printTickets.mockResolvedValue({ success: true, html: '<div>ticket</div>' });
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'browser', zoneSplitPrinting: false }),
    );

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão')],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('browser');
      expect(result.data.html).toBe('<div>ticket</div>');
    }
    expect(mockBrowserPrinter.printTickets).toHaveBeenCalledTimes(1);
  });

  it('deve split por zona quando zoneSplitPrinting=true', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'vendus', zoneSplitPrinting: true }),
    );

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão', 'z1'), order('Sashimi', 'z2'), order('Tempura', 'z1')],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticketCount).toBe(2); // 2 zones
    }
    // Verify tickets were passed correctly
    const ticketsArg = mockVendusPrinter.printTickets.mock.calls[0][0];
    expect(ticketsArg).toHaveLength(2);
  });

  it('deve combinar tickets quando zoneSplitPrinting=false', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'vendus', zoneSplitPrinting: false }),
    );

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão', 'z1'), order('Sashimi', 'z2')],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticketCount).toBe(1); // combined
    }
    const ticketsArg = mockVendusPrinter.printTickets.mock.calls[0][0];
    expect(ticketsArg).toHaveLength(1);
  });

  it('deve retornar erro se Vendus printer falhar', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'vendus' }),
    );
    mockVendusPrinter.printTickets.mockResolvedValue({
      success: false,
      error: 'Vendus API timeout',
    });

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão')],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Vendus');
      expect(result.code).toBe('PRINT_ERROR');
    }
  });

  it('deve retornar erro se Browser printer falhar', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockResolvedValue(
      createTestRestaurant({ kitchenPrintMode: 'browser' }),
    );
    mockBrowserPrinter.printTickets.mockResolvedValue({
      success: false,
      error: 'Render failed',
    });

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão')],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('PRINT_ERROR');
    }
  });

  it('deve capturar exceções inesperadas', async () => {
    vi.mocked(mockRestaurantRepo.findBySlug).mockRejectedValue(new Error('DB crash'));

    const result = await useCase.execute({
      locationSlug: 'circunvalacao',
      table,
      orders: [order('Salmão')],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB crash');
      expect(result.code).toBe('PRINT_ERROR');
    }
  });
});
