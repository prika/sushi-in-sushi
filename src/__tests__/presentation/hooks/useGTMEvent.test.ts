import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGTMEvent, pushGTMEvent } from '@/presentation/hooks/useGTMEvent';

describe('useGTMEvent', () => {
  let originalDataLayer: Record<string, unknown>[] | undefined;

  beforeEach(() => {
    originalDataLayer = window.dataLayer;
    window.dataLayer = [];
  });

  afterEach(() => {
    window.dataLayer = originalDataLayer;
  });

  it('deve retornar funcao pushEvent', () => {
    const { result } = renderHook(() => useGTMEvent());
    expect(typeof result.current).toBe('function');
  });

  it('deve fazer push de evento para dataLayer', () => {
    const { result } = renderHook(() => useGTMEvent());

    act(() => {
      result.current('reservation_completed', { party_size: 4, location: 'circunvalacao' });
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer![0]).toEqual({
      event: 'reservation_completed',
      party_size: 4,
      location: 'circunvalacao',
    });
  });

  it('deve fazer push de evento sem parametros', () => {
    const { result } = renderHook(() => useGTMEvent());

    act(() => {
      result.current('signup');
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer![0]).toEqual({ event: 'signup' });
  });

  it('deve fazer push de multiplos eventos', () => {
    const { result } = renderHook(() => useGTMEvent());

    act(() => {
      result.current('menu_view', { locale: 'pt' });
      result.current('qr_scan', { table_number: 5, location: 'boavista' });
    });

    expect(window.dataLayer).toHaveLength(2);
    expect(window.dataLayer![0]).toEqual({ event: 'menu_view', locale: 'pt' });
    expect(window.dataLayer![1]).toEqual({ event: 'qr_scan', table_number: 5, location: 'boavista' });
  });

  it('nao deve falhar quando dataLayer nao existe', () => {
    window.dataLayer = undefined;

    const { result } = renderHook(() => useGTMEvent());

    expect(() => {
      act(() => {
        result.current('login', { method: 'email' });
      });
    }).not.toThrow();
  });

  it('deve retornar funcao estavel (referencia nao muda entre renders)', () => {
    const { result, rerender } = renderHook(() => useGTMEvent());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('pushGTMEvent (standalone)', () => {
  let originalDataLayer: Record<string, unknown>[] | undefined;

  beforeEach(() => {
    originalDataLayer = window.dataLayer;
    window.dataLayer = [];
  });

  afterEach(() => {
    window.dataLayer = originalDataLayer;
  });

  it('deve fazer push de evento para dataLayer', () => {
    pushGTMEvent('order_placed', { items_count: 3, is_rodizio: true });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer![0]).toEqual({
      event: 'order_placed',
      items_count: 3,
      is_rodizio: true,
    });
  });

  it('nao deve falhar quando dataLayer nao existe', () => {
    window.dataLayer = undefined;

    expect(() => {
      pushGTMEvent('reservation_started', { location: 'circunvalacao' });
    }).not.toThrow();
  });
});
