"use client";

/**
 * useCart - Hook para gestão do carrinho de compras
 *
 * Este hook abstrai toda a lógica de:
 * - Adicionar, remover e atualizar itens no carrinho
 * - Cálculo de totais (extras, rodízio, final)
 * - Gestão de notas por item
 * - Delegação de mutações ao CartService
 */

import { useState, useCallback, useMemo } from "react";
import { CartService } from "@/domain/services/CartService";
import { CartItem } from "@/domain/entities/CartItem";
import type { Product } from "@/domain/entities/Product";

/**
 * Opções do hook
 */
export interface UseCartOptions {
  /** Tipo de pedido: rodizio, carta, ou null (ainda não selecionado) */
  orderType: "rodizio" | "carta" | null;
  /** Se é hora de almoço (afeta preço do rodízio) */
  isLunch: boolean;
  /** Número de pessoas na mesa */
  numPessoas: number;
}

/**
 * Resultado do hook
 */
export interface UseCartResult {
  /** Itens atuais no carrinho */
  cart: CartItem[];
  /** Adiciona um produto ao carrinho */
  addToCart: (_product: Product, _addedBy: string) => void;
  /** Remove um produto do carrinho */
  removeFromCart: (_productId: string) => void;
  /** Atualiza a quantidade de um item */
  updateQuantity: (_productId: string, _newQuantity: number) => void;
  /** Atualiza as notas de um item */
  updateNotes: (_productId: string, _notes: string) => void;
  /** Retorna a quantidade de um produto no carrinho */
  getCartQuantity: (_productId: string) => number;
  /** Limpa todo o carrinho */
  clearCart: () => void;
  /** Total dos extras (exclui itens rodízio em modo rodízio) */
  cartTotal: number;
  /** Contagem total de itens (soma de quantidades) */
  cartItemsCount: number;
  /** Total final incluindo preço base do rodízio */
  finalTotal: number;
  /** Preço do rodízio por pessoa */
  rodizioPrice: number;
  /** ID do produto com notas em edição (ou null) */
  editingNotes: string | null;
  /** Define qual produto está com notas em edição */
  setEditingNotes: (_productId: string | null) => void;
}

/**
 * Hook para gestão do carrinho de compras
 */
export function useCart(options: UseCartOptions): UseCartResult {
  const { orderType, isLunch, numPessoas } = options;

  // Estado do carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  // Preço do rodízio (memoizado)
  const rodizioPrice = useMemo(
    () => CartService.getRodizioPrice(isLunch),
    [isLunch],
  );

  // Total dos extras (memoizado)
  const cartTotal = useMemo(
    () => CartService.calculateExtrasTotal(cart, orderType === "rodizio"),
    [cart, orderType],
  );

  // Contagem de itens (memoizado)
  const cartItemsCount = useMemo(() => CartService.countItems(cart), [cart]);

  // Total final (memoizado)
  const finalTotal = useMemo(
    () =>
      CartService.calculateFinalTotal(
        cartTotal,
        orderType,
        rodizioPrice,
        numPessoas,
      ),
    [cartTotal, orderType, rodizioPrice, numPessoas],
  );

  /**
   * Adiciona um produto ao carrinho
   */
  const addToCart = useCallback((product: Product, addedBy: string) => {
    setCart((prev) => CartService.addItem(prev, product, addedBy));
  }, []);

  /**
   * Remove um produto do carrinho
   */
  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => CartService.removeItem(prev, productId));
  }, []);

  /**
   * Atualiza a quantidade de um item
   */
  const updateQuantity = useCallback(
    (productId: string, newQuantity: number) => {
      setCart((prev) =>
        CartService.updateItemQuantity(prev, productId, newQuantity),
      );
    },
    [],
  );

  /**
   * Atualiza as notas de um item
   */
  const updateNotes = useCallback((productId: string, notes: string) => {
    setCart((prev) => CartService.updateItemNotes(prev, productId, notes));
  }, []);

  /**
   * Retorna a quantidade de um produto no carrinho
   */
  const getCartQuantity = useCallback(
    (productId: string): number => {
      return CartService.getItemQuantity(cart, productId);
    },
    [cart],
  );

  /**
   * Limpa todo o carrinho
   */
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateNotes,
    getCartQuantity,
    clearCart,
    cartTotal,
    cartItemsCount,
    finalTotal,
    rodizioPrice,
    editingNotes,
    setEditingNotes,
  };
}
