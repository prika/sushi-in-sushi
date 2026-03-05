"use client";

/**
 * useKitchenOrders - Hook para gestão de pedidos da cozinha
 *
 * Este hook abstrai toda a lógica de:
 * - Fetch de pedidos para a cozinha
 * - Subscrição real-time a novos pedidos
 * - Atualização de status de pedidos
 * - Agrupamento e contagem de pedidos
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useDependencies } from "../contexts/DependencyContext";
import { KitchenOrderDTO, OrderCountsDTO } from "@/application/dto/OrderDTO";
import { OrderStatus } from "@/domain/value-objects/OrderStatus";
import {
  OrderRealtimeHandler,
  OrderRealtimeHandlerFactory,
  OrderRealtimeEvent,
} from "@/infrastructure/realtime/OrderRealtimeHandler";

/**
 * Opções do hook
 */
export interface UseKitchenOrdersOptions {
  /**
   * Localização a filtrar (opcional)
   */
  location?: string;

  /**
   * Ativar subscrição real-time (default: true)
   */
  realtime?: boolean;

  /**
   * Callback quando um novo pedido chega
   */
  onNewOrder?: (_order: KitchenOrderDTO) => void;

  /**
   * Callback quando um pedido é atualizado
   */
  onOrderUpdated?: (
    _order: KitchenOrderDTO,
    _previousStatus: OrderStatus,
  ) => void;

  /**
   * Intervalo de refresh automático em ms (0 para desativar)
   */
  refreshInterval?: number;
}

/**
 * Resultado do hook
 */
export interface UseKitchenOrdersResult {
  /**
   * Todos os pedidos
   */
  orders: KitchenOrderDTO[];

  /**
   * Pedidos agrupados por status
   */
  byStatus: {
    pending: KitchenOrderDTO[];
    preparing: KitchenOrderDTO[];
    ready: KitchenOrderDTO[];
  };

  /**
   * Contagens de pedidos
   */
  counts: OrderCountsDTO;

  /**
   * Estado de carregamento
   */
  isLoading: boolean;

  /**
   * Erro (se existir)
   */
  error: string | null;

  /**
   * IDs de pedidos novos (para animação)
   */
  newOrderIds: Set<string>;

  /**
   * Atualiza o status de um pedido
   */
  updateStatus: (_orderId: string, _newStatus: OrderStatus) => Promise<boolean>;

  /**
   * Avança um pedido para o próximo status
   */
  advanceOrder: (_orderId: string) => Promise<boolean>;

  /**
   * Força refresh dos dados
   */
  refresh: () => Promise<void>;

  /**
   * Limpa o indicador de "novo" de um pedido
   */
  clearNewIndicator: (_orderId: string) => void;
}

/**
 * Hook para gestão de pedidos da cozinha
 */
