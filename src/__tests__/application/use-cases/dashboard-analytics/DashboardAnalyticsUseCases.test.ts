import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDashboardAnalyticsUseCase } from '@/application/use-cases/dashboard-analytics/GetDashboardAnalyticsUseCase';
import { IDashboardAnalyticsRepository } from '@/domain/repositories/IDashboardAnalyticsRepository';
import {
  DashboardKpi,
  RevenueDataPoint,
  OrdersByHourDataPoint,
  OrdersByStatusDataPoint,
  LocationComparisonDataPoint,
} from '@/domain/entities/DashboardAnalytics';

const mockKpis: DashboardKpi = {
  revenue: 1500,
  orderCount: 45,
  averageTicket: 33.33,
  occupancyRate: 75,
};

const mockPreviousKpis: DashboardKpi = {
  revenue: 1200,
  orderCount: 38,
  averageTicket: 31.58,
  occupancyRate: 60,
};

const mockRevenueOverTime: RevenueDataPoint[] = [
  { date: '2026-03-01', revenue: 500, orderCount: 15 },
  { date: '2026-03-02', revenue: 1000, orderCount: 30 },
];

const mockOrdersByHour: OrdersByHourDataPoint[] = [
  { hour: 12, count: 10 },
  { hour: 13, count: 15 },
  { hour: 19, count: 20 },
];

const mockOrdersByStatus: OrdersByStatusDataPoint[] = [
  { status: 'delivered', count: 30 },
  { status: 'pending', count: 10 },
  { status: 'cancelled', count: 5 },
];

const mockLocationComparison: LocationComparisonDataPoint[] = [
  {
    location: 'circunvalacao',
    locationName: 'Circunvalação',
    revenue: 900,
    orderCount: 28,
    sessionCount: 10,
    averageTicket: 32.14,
  },
  {
    location: 'boavista',
    locationName: 'Boavista',
    revenue: 600,
    orderCount: 17,
    sessionCount: 8,
    averageTicket: 35.29,
  },
];

describe('GetDashboardAnalyticsUseCase', () => {
  let repository: IDashboardAnalyticsRepository;
  let useCase: GetDashboardAnalyticsUseCase;

  beforeEach(() => {
    repository = {
      getKpis: vi.fn(),
      getRevenueOverTime: vi.fn(),
      getOrdersByHour: vi.fn(),
      getOrdersByStatus: vi.fn(),
      getLocationComparison: vi.fn(),
    };
    useCase = new GetDashboardAnalyticsUseCase(repository);
  });

  const defaultInput = {
    from: new Date('2026-03-01'),
    to: new Date('2026-03-04'),
    previousFrom: new Date('2026-02-26'),
    previousTo: new Date('2026-02-28'),
  };

  it('deve retornar analytics completas com sucesso', async () => {
    vi.mocked(repository.getKpis)
      .mockResolvedValueOnce(mockKpis)
      .mockResolvedValueOnce(mockPreviousKpis);
    vi.mocked(repository.getRevenueOverTime).mockResolvedValue(mockRevenueOverTime);
    vi.mocked(repository.getOrdersByHour).mockResolvedValue(mockOrdersByHour);
    vi.mocked(repository.getOrdersByStatus).mockResolvedValue(mockOrdersByStatus);
    vi.mocked(repository.getLocationComparison).mockResolvedValue(mockLocationComparison);

    const result = await useCase.execute(defaultInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kpis).toEqual(mockKpis);
      expect(result.data.previousKpis).toEqual(mockPreviousKpis);
      expect(result.data.revenueOverTime).toHaveLength(2);
      expect(result.data.ordersByHour).toHaveLength(3);
      expect(result.data.ordersByStatus).toHaveLength(3);
      expect(result.data.locationComparison).toHaveLength(2);
    }
  });

  it('deve chamar repository com filtros corretos', async () => {
    vi.mocked(repository.getKpis).mockResolvedValue(mockKpis);
    vi.mocked(repository.getRevenueOverTime).mockResolvedValue([]);
    vi.mocked(repository.getOrdersByHour).mockResolvedValue([]);
    vi.mocked(repository.getOrdersByStatus).mockResolvedValue([]);
    vi.mocked(repository.getLocationComparison).mockResolvedValue([]);

    await useCase.execute({ ...defaultInput, location: 'circunvalacao' });

    // Current period filter
    expect(repository.getKpis).toHaveBeenCalledWith({
      from: defaultInput.from,
      to: defaultInput.to,
      location: 'circunvalacao',
    });

    // Previous period filter
    expect(repository.getKpis).toHaveBeenCalledWith({
      from: defaultInput.previousFrom,
      to: defaultInput.previousTo,
      location: 'circunvalacao',
    });

    // Location comparison ignores location filter
    expect(repository.getLocationComparison).toHaveBeenCalledWith({
      from: defaultInput.from,
      to: defaultInput.to,
    });
  });

  it('deve retornar dados vazios quando não há pedidos no período', async () => {
    const emptyKpis: DashboardKpi = {
      revenue: 0,
      orderCount: 0,
      averageTicket: 0,
      occupancyRate: 0,
    };

    vi.mocked(repository.getKpis).mockResolvedValue(emptyKpis);
    vi.mocked(repository.getRevenueOverTime).mockResolvedValue([]);
    vi.mocked(repository.getOrdersByHour).mockResolvedValue([]);
    vi.mocked(repository.getOrdersByStatus).mockResolvedValue([]);
    vi.mocked(repository.getLocationComparison).mockResolvedValue([]);

    const result = await useCase.execute(defaultInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kpis.revenue).toBe(0);
      expect(result.data.kpis.orderCount).toBe(0);
      expect(result.data.revenueOverTime).toHaveLength(0);
    }
  });

  it('deve retornar erro quando repository lança exceção', async () => {
    vi.mocked(repository.getKpis).mockRejectedValue(new Error('Database connection failed'));

    const result = await useCase.execute(defaultInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Database connection failed');
    }
  });

  it('deve executar todas as queries em paralelo', async () => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    vi.mocked(repository.getKpis).mockImplementation(async () => {
      await delay(50);
      return mockKpis;
    });
    vi.mocked(repository.getRevenueOverTime).mockImplementation(async () => {
      await delay(50);
      return mockRevenueOverTime;
    });
    vi.mocked(repository.getOrdersByHour).mockImplementation(async () => {
      await delay(50);
      return mockOrdersByHour;
    });
    vi.mocked(repository.getOrdersByStatus).mockImplementation(async () => {
      await delay(50);
      return mockOrdersByStatus;
    });
    vi.mocked(repository.getLocationComparison).mockImplementation(async () => {
      await delay(50);
      return mockLocationComparison;
    });

    const start = Date.now();
    const result = await useCase.execute(defaultInput);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    // If sequential: 6 * 50ms = 300ms. If parallel: ~50ms.
    expect(elapsed).toBeLessThan(200);
  });
});
