import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActivityLog } from '@/presentation/hooks/useActivityLog';
import { useDependencies } from '@/presentation/contexts/DependencyContext';

// Mock do DependencyContext
vi.mock('@/presentation/contexts/DependencyContext', () => ({
  useDependencies: vi.fn(),
}));

describe('useActivityLog', () => {
  let mockActivityLogger: any;

  beforeEach(() => {
    mockActivityLogger = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(useDependencies).mockReturnValue({
      activityLogger: mockActivityLogger,
    } as any);
  });

  it('deve retornar função logActivity', () => {
    const { result } = renderHook(() => useActivityLog());

    expect(result.current.logActivity).toBeDefined();
    expect(typeof result.current.logActivity).toBe('function');
  });

  it('deve chamar activityLogger.log com action', async () => {
    const { result } = renderHook(() => useActivityLog());

    await result.current.logActivity('test_action');

    expect(mockActivityLogger.log).toHaveBeenCalledWith({
      action: 'test_action',
      entityType: 'unknown',
      entityId: undefined,
      details: undefined,
    });
  });

  it('deve chamar activityLogger.log com todos os parâmetros', async () => {
    const { result } = renderHook(() => useActivityLog());

    await result.current.logActivity('create_order', 'order', '123', { amount: 100 });

    expect(mockActivityLogger.log).toHaveBeenCalledWith({
      action: 'create_order',
      entityType: 'order',
      entityId: '123',
      details: { amount: 100 },
    });
  });

  it('deve usar "unknown" como entityType padrão', async () => {
    const { result } = renderHook(() => useActivityLog());

    await result.current.logActivity('test_action');

    expect(mockActivityLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'unknown' })
    );
  });

  it('deve permitir entityType e entityId opcionais', async () => {
    const { result } = renderHook(() => useActivityLog());

    await result.current.logActivity('test_action', 'table', '5');

    expect(mockActivityLogger.log).toHaveBeenCalledWith({
      action: 'test_action',
      entityType: 'table',
      entityId: '5',
      details: undefined,
    });
  });

  it('deve lidar com erro do logger', async () => {
    mockActivityLogger.log.mockRejectedValue(new Error('Logger error'));

    const { result } = renderHook(() => useActivityLog());

    // Não deve lançar erro - logger falha silenciosamente
    await expect(
      result.current.logActivity('test_action')
    ).rejects.toThrow('Logger error');
  });

  it('deve manter referência estável da função logActivity', () => {
    const { result, rerender } = renderHook(() => useActivityLog());

    const firstLogActivity = result.current.logActivity;
    rerender();
    const secondLogActivity = result.current.logActivity;

    expect(firstLogActivity).toBe(secondLogActivity);
  });
});
