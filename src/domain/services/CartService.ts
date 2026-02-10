/**
 * CartService - Serviço de domínio para lógica de carrinho
 * Métodos estáticos puros, sem dependências externas
 */

import { Product } from '../entities/Product';
import { CartItem, OrderInsert, DuplicateInfo } from '../entities/CartItem';
import { ValidationResult } from './types';

export class CartService {
  /**
   * Adiciona um produto ao carrinho.
   * Se o produto já existir, incrementa a quantidade.
   */
  static addItem(cart: CartItem[], product: Product, addedBy: string): CartItem[] {
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      return cart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    }
    return [...cart, { productId: product.id, product, quantity: 1, addedBy }];
  }

  /**
   * Remove um produto do carrinho pelo productId
   */
  static removeItem(cart: CartItem[], productId: string): CartItem[] {
    return cart.filter((item) => item.productId !== productId);
  }

  /**
   * Actualiza a quantidade de um item.
   * Se newQuantity <= 0, remove o item.
   */
  static updateItemQuantity(cart: CartItem[], productId: string, newQuantity: number): CartItem[] {
    if (newQuantity <= 0) {
      return CartService.removeItem(cart, productId);
    }
    return cart.map((item) =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item,
    );
  }

  /**
   * Actualiza as notas de um item
   */
  static updateItemNotes(cart: CartItem[], productId: string, notes: string): CartItem[] {
    return cart.map((item) =>
      item.productId === productId ? { ...item, notes } : item,
    );
  }

  /**
   * Calcula o total de extras (itens não incluídos no rodízio).
   * Em modo rodízio, itens com product.isRodizio são gratuitos.
   */
  static calculateExtrasTotal(cart: CartItem[], isRodizio: boolean): number {
    return cart.reduce((total, item) => {
      if (isRodizio && item.product.isRodizio) {
        return total;
      }
      return total + item.product.price * item.quantity;
    }, 0);
  }

  /**
   * Conta o número total de itens no carrinho (soma das quantidades)
   */
  static countItems(cart: CartItem[]): number {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }

  /**
   * Retorna a quantidade de um produto específico no carrinho
   */
  static getItemQuantity(cart: CartItem[], productId: string): number {
    const item = cart.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  }

  /**
   * Calcula o total final do pedido.
   * Rodízio: preço base × pessoas + extras.
   * Carta: apenas extras.
   */
  static calculateFinalTotal(
    extrasTotal: number,
    orderType: string | null,
    rodizioPrice: number,
    numPessoas: number,
  ): number {
    if (orderType === 'rodizio') {
      return rodizioPrice * numPessoas + extrasTotal;
    }
    return extrasTotal;
  }

  /**
   * Retorna o preço do rodízio baseado no período
   */
  static getRodizioPrice(isLunch: boolean): number {
    return isLunch ? 17 : 20;
  }

  /**
   * Detecta duplicados: produtos no carrinho que já foram pedidos na sessão.
   * Exclui pedidos cancelados e entregues.
   */
  static detectDuplicates(
    cart: CartItem[],
    sessionOrders: Array<{ product_id: string; quantity: number; status: string }>,
  ): Map<string, DuplicateInfo> {
    const existingProducts = new Map<string, DuplicateInfo>();

    sessionOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'delivered')
      .forEach((o) => {
        const entry = existingProducts.get(o.product_id) || { totalQty: 0 };
        entry.totalQty += o.quantity;
        existingProducts.set(o.product_id, entry);
      });

    // Filtrar para apenas incluir produtos que estão no carrinho
    const duplicateMap = new Map<string, DuplicateInfo>();
    cart.forEach((item) => {
      const existing = existingProducts.get(item.productId);
      if (existing) {
        duplicateMap.set(item.productId, existing);
      }
    });

    return duplicateMap;
  }

  /**
   * Retorna os itens do carrinho que são duplicados
   */
  static getDuplicateItems(
    cart: CartItem[],
    duplicateMap: Map<string, DuplicateInfo>,
  ): CartItem[] {
    return cart.filter((item) => duplicateMap.has(item.productId));
  }

  /**
   * Verifica se existem duplicados por confirmar
   */
  static hasUnconfirmedDuplicates(
    duplicateItems: CartItem[],
    confirmedIds: Set<string>,
  ): boolean {
    return duplicateItems.some((item) => !confirmedIds.has(item.productId));
  }

  /**
   * Constrói o payload de inserção de pedidos para a base de dados
   */
  static buildOrderInserts(
    cart: CartItem[],
    sessionId: string,
    sessionCustomerId: string | null,
  ): OrderInsert[] {
    return cart.map((item) => ({
      session_id: sessionId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.product.price,
      notes: item.notes || null,
      status: 'pending' as const,
      session_customer_id: sessionCustomerId,
    }));
  }

  /**
   * Agrupa itens do carrinho por pessoa (addedBy)
   */
  static groupByPerson(cart: CartItem[]): Record<string, CartItem[]> {
    return cart.reduce((acc, item) => {
      const person = item.addedBy || '?';
      if (!acc[person]) acc[person] = [];
      acc[person].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);
  }

  /**
   * Valida o carrinho antes da submissão
   */
  static validateCart(cart: CartItem[]): ValidationResult {
    if (cart.length === 0) {
      return { isValid: false, error: 'Carrinho está vazio' };
    }

    const invalidItem = cart.find((item) => item.quantity < 1);
    if (invalidItem) {
      return { isValid: false, error: `Quantidade inválida para ${invalidItem.product.name}` };
    }

    const negativePrice = cart.find((item) => item.product.price < 0);
    if (negativePrice) {
      return { isValid: false, error: `Preço inválido para ${negativePrice.product.name}` };
    }

    return { isValid: true };
  }
}
