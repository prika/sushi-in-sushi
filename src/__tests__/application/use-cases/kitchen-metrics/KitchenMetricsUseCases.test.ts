import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetKitchenMetricsUseCase } from '@/application/use-cases/kitchen-metrics/GetKitchenMetricsUseCase';
import { GetStaffMetricsUseCase } from '@/application/use-cases/kitchen-metrics/GetStaffMetricsUseCase';
import { IKitchenMetricsRepository } from '@/domain/repositories/IKitchenMetricsRepository';
import { KitchenStaffMetrics } from '@/domain/entities/KitchenMetrics';

const createMockRepository = (): IKitchenMetricsRepository => ({
  getStaffMetrics: vi.fn(),
  getStaffMetricsById: vi.fn(),
});

const sampleMetrics: KitchenStaffMetrics[] = [
  {
    staffId: 'staff-1',
    staffName: 'Tiago',
    ordersPrepared: 42,
    avgPrepTimeMinutes: 8.5,
    ratingsReceived: 15,
    avgRating: 4.2,
  },
  {
    staffId: 'staff-2',
    staffName: 'Ana',
    ordersPrepared: 38,
    avgPrepTimeMinutes: 7.3,
    ratingsReceived: 12,
    avgRating: 4.6,
  },
];

describe('GetKitchenMetricsUseCase', () => {
  let repository: IKitchenMetricsRepository;
  let useCase: GetKitchenMetricsUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new GetKitchenMetricsUseCase(repository);
  });

  it('deve retornar métricas de todos os funcionários', async () => {
    vi.mocked(repository.getStaffMetrics).mockResolvedValue(sampleMetrics);

    const result = await useCase.execute({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].staffName).toBe('Tiago');
      expect(result.data[1].staffName).toBe('Ana');
    }
  });

  it('deve passar filtro de localização ao repositório', async () => {
    vi.mocked(repository.getStaffMetrics).mockResolvedValue([sampleMetrics[0]]);

    await useCase.execute({ location: 'circunvalacao' });

    expect(repository.getStaffMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'circunvalacao' })
    );
  });

  it('deve passar filtro de datas ao repositório', async () => {
    vi.mocked(repository.getStaffMetrics).mockResolvedValue(sampleMetrics);
    const fromDate = new Date('2026-01-01');
    const toDate = new Date('2026-01-31');

    await useCase.execute({ fromDate, toDate });

    expect(repository.getStaffMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate, toDate })
    );
  });

  it('deve retornar lista vazia quando não há dados', async () => {
    vi.mocked(repository.getStaffMetrics).mockResolvedValue([]);

    const result = await useCase.execute({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('deve retornar erro quando repositório falha', async () => {
    vi.mocked(repository.getStaffMetrics).mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
  });
});

describe('GetStaffMetricsUseCase', () => {
  let repository: IKitchenMetricsRepository;
  let useCase: GetStaffMetricsUseCase;

  beforeEach(() => {
    repository = createMockRepository();
    useCase = new GetStaffMetricsUseCase(repository);
  });

  it('deve retornar métricas de um funcionário específico', async () => {
    vi.mocked(repository.getStaffMetricsById).mockResolvedValue(sampleMetrics[0]);

    const result = await useCase.execute({ staffId: 'staff-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.staffId).toBe('staff-1');
      expect(result.data.ordersPrepared).toBe(42);
      expect(result.data.avgPrepTimeMinutes).toBe(8.5);
      expect(result.data.avgRating).toBe(4.2);
    }
  });

  it('deve retornar erro quando staffId está vazio', async () => {
    const result = await useCase.execute({ staffId: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });

  it('deve retornar erro quando funcionário não encontrado', async () => {
    vi.mocked(repository.getStaffMetricsById).mockResolvedValue(null);

    const result = await useCase.execute({ staffId: 'nonexistent' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('deve passar filtro de datas ao repositório', async () => {
    vi.mocked(repository.getStaffMetricsById).mockResolvedValue(sampleMetrics[0]);
    const fromDate = new Date('2026-01-01');
    const toDate = new Date('2026-01-31');

    await useCase.execute({ staffId: 'staff-1', fromDate, toDate });

    expect(repository.getStaffMetricsById).toHaveBeenCalledWith(
      'staff-1',
      expect.objectContaining({ fromDate, toDate })
    );
  });

  it('deve retornar erro quando repositório falha', async () => {
    vi.mocked(repository.getStaffMetricsById).mockRejectedValue(new Error('Connection lost'));

    const result = await useCase.execute({ staffId: 'staff-1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Connection lost');
    }
  });
});
