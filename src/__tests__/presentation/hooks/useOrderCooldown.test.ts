import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderCooldown } from '@/presentation/hooks/useOrderCooldown';

describe('useOrderCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve retornar cooldown inativo quando cooldownMinutes é 0', () => {
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [{ created_at: '2026-02-10T11:59:00Z' }],
        cooldownMinutes: 0,
      })
    );

    expect(result.current.isCooldownActive).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.remainingFormatted).toBe('0:00');
    expect(result.current.progress).toBe(0);
  });

  it('deve retornar cooldown inativo quando não há pedidos', () => {
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [],
        cooldownMinutes: 5,
      })
    );

    expect(result.current.isCooldownActive).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.remainingFormatted).toBe('0:00');
    expect(result.current.progress).toBe(0);
  });

  it('deve retornar cooldown ativo quando pedido recente dentro da janela', () => {
    // Now is 12:00:00, order was at 11:58:00, cooldown is 5 min
    // Remaining = 5min - 2min = 3min = 180s
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [{ created_at: '2026-02-10T11:58:00Z' }],
        cooldownMinutes: 5,
      })
    );

    expect(result.current.isCooldownActive).toBe(true);
    expect(result.current.remainingSeconds).toBe(180);
    expect(result.current.progress).toBeCloseTo(180 / 300, 5);
  });

  it('deve fazer contagem decrescente em tempo real', () => {
    // Now is 12:00:00, order was at 11:59:00, cooldown 5 min
    // Remaining = 4min = 240s
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [{ created_at: '2026-02-10T11:59:00Z' }],
        cooldownMinutes: 5,
      })
    );

    expect(result.current.remainingSeconds).toBe(240);

    // Advance 10 seconds
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.remainingSeconds).toBe(230);

    // Advance another 30 seconds
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.remainingSeconds).toBe(200);
  });

  it('deve ficar inativo quando o cooldown expira', () => {
    // Now is 12:00:00, order at 11:59:50, cooldown 1 min
    // Remaining = 60 - 10 = 50s
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [{ created_at: '2026-02-10T11:59:50Z' }],
        cooldownMinutes: 1,
      })
    );

    expect(result.current.isCooldownActive).toBe(true);
    expect(result.current.remainingSeconds).toBe(50);

    // Advance past the expiry
    act(() => {
      vi.advanceTimersByTime(50_000);
    });

    expect(result.current.isCooldownActive).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.progress).toBe(0);
  });

  it('deve usar o timestamp mais recente (não o mais antigo)', () => {
    // Now is 12:00:00, cooldown 5 min
    // Oldest order at 11:50:00 (expired), newest at 11:58:00 (remaining 3min)
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [
          { created_at: '2026-02-10T11:50:00Z' },
          { created_at: '2026-02-10T11:58:00Z' },
          { created_at: '2026-02-10T11:55:00Z' },
        ],
        cooldownMinutes: 5,
      })
    );

    // Should use 11:58:00 → 3 min remaining = 180s
    expect(result.current.isCooldownActive).toBe(true);
    expect(result.current.remainingSeconds).toBe(180);
  });

  it('deve retornar inativo quando último pedido é mais antigo que cooldown', () => {
    // Now is 12:00:00, order at 11:50:00, cooldown 5 min
    // 10 min ago > 5 min cooldown → expired
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [{ created_at: '2026-02-10T11:50:00Z' }],
        cooldownMinutes: 5,
      })
    );

    expect(result.current.isCooldownActive).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.remainingFormatted).toBe('0:00');
    expect(result.current.progress).toBe(0);
  });

  it('deve recalcular quando sessionOrders muda', () => {
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const initialOrders = [{ created_at: '2026-02-10T11:58:00Z' }];

    const { result, rerender } = renderHook(
      ({ orders }) =>
        useOrderCooldown({
          sessionOrders: orders,
          cooldownMinutes: 5,
        }),
      { initialProps: { orders: initialOrders } }
    );

    // Initially 3 min remaining (180s)
    expect(result.current.remainingSeconds).toBe(180);

    // Simulate a new order placed right now
    const updatedOrders = [
      ...initialOrders,
      { created_at: '2026-02-10T12:00:00Z' },
    ];

    rerender({ orders: updatedOrders });

    // Now remaining should be full 5 min = 300s
    expect(result.current.remainingSeconds).toBe(300);
    expect(result.current.isCooldownActive).toBe(true);
  });

  it('deve formatar tempo correctamente', () => {
    // Now is 12:00:00, order at 11:57:30, cooldown 5 min
    // Remaining = 5min - 2min30s = 2min30s = 150s → "2:30"
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'));

    const { result } = renderHook(() =>
      useOrderCooldown({
        sessionOrders: [{ created_at: '2026-02-10T11:57:30Z' }],
        cooldownMinutes: 5,
      })
    );

    expect(result.current.remainingSeconds).toBe(150);
    expect(result.current.remainingFormatted).toBe('2:30');
  });
});
