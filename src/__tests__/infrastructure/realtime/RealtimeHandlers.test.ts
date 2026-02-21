import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock setup ─────────────────────────────────────────────────────

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn((cb) => {
  if (cb) cb('SUBSCRIBED');
  return mockChannel;
});
const mockChannel = { on: mockOn, subscribe: mockSubscribe };
const mockRemoveChannel = vi.fn();
const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
} as any;

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { SupabaseRealtimeHandler } from '@/infrastructure/realtime/SupabaseRealtimeHandler';
import {
  OrderRealtimeHandler,
  OrderRealtimeHandlerFactory,
} from '@/infrastructure/realtime/OrderRealtimeHandler';

// ═════════════════════════════════════════════════════════════════════════════
// SupabaseRealtimeHandler
// ═════════════════════════════════════════════════════════════════════════════

describe('SupabaseRealtimeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnThis();
    mockSubscribe.mockImplementation((cb) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    });
  });

  it('deve usar o cliente supabase fornecido no constructor', () => {
    const customMockOn = vi.fn().mockReturnThis();
    const customMockSubscribe = vi.fn((cb) => {
      if (cb) cb('SUBSCRIBED');
      return customMockChannel;
    });
    const customMockChannel = { on: customMockOn, subscribe: customMockSubscribe };
    const customClient = {
      channel: vi.fn(() => customMockChannel),
      removeChannel: vi.fn(),
    } as any;

    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test', table: 'orders' },
      customClient,
    );

    const callback = vi.fn();
    handler.subscribe(callback);

    expect(customClient.channel).toHaveBeenCalledWith('test');
  });

  it('deve criar canal com o nome correto ao subscrever', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'my-channel', table: 'orders' },
      mockSupabase,
    );

    handler.subscribe(vi.fn());

    expect(mockSupabase.channel).toHaveBeenCalledWith('my-channel');
  });

  it('deve registar postgres_changes para cada tipo de evento', () => {
    const handler = new SupabaseRealtimeHandler(
      {
        channelName: 'test-events',
        table: 'orders',
        events: ['INSERT', 'UPDATE'],
      },
      mockSupabase,
    );

    handler.subscribe(vi.fn());

    // Should call .on() twice: once for INSERT, once for UPDATE
    expect(mockOn).toHaveBeenCalledTimes(2);

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', schema: 'public', table: 'orders' }),
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', schema: 'public', table: 'orders' }),
      expect.any(Function),
    );
  });

  it('deve registar todos os eventos por defeito (INSERT, UPDATE, DELETE)', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test-defaults', table: 'sessions' },
      mockSupabase,
    );

    handler.subscribe(vi.fn());

    expect(mockOn).toHaveBeenCalledTimes(3);
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT' }),
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE' }),
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'DELETE' }),
      expect.any(Function),
    );
  });

  it('deve incluir filtro na config quando fornecido', () => {
    const handler = new SupabaseRealtimeHandler(
      {
        channelName: 'filtered',
        table: 'orders',
        filter: 'session_id=eq.abc',
        events: ['INSERT'],
      },
      mockSupabase,
    );

    handler.subscribe(vi.fn());

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: 'session_id=eq.abc',
      }),
      expect.any(Function),
    );
  });

  it('deve dessubscrever removendo canal e resetando estado', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test-unsub', table: 'orders' },
      mockSupabase,
    );

    handler.subscribe(vi.fn());
    expect(handler.isSubscribed()).toBe(true);

    handler.unsubscribe();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    expect(handler.isSubscribed()).toBe(false);
  });

  it('deve retornar true em isSubscribed apos subscricao', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test-status', table: 'orders' },
      mockSupabase,
    );

    handler.subscribe(vi.fn());

    expect(handler.isSubscribed()).toBe(true);
  });

  it('deve retornar false em isSubscribed inicialmente', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test-initial', table: 'orders' },
      mockSupabase,
    );

    expect(handler.isSubscribed()).toBe(false);
  });

  it('deve dessubscrever primeiro ao re-subscrever', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test-resub', table: 'orders' },
      mockSupabase,
    );

    handler.subscribe(vi.fn());
    // First subscription creates a channel
    expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

    handler.subscribe(vi.fn());
    // Re-subscribing should have removed the old channel first, then created a new one
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
  });

  it('deve invocar callback com evento mapeado quando payload chega', () => {
    const handler = new SupabaseRealtimeHandler(
      { channelName: 'test-cb', table: 'orders', events: ['INSERT'] },
      mockSupabase,
    );

    const callback = vi.fn();
    handler.subscribe(callback);

    // Get the postgres_changes callback registered via .on()
    const onCall = mockOn.mock.calls[0];
    const postgresCallback = onCall[2];

    const payload = {
      eventType: 'INSERT',
      old: {},
      new: { id: '1', status: 'pending' },
    };

    postgresCallback(payload);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INSERT',
        new: { id: '1', status: 'pending' },
        timestamp: expect.any(Date),
      }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// OrderRealtimeHandler
// ═════════════════════════════════════════════════════════════════════════════

describe('OrderRealtimeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnThis();
    mockSubscribe.mockImplementation((cb) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    });
  });

  const sampleRow = {
    id: 'order-1',
    session_id: 'session-1',
    product_id: 'prod-1',
    quantity: 2,
    unit_price: 12.5,
    notes: 'Sem wasabi',
    status: 'pending',
    session_customer_id: 'sc-1',
    prepared_by: null,
    preparing_started_at: null,
    ready_at: null,
    delivered_at: null,
    created_at: '2026-01-15T18:00:00Z',
    updated_at: '2026-01-15T18:00:00Z',
  };

  it('deve criar handler com tabela orders', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);
    handler.subscribe(vi.fn());

    // Verify the inner handler registered for 'orders' table
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'orders' }),
      expect.any(Function),
    );
  });

  it('deve delegar subscribe ao handler interno', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);
    const callback = vi.fn();

    handler.subscribe(callback);

    expect(mockSupabase.channel).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('deve subscrever com filtro de sessionId quando fornecido', () => {
    const handler = new OrderRealtimeHandler(
      { sessionId: 'session-42' },
      mockSupabase,
    );

    handler.subscribe(vi.fn());

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'orders',
        filter: 'session_id=eq.session-42',
      }),
      expect.any(Function),
    );
  });

  it('deve limpar ao dessubscrever', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);
    handler.subscribe(vi.fn());

    handler.unsubscribe();

    expect(mockRemoveChannel).toHaveBeenCalled();
    expect(handler.isSubscribed()).toBe(false);
  });

  it('deve delegar isSubscribed ao handler interno', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);

    expect(handler.isSubscribed()).toBe(false);

    handler.subscribe(vi.fn());

    expect(handler.isSubscribed()).toBe(true);
  });

  it('deve mapear row da BD para entidade Order no dominio', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);
    const callback = vi.fn();

    handler.subscribeWithDetails(callback);

    // Get the callback registered via the inner handler .on()
    const innerCallback = mockOn.mock.calls[0][2];
    innerCallback({
      eventType: 'INSERT',
      old: {},
      new: sampleRow,
    });

    expect(callback).toHaveBeenCalledTimes(1);
    const event = callback.mock.calls[0][0];
    expect(event.new).toEqual(
      expect.objectContaining({
        id: 'order-1',
        sessionId: 'session-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 12.5,
        notes: 'Sem wasabi',
        status: 'pending',
        sessionCustomerId: 'sc-1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it('deve detetar INSERT como isNew=true', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);
    const callback = vi.fn();

    handler.subscribeWithDetails(callback);

    const innerCallback = mockOn.mock.calls[0][2];
    innerCallback({
      eventType: 'INSERT',
      old: {},
      new: sampleRow,
    });

    const event = callback.mock.calls[0][0];
    expect(event.isNew).toBe(true);
  });

  it('deve detetar mudanca de status', () => {
    const handler = new OrderRealtimeHandler({}, mockSupabase);
    const callback = vi.fn();

    handler.subscribeWithDetails(callback);

    // Use the UPDATE event callback (second .on() call for UPDATE)
    const updateCallback = mockOn.mock.calls.find(
      (call: any[]) => call[1].event === 'UPDATE',
    )?.[2];

    updateCallback({
      eventType: 'UPDATE',
      old: { ...sampleRow, status: 'pending' },
      new: { ...sampleRow, status: 'preparing' },
    });

    const event = callback.mock.calls[0][0];
    expect(event.statusChanged).toBe(true);
    expect(event.previousStatus).toBe('pending');
    expect(event.isNew).toBe(false);
  });

  it('deve filtrar eventos quando statuses configurados e nenhum match', () => {
    const handler = new OrderRealtimeHandler(
      { statuses: ['pending', 'preparing'] },
      mockSupabase,
    );
    const callback = vi.fn();

    handler.subscribeWithDetails(callback);

    // Find the UPDATE event callback
    const updateCallback = mockOn.mock.calls.find(
      (call: any[]) => call[1].event === 'UPDATE',
    )?.[2];

    // Deliver an event where NEITHER old nor new status is in the filter list
    updateCallback({
      eventType: 'UPDATE',
      old: { ...sampleRow, status: 'ready' },
      new: { ...sampleRow, status: 'delivered' },
    });

    // Callback should NOT be invoked because neither status matches
    expect(callback).not.toHaveBeenCalled();
  });

  it('deve incluir evento quando status novo esta na lista de filtro', () => {
    const handler = new OrderRealtimeHandler(
      { statuses: ['pending', 'preparing'] },
      mockSupabase,
    );
    const callback = vi.fn();

    handler.subscribeWithDetails(callback);

    const insertCallback = mockOn.mock.calls.find(
      (call: any[]) => call[1].event === 'INSERT',
    )?.[2];

    insertCallback({
      eventType: 'INSERT',
      old: {},
      new: { ...sampleRow, status: 'pending' },
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// OrderRealtimeHandlerFactory
// ═════════════════════════════════════════════════════════════════════════════

describe('OrderRealtimeHandlerFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnThis();
    mockSubscribe.mockImplementation((cb) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    });
  });

  it('forKitchen cria handler com statuses pending/preparing/ready', () => {
    const handler = OrderRealtimeHandlerFactory.forKitchen('circunvalacao');

    expect(handler).toBeInstanceOf(OrderRealtimeHandler);

    // Subscribe to verify the inner setup is correct
    const callback = vi.fn();
    handler.subscribeWithDetails(callback);

    // An event with status 'delivered' should be filtered out
    const insertCallback = mockOn.mock.calls.find(
      (call: any[]) => call[1].event === 'INSERT',
    )?.[2];

    insertCallback({
      eventType: 'INSERT',
      old: {},
      new: {
        id: 'o1', session_id: 's1', product_id: 'p1', quantity: 1,
        unit_price: 10, notes: null, status: 'delivered',
        session_customer_id: null, created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('forSession cria handler com filtro de sessionId', () => {
    const handler = OrderRealtimeHandlerFactory.forSession('session-99');

    expect(handler).toBeInstanceOf(OrderRealtimeHandler);

    handler.subscribe(vi.fn());

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        filter: 'session_id=eq.session-99',
      }),
      expect.any(Function),
    );
  });

  it('custom cria handler com opcoes fornecidas', () => {
    const handler = OrderRealtimeHandlerFactory.custom({
      channelName: 'my-custom-channel',
      statuses: ['ready'],
    });

    expect(handler).toBeInstanceOf(OrderRealtimeHandler);

    handler.subscribe(vi.fn());

    expect(mockSupabase.channel).toHaveBeenCalledWith('my-custom-channel');
  });
});
