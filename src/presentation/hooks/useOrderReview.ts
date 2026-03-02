"use client";

/**
 * useOrderReview - Hook para revisão de pedidos antes da submissão
 *
 * Este hook abstrai toda a lógica de:
 * - Abertura/fecho do modal de revisão
 * - Deteção de duplicados (produtos já pedidos na sessão)
 * - Confirmação/anulação de duplicados
 * - Validação de duplicados por confirmar
 */

import { useState, useMemo, useCallback } from "react";
import { CartService } from "@/domain/services/CartService";
import { CartItem, DuplicateInfo } from "@/domain/entities/CartItem";

/**
 * Opções do hook
 */
export interface UseOrderReviewOptions {
  /** Itens atuais no carrinho */
  cart: CartItem[];
  /** Pedidos existentes na sessão (para deteção de duplicados) */
  sessionOrders: Array<{
    product_id: string;
    quantity: number;
    status: string;
  }>;
}

/**
 * Resultado do hook
 */
export interface UseOrderReviewResult {
  /** Se o modal de revisão está visível */
  showReviewModal: boolean;
  /** Abre o modal de revisão (e reseta confirmações) */
  openReview: () => void;
  /** Fecha o modal de revisão */
  closeReview: () => void;
  /** Mapa de duplicados: productId -> DuplicateInfo */
  duplicateMap: Map<string, DuplicateInfo>;
  /** Itens do carrinho que são duplicados */
  duplicateItems: CartItem[];
  /** Se existem duplicados ainda por confirmar */
  hasUnconfirmedDuplicates: boolean;
  /** Conjunto de productIds confirmados pelo utilizador */
  confirmedDuplicates: Set<string>;
  /** Confirma um duplicado (o utilizador aceita a repetição) */
  confirmDuplicate: (_productId: string) => void;
  /** Anula a confirmação de um duplicado */
  undoConfirmDuplicate: (_productId: string) => void;
}

/**
 * Hook para revisão de pedidos antes da submissão
 */
export function useOrderReview(
  options: UseOrderReviewOptions,
): UseOrderReviewResult {
  const { cart, sessionOrders } = options;

  // Estado do modal
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Conjunto de duplicados confirmados pelo utilizador
  const [confirmedDuplicates, setConfirmedDuplicates] = useState<Set<string>>(
    new Set(),
  );

  // Mapa de duplicados (memoizado)
  const duplicateMap = useMemo(
    () => CartService.detectDuplicates(cart, sessionOrders),
    [cart, sessionOrders],
  );

  // Itens duplicados (memoizado)
  const duplicateItems = useMemo(
    () => CartService.getDuplicateItems(cart, duplicateMap),
    [cart, duplicateMap],
  );

  // Se existem duplicados por confirmar (memoizado)
  const hasUnconfirmedDuplicates = useMemo(
    () =>
      CartService.hasUnconfirmedDuplicates(duplicateItems, confirmedDuplicates),
    [duplicateItems, confirmedDuplicates],
  );

  /**
   * Abre o modal de revisão e reseta confirmações
   */
  const openReview = useCallback(() => {
    setConfirmedDuplicates(new Set());
    setShowReviewModal(true);
  }, []);

  /**
   * Fecha o modal de revisão
   */
  const closeReview = useCallback(() => {
    setShowReviewModal(false);
  }, []);

  /**
   * Confirma um duplicado
   */
  const confirmDuplicate = useCallback((productId: string) => {
    setConfirmedDuplicates((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  }, []);

  /**
   * Anula a confirmação de um duplicado
   */
  const undoConfirmDuplicate = useCallback((productId: string) => {
    setConfirmedDuplicates((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  return {
    showReviewModal,
    openReview,
    closeReview,
    duplicateMap,
    duplicateItems,
    hasUnconfirmedDuplicates,
    confirmedDuplicates,
    confirmDuplicate,
    undoConfirmDuplicate,
  };
}
