"use client";

/**
 * useSessionOrderingMode - Hook para gerir o modo de pedidos de uma sessão
 *
 * Permite que staff (admin/waiter) alterne entre:
 * - 'client': Clientes podem fazer pedidos normalmente
 * - 'waiter_only': Apenas waiter pode fazer pedidos (modo bloqueio)
 */

import { useState, useCallback } from "react";
import { useDependencies } from "../contexts/DependencyContext";
import { OrderingMode } from "@/domain/value-objects/OrderingMode";
import { useAuth } from "@/contexts/AuthContext";

export interface UseSessionOrderingModeResult {
  /**
   * Current ordering mode (null se ainda não carregado)
   */
  orderingMode: OrderingMode | null;

  /**
   * Se verdadeiro, clientes podem fazer pedidos
   */
  canClientOrder: boolean;

  /**
   * Atualiza o modo de pedidos
   */
  updateMode: (
    _newMode: OrderingMode,
  ) => Promise<{ success: boolean; error?: string }>;

  /**
   * Estado de loading durante atualização
   */
  isUpdating: boolean;
}

/**
 * Hook para gestão do ordering mode de uma sessão
 *
 * @param sessionId - ID da sessão
 * @param initialMode - Modo inicial (opcional)
 */
export function useSessionOrderingMode(
  sessionId: string | null,
  initialMode?: OrderingMode,
): UseSessionOrderingModeResult {
  const { updateSessionOrderingMode } = useDependencies();
  const { user } = useAuth();

  const [orderingMode, setOrderingMode] = useState<OrderingMode | null>(
    initialMode || null,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Atualiza o ordering mode
   */
  const updateMode = useCallback(
    async (
      newMode: OrderingMode,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!sessionId) {
        return { success: false, error: "Nenhuma sessão selecionada" };
      }

      if (!user) {
        return { success: false, error: "Não autenticado" };
      }

      setIsUpdating(true);

      try {
        const result = await updateSessionOrderingMode.execute({
          sessionId,
          orderingMode: newMode,
          staffId: user.id,
        });

        if (result.success && result.data) {
          setOrderingMode(result.data.orderingMode);
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [sessionId, user, updateSessionOrderingMode],
  );

  const canClientOrder = orderingMode === "client";

  return {
    orderingMode,
    canClientOrder,
    updateMode,
    isUpdating,
  };
}
