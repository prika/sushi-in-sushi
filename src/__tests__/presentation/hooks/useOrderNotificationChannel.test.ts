import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import {
  useOrderNotificationChannel,
  type OrderNotificationSupabaseLike,
  type RealtimeChannelLike,
} from '@/presentation/hooks/useOrderNotificationChannel';

describe('useOrderNotificationChannel', () => {
  let mockSetOrderNotification: ReturnType<typeof vi.fn>;
  let mockFetchSessionOrders: ReturnType<typeof vi.fn>;
  let mockRemoveChannel: ReturnType<typeof vi.fn>;
  let broadcastCallback: (payload: { payload: { customerName: string; itemCount: number; deviceId?: string } }) => void;

  const createMockChannel = (): RealtimeChannelLike => ({
    on: vi.fn().mockImplementation((_type: string, _opts: Record<string, string>, cb: (payload: { payload: { customerName: string; itemCount: number; deviceId?: string } }) => void) => {
      broadcastCallback = cb;
      return { subscribe: vi.fn() };
    }),
  });

  const createMockSupabase = (): OrderNotificationSupabaseLike => {
    const ch = createMockChannel();
    return {
      channel: vi.fn().mockReturnValue(ch),
      removeChannel: mockRemoveChannel,
    };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetOrderNotification = vi.fn();
    mockFetchSessionOrders = vi.fn();
    mockRemoveChannel = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createChannelRef = (): MutableRefObject<RealtimeChannelLike | null> =>
    ({ current: null });

  it('não subscreve quando session é null', () => {
    const supabase = createMockSupabase();
    const channelRef = createChannelRef();

    renderHook(() =>
      useOrderNotificationChannel({
        session: null,
        step: 'active',
        supabase,
        t: (key) => key,
        fetchSessionOrders: mockFetchSessionOrders,
        setOrderNotification: mockSetOrderNotification,
        channelRef,
        deviceId: 'device-123',
      })
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('não subscreve quando step não é "active"', () => {
    const supabase = createMockSupabase();
    const channelRef = createChannelRef();

    renderHook(() =>
      useOrderNotificationChannel({
        session: { id: 'sess-1' },
        step: 'welcome',
        supabase,
        t: (key) => key,
        fetchSessionOrders: mockFetchSessionOrders,
        setOrderNotification: mockSetOrderNotification,
        channelRef,
        deviceId: 'device-123',
      })
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('subscreve ao canal e ao unmount remove o canal e limpa o ref', () => {
    const supabase = createMockSupabase();
    const channelRef = createChannelRef();
    const mockChannel = supabase.channel('cart-review-sess-1');

    const { unmount } = renderHook(() =>
      useOrderNotificationChannel({
        session: { id: 'sess-1' },
        step: 'active',
        supabase,
        t: (key, opts) => (opts ? `${key}:${opts.name}:${opts.count}` : key),
        fetchSessionOrders: mockFetchSessionOrders,
        setOrderNotification: mockSetOrderNotification,
        channelRef,
        deviceId: 'device-123',
      })
    );

    expect(supabase.channel).toHaveBeenCalledWith('cart-review-sess-1');
    expect(channelRef.current).toBe(mockChannel);

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    expect(channelRef.current).toBeNull();
  });

  it('ao receber "order-submitted" define notificação, chama fetchSessionOrders e agenda clear em 5s', () => {
    const supabase = createMockSupabase();
    const channelRef = createChannelRef();

    renderHook(() =>
      useOrderNotificationChannel({
        session: { id: 'sess-1' },
        step: 'active',
        supabase,
        t: (key, opts) => (opts ? `${key}:${opts.name}:${opts.count}` : key),
        fetchSessionOrders: mockFetchSessionOrders,
        setOrderNotification: mockSetOrderNotification,
        channelRef,
        deviceId: 'device-123',
      })
    );

    act(() => {
      broadcastCallback({
        payload: { customerName: 'Maria', itemCount: 3, deviceId: 'device-456' }, // Different device
      });
    });

    expect(mockSetOrderNotification).toHaveBeenCalledWith(
      'mesa.review.reviewNotification:Maria:3'
    );
    expect(mockFetchSessionOrders).toHaveBeenCalledTimes(1);
    expect(mockSetOrderNotification).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockSetOrderNotification).toHaveBeenCalledTimes(2);
    expect(mockSetOrderNotification).toHaveBeenLastCalledWith(null);
  });

  it('ao fazer unmount antes dos 5s, o timer é cancelado e setOrderNotification(null) não é chamado depois', () => {
    const supabase = createMockSupabase();
    const channelRef = createChannelRef();

    const { unmount } = renderHook(() =>
      useOrderNotificationChannel({
        session: { id: 'sess-1' },
        step: 'active',
        supabase,
        t: (key, opts) => (opts ? `${key}:${opts.name}:${opts.count}` : key),
        fetchSessionOrders: mockFetchSessionOrders,
        setOrderNotification: mockSetOrderNotification,
        channelRef,
        deviceId: 'device-123',
      })
    );

    act(() => {
      broadcastCallback({
        payload: { customerName: 'João', itemCount: 2, deviceId: 'device-789' }, // Different device
      });
    });

    expect(mockSetOrderNotification).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockSetOrderNotification).toHaveBeenCalledTimes(1);
    expect(mockSetOrderNotification).not.toHaveBeenCalledWith(null);
  });

  it('ignora broadcasts do mesmo device (prevent duplicates)', () => {
    const supabase = createMockSupabase();
    const channelRef = createChannelRef();

    renderHook(() =>
      useOrderNotificationChannel({
        session: { id: 'sess-1' },
        step: 'active',
        supabase,
        t: (key, opts) => (opts ? `${key}:${opts.name}:${opts.count}` : key),
        fetchSessionOrders: mockFetchSessionOrders,
        setOrderNotification: mockSetOrderNotification,
        channelRef,
        deviceId: 'device-123',
      })
    );

    act(() => {
      broadcastCallback({
        payload: { customerName: 'Ana', itemCount: 1, deviceId: 'device-123' }, // Same device
      });
    });

    // Should not call setOrderNotification or fetchSessionOrders
    expect(mockSetOrderNotification).not.toHaveBeenCalled();
    expect(mockFetchSessionOrders).not.toHaveBeenCalled();
  });
});
