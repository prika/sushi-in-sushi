'use client';

/**
 * useSessionOrders - Hook para gestão de pedidos de uma sessão
 *
 * Este hook abstrai toda a lógica de:
 * - Fetch de pedidos de uma sessão
 * - Subscrição real-time a alterações
 * - Totais e contagens
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDependencies } from '../contexts/DependencyContext';
import { SessionOrderDTO, SessionOrdersSummaryDTO, OrderCountsDTO } from '@/application/dto/OrderDTO';
import { OrderStatus } from '@/domain/value-objects/OrderStatus';
import {
  OrderRealtimeHandler,
  OrderRealtimeHandlerFactory,
  OrderRealtimeEvent,
} from '@/infrastructure/realtime/OrderRealtimeHandler';

/**
 * Opções do hook
 */
export interface UseSessionOrdersOptions {
  /**
   * ID da sessão (obrigatório)
   */
  sessionId: string;

  /**
   * Ativar subscrição real-time (default: true)
   */
  realtime?: boolean;

  /**
   * Callback quando um pedido é criado
   */
  onOrderCreated?: (order: SessionOrderDTO) => void;

  /**
   * Callback quando um pedido é atualizado
   */
  onOrderUpdated?: (order: SessionOrderDTO, previousStatus: OrderStatus) => void;

  /**
   * Intervalo de refresh automático em ms (0 para desativar)
   */
  refreshInterval?: number;
}

/**
 * Resultado do hook
 */
export interface UseSessionOrdersResult {
  /**
   * Todos os pedidos da sessão
   */
  orders: SessionOrderDTO[];

  /**
   * Contagens de pedidos por status
   */
  counts: OrderCountsDTO;

  /**
   * Totais (subtotal, quantidade de itens)
   */
  totals: {
    subtotal: number;
    itemCount: number;
  };

  /**
   * Estado de carregamento
   */
  isLoading: boolean;

  /**
   * Erro (se existir)
   */
  error: string | null;

  /**
   * Força refresh dos dados
   */
  refresh: () => Promise<void>;

  /**
   * Cria um novo pedido
   */
  createOrder: (productId: string, quantity: number, notes?: string, sessionCustomerId?: string) => Promise<boolean>;

  /**
   * Cancela um pedido
   */
  cancelOrder: (orderId: string) => Promise<boolean>;
}

/**
 * Hook para gestão de pedidos de uma sessão
 */
export function useSessionOrders(
  options: UseSessionOrdersOptions
): UseSessionOrdersResult {
  const {
    sessionId,
    realtime = true,
    onOrderCreated,
    onOrderUpdated,
    refreshInterval = 0, // Desativado por defeito para sessões
  } = options;

  const { getSessionOrders, createOrder, updateOrderStatus } = useDependencies();

  // Estado
  const [orders, setOrders] = useState<SessionOrderDTO[]>([]);
  const [counts, setCounts] = useState<OrderCountsDTO>({
    pending: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
    total: 0,
    active: 0,
  });
  const [totals, setTotals] = useState<{ subtotal: number; itemCount: number }>({
    subtotal: 0,
    itemCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const realtimeHandlerRef = useRef<OrderRealtimeHandler | null>(null);
  const recentlyUpdatedRef = useRef<Set<string>>(new Set());

  /**
   * Carrega pedidos do servidor
   */
  const fetchOrders = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getSessionOrders.execute({ sessionId });

      if (result.success) {
        setOrders(result.data.orders);
        setCounts(result.data.counts);
        setTotals(result.data.totals);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [getSessionOrders, sessionId]);

  /**
   * Cria um novo pedido
   */
  const handleCreateOrder = useCallback(
    async (
      productId: string,
      quantity: number,
      notes?: string,
      sessionCustomerId?: string
    ): Promise<boolean> => {
      try {
        const result = await createOrder.execute({
          sessionId,
          productId,
          quantity,
          notes,
          sessionCustomerId,
        });

        if (result.success) {
          // Refresh para obter dados atualizados
          await fetchOrders();
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar pedido');
        return false;
      }
    },
    [createOrder, sessionId, fetchOrders]
  );

  /**
   * Cancela um pedido
   */
  const handleCancelOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      recentlyUpdatedRef.current.add(orderId);
      setTimeout(() => {
        recentlyUpdatedRef.current.delete(orderId);
      }, 5000);

      try {
        const result = await updateOrderStatus.execute({
          orderId,
          newStatus: 'cancelled',
        });

        if (result.success) {
          // Atualização otimista
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o
            )
          );

          // Recalcular contagens e totais
          await fetchOrders();
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao cancelar pedido');
        return false;
      }
    },
    [updateOrderStatus, fetchOrders]
  );

  /**
   * Handler de eventos real-time
   */
  const handleRealtimeEvent = useCallback(
    (event: OrderRealtimeEvent) => {
      // Ignorar se foi atualizado localmente
      if (event.new && recentlyUpdatedRef.current.has(event.new.id)) {
        return;
      }

      // Ignorar se não é desta sessão
      if (event.new && event.new.sessionId !== sessionId) {
        return;
      }

      if (event.isNew && event.new) {
        // Novo pedido - refetch para obter dados completos
        fetchOrders();

        // Callback
        const orderDTO: SessionOrderDTO = {
          id: event.new.id,
          sessionId: event.new.sessionId,
          quantity: event.new.quantity,
          unitPrice: event.new.unitPrice,
          notes: event.new.notes,
          status: event.new.status,
          createdAt: event.new.createdAt.toISOString(),
          product: { id: '', name: '', imageUrl: null },
          subtotal: event.new.quantity * event.new.unitPrice,
        };
        onOrderCreated?.(orderDTO);
      } else if (event.statusChanged && event.new) {
        // Status mudou - refetch
        fetchOrders();

        // Callback
        if (event.previousStatus) {
          const orderDTO: SessionOrderDTO = {
            id: event.new.id,
            sessionId: event.new.sessionId,
            quantity: event.new.quantity,
            unitPrice: event.new.unitPrice,
            notes: event.new.notes,
            status: event.new.status,
            createdAt: event.new.createdAt.toISOString(),
            product: { id: '', name: '', imageUrl: null },
            subtotal: event.new.quantity * event.new.unitPrice,
          };
          onOrderUpdated?.(orderDTO, event.previousStatus);
        }
      }
    },
    [sessionId, fetchOrders, onOrderCreated, onOrderUpdated]
  );

  // Fetch inicial
  useEffect(() => {
    if (sessionId) {
      fetchOrders();
    }
  }, [fetchOrders, sessionId]);

  // Subscrição real-time
  useEffect(() => {
    if (!realtime || !sessionId) return;

    realtimeHandlerRef.current = OrderRealtimeHandlerFactory.forSession(sessionId);
    realtimeHandlerRef.current.subscribeWithDetails(handleRealtimeEvent);

    return () => {
      realtimeHandlerRef.current?.unsubscribe();
      realtimeHandlerRef.current = null;
    };
  }, [realtime, sessionId, handleRealtimeEvent]);

  // Refresh automático
  useEffect(() => {
    if (refreshInterval <= 0 || !sessionId) return;

    const interval = setInterval(fetchOrders, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, sessionId, fetchOrders]);

  return {
    orders,
    counts,
    totals,
    isLoading,
    error,
    refresh: fetchOrders,
    createOrder: handleCreateOrder,
    cancelOrder: handleCancelOrder,
  };
}
