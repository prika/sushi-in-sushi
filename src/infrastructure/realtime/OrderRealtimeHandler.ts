/**
 * OrderRealtimeHandler - Handler especializado para eventos de pedidos em tempo real
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  IRealtimeSubscription,
  RealtimeEvent,
  RealtimeCallback,
} from '@/application/ports/IRealtimeSubscription';
import { Order } from '@/domain/entities/Order';
import { OrderStatus } from '@/domain/value-objects/OrderStatus';
import { SupabaseRealtimeHandler } from './SupabaseRealtimeHandler';

/**
 * Evento de pedido com dados mapeados
 */
export interface OrderRealtimeEvent extends RealtimeEvent<Order> {
  /**
   * Indica se o pedido é novo (INSERT)
   */
  isNew: boolean;

  /**
   * Indica se o status mudou
   */
  statusChanged: boolean;

  /**
   * Status anterior (se mudou)
   */
  previousStatus?: OrderStatus;
}

/**
 * Callback específico para eventos de pedidos
 */
export type OrderRealtimeCallback = (event: OrderRealtimeEvent) => void;

/**
 * Opções para o handler de pedidos
 */
export interface OrderRealtimeOptions {
  /**
   * ID da sessão para filtrar (opcional)
   */
  sessionId?: string;

  /**
   * Status a monitorar (opcional, default: todos)
   */
  statuses?: OrderStatus[];

  /**
   * Nome único do canal
   */
  channelName?: string;
}

/**
 * Handler especializado para eventos de pedidos
 */
export class OrderRealtimeHandler implements IRealtimeSubscription<Order> {
  private handler: SupabaseRealtimeHandler<DatabaseOrderRow>;
  private callback: OrderRealtimeCallback | null = null;
  private options: OrderRealtimeOptions;

  constructor(options: OrderRealtimeOptions = {}, supabaseClient?: SupabaseClient) {
    this.options = options;

    const channelName = options.channelName ||
      `orders-${options.sessionId || 'all'}-${Date.now()}`;

    this.handler = new SupabaseRealtimeHandler<DatabaseOrderRow>(
      {
        channelName,
        table: 'orders',
        filter: options.sessionId ? `session_id=eq.${options.sessionId}` : undefined,
        events: ['INSERT', 'UPDATE', 'DELETE'],
      },
      supabaseClient
    );
  }

  subscribe(callback: (event: RealtimeEvent<Order>) => void): void {
    // Adaptar callback genérico para callback específico
    this.subscribeWithDetails((event) => {
      callback({
        type: event.type,
        old: event.old,
        new: event.new,
        timestamp: event.timestamp,
      });
    });
  }

  /**
   * Subscrever com eventos detalhados
   */
  subscribeWithDetails(callback: OrderRealtimeCallback): void {
    this.callback = callback;

    this.handler.subscribe((event) => {
      const orderEvent = this.mapToOrderEvent(event);

      // Filtrar por status se configurado
      if (this.options.statuses && this.options.statuses.length > 0) {
        const newStatus = orderEvent.new?.status;
        const oldStatus = orderEvent.old?.status;

        // Incluir se o novo status está na lista ou se estamos removendo da lista
        const newInList = newStatus && this.options.statuses.includes(newStatus);
        const oldInList = oldStatus && this.options.statuses.includes(oldStatus);

        if (!newInList && !oldInList) {
          return; // Ignorar evento
        }
      }

      if (this.callback) {
        this.callback(orderEvent);
      }
    });
  }

  unsubscribe(): void {
    this.handler.unsubscribe();
    this.callback = null;
  }

  isSubscribed(): boolean {
    return this.handler.isSubscribed();
  }

  /**
   * Mapeia evento raw para evento de pedido
   */
  private mapToOrderEvent(event: RealtimeEvent<DatabaseOrderRow>): OrderRealtimeEvent {
    const oldOrder = event.old ? this.toDomain(event.old) : undefined;
    const newOrder = event.new ? this.toDomain(event.new) : undefined;

    return {
      type: event.type,
      old: oldOrder,
      new: newOrder,
      timestamp: event.timestamp,
      isNew: event.type === 'INSERT',
      statusChanged:
        event.type === 'UPDATE' &&
        oldOrder?.status !== newOrder?.status,
      previousStatus: oldOrder?.status,
    };
  }

  /**
   * Converte row da BD para entidade de domínio
   */
  private toDomain(data: DatabaseOrderRow): Order {
    return {
      id: data.id,
      sessionId: data.session_id,
      productId: data.product_id,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      notes: data.notes,
      status: data.status as OrderStatus,
      sessionCustomerId: data.session_customer_id,
      preparedBy: data.prepared_by ?? null,
      preparingStartedAt: data.preparing_started_at ? new Date(data.preparing_started_at) : null,
      readyAt: data.ready_at ? new Date(data.ready_at) : null,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

/**
 * Tipo interno para row da BD
 */
interface DatabaseOrderRow {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: string;
  session_customer_id: string | null;
  prepared_by?: string | null;
  preparing_started_at?: string | null;
  ready_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Factory para criar handlers de pedidos
 */
export class OrderRealtimeHandlerFactory {
  /**
   * Cria um handler para a cozinha (todos os pedidos ativos)
   */
  static forKitchen(location?: string): OrderRealtimeHandler {
    return new OrderRealtimeHandler({
      channelName: `kitchen-orders-${location || 'all'}`,
      statuses: ['pending', 'preparing', 'ready'],
    });
  }

  /**
   * Cria um handler para uma sessão específica
   */
  static forSession(sessionId: string): OrderRealtimeHandler {
    return new OrderRealtimeHandler({
      sessionId,
      channelName: `session-orders-${sessionId}`,
    });
  }

  /**
   * Cria um handler customizado
   */
  static custom(options: OrderRealtimeOptions): OrderRealtimeHandler {
    return new OrderRealtimeHandler(options);
  }
}