export function useKitchenOrders(
  options: UseKitchenOrdersOptions = {},
): UseKitchenOrdersResult {
  const {
    location,
    realtime = true,
    onNewOrder,
    onOrderUpdated,
    refreshInterval = 60000, // 1 minuto por defeito
  } = options;

  const { getKitchenOrders, updateOrderStatus } = useDependencies();

  // Estado
  const [orders, setOrders] = useState<KitchenOrderDTO[]>([]);
  const [byStatus, setByStatus] = useState<{
    pending: KitchenOrderDTO[];
    preparing: KitchenOrderDTO[];
    ready: KitchenOrderDTO[];
  }>({
    pending: [],
    preparing: [],
    ready: [],
  });
  const [counts, setCounts] = useState<OrderCountsDTO>({
    pending: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
    total: 0,
    active: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Refs para evitar re-renders desnecessários
  const realtimeHandlerRef = useRef<OrderRealtimeHandler | null>(null);
  const recentlyUpdatedRef = useRef<Set<string>>(new Set());

  /**
   * Carrega pedidos do servidor
   */
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getKitchenOrders.execute({
        statuses: ["pending", "preparing", "ready"],
        location,
      });

      if (result.success) {
        setOrders(result.data.orders);
        setByStatus(result.data.byStatus);
        setCounts(result.data.counts);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedidos");
    } finally {
      setIsLoading(false);
    }
  }, [getKitchenOrders, location]);

  /**
   * Atualiza status de um pedido
   */
  const handleUpdateStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
      // Marcar como atualizado recentemente (para ignorar evento real-time)
      recentlyUpdatedRef.current.add(orderId);
      setTimeout(() => {
        recentlyUpdatedRef.current.delete(orderId);
      }, 5000);

      try {
        const result = await updateOrderStatus.execute({
          orderId,
          newStatus,
        });

        if (result.success) {
          // Atualização otimista - atualizar estado local
          setOrders((prev) =>
            prev
              .map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
              .filter((o) =>
                ["pending", "preparing", "ready"].includes(o.status),
              ),
          );

          // Re-agrupar
          setByStatus((prev) => {
            const order = prev.pending
              .concat(prev.preparing, prev.ready)
              .find((o) => o.id === orderId);

            if (!order) return prev;

            const updatedOrder = { ...order, status: newStatus };

            return {
              pending:
                newStatus === "pending"
                  ? [
                      ...prev.pending.filter((o) => o.id !== orderId),
                      updatedOrder,
                    ]
                  : prev.pending.filter((o) => o.id !== orderId),
              preparing:
                newStatus === "preparing"
                  ? [
                      ...prev.preparing.filter((o) => o.id !== orderId),
                      updatedOrder,
                    ]
                  : prev.preparing.filter((o) => o.id !== orderId),
              ready:
                newStatus === "ready"
                  ? [
                      ...prev.ready.filter((o) => o.id !== orderId),
                      updatedOrder,
                    ]
                  : prev.ready.filter((o) => o.id !== orderId),
            };
          });

          // Atualizar contagens
          setCounts((prev) => {
            const newCounts = { ...prev };
            // Decrementar status anterior e incrementar novo
            // (simplificado - refresh completo seria mais preciso)
            return newCounts;
          });

          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao atualizar pedido",
        );
        return false;
      }
    },
    [updateOrderStatus],
  );

  /**
   * Avança pedido para próximo status
   */
  const advanceOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return false;

      const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
        pending: "preparing",
        preparing: "ready",
        ready: "delivered",
      };

      const nextStatus = nextStatusMap[order.status];
      if (!nextStatus) return false;

      return handleUpdateStatus(orderId, nextStatus);
    },
    [orders, handleUpdateStatus],
  );

  /**
   * Limpa indicador de "novo"
   */
  const clearNewIndicator = useCallback((orderId: string) => {
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  /**
   * Handler de eventos real-time
   */
  const handleRealtimeEvent = useCallback(
    (event: OrderRealtimeEvent) => {
      // Ignorar se foi atualizado localmente
      if (event.new && recentlyUpdatedRef.current.has(event.new.id)) {
        return;
      }

      if (event.isNew && event.new) {
        // Novo pedido - refetch para obter dados completos
        fetchOrders();

        // Marcar como novo
        setNewOrderIds((prev) => new Set(prev).add(event.new!.id));

        // Callback
        onNewOrder?.({
          id: event.new.id,
          sessionId: event.new.sessionId,
          quantity: event.new.quantity,
          unitPrice: event.new.unitPrice,
          notes: event.new.notes,
          status: event.new.status,
          createdAt: event.new.createdAt.toISOString(),
          timeElapsedMinutes: 0,
          isLate: false,
          urgencyColor: "green",
          product: { id: "", name: "", imageUrl: null },
          table: null,
          zone: null,
          customerName: null,
          waiterName: null,
          preparedBy: null,
          preparerName: null,
          preparingStartedAt: null,
          readyAt: null,
          prepTimeMinutes: null,
          pendingMinutes: 0,
          preparingMinutes: null,
          readyMinutes: null,
        });

        // Limpar indicador após 10 segundos
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(event.new!.id);
            return next;
          });
        }, 10000);
      } else if (event.statusChanged && event.new) {
        // Status mudou - atualizar ou remover
        const newStatus = event.new.status;
        const isRelevant = ["pending", "preparing", "ready"].includes(
          newStatus,
        );

        if (isRelevant) {
          // Refetch para obter dados atualizados
          fetchOrders();
        } else {
          // Remover da lista
          setOrders((prev) => prev.filter((o) => o.id !== event.new!.id));
        }

        // Callback
        if (event.previousStatus) {
          const orderDTO: KitchenOrderDTO = {
            id: event.new.id,
            sessionId: event.new.sessionId,
            quantity: event.new.quantity,
            unitPrice: event.new.unitPrice,
            notes: event.new.notes,
            status: event.new.status,
            createdAt: event.new.createdAt.toISOString(),
            timeElapsedMinutes: 0,
            isLate: false,
            urgencyColor: "green",
            product: { id: "", name: "", imageUrl: null },
            table: null,
            zone: null,
            customerName: null,
            waiterName: null,
            preparedBy: null,
            preparerName: null,
            preparingStartedAt: null,
            readyAt: null,
            prepTimeMinutes: null,
            pendingMinutes: 0,
            preparingMinutes: null,
            readyMinutes: null,
          };
          onOrderUpdated?.(orderDTO, event.previousStatus);
        }
      }
    },
    [fetchOrders, onNewOrder, onOrderUpdated],
  );

  // Fetch inicial
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Subscrição real-time
  useEffect(() => {
    if (!realtime) return;

    realtimeHandlerRef.current =
      OrderRealtimeHandlerFactory.forKitchen(location);
    realtimeHandlerRef.current.subscribeWithDetails(handleRealtimeEvent);

    return () => {
      realtimeHandlerRef.current?.unsubscribe();
      realtimeHandlerRef.current = null;
    };
  }, [realtime, location, handleRealtimeEvent]);

  // Refresh automático
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchOrders, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchOrders]);

  return {
    orders,
    byStatus,
    counts,
    isLoading,
    error,
    newOrderIds,
    updateStatus: handleUpdateStatus,
    advanceOrder,
    refresh: fetchOrders,
    clearNewIndicator,
  };
}
