/**
 * OrderService - Serviço de domínio para pedidos
 * Contém a lógica de negócio pura relacionada a pedidos
 */

import { Order, _OrderWithProduct, KitchenOrder } from '../entities/Order';
import { OrderStatus, canOrderTransitionTo, getNextOrderStatus, isFinalStatus, isActiveStatus } from '../value-objects/OrderStatus';
import { ValidationResult } from './types';

/**
 * Serviço de domínio para pedidos
 * Contém apenas lógica de negócio pura, sem dependências de infraestrutura
 */
export class OrderService {
  /**
   * Verifica se um pedido pode mudar para um novo status
   */
  static canChangeStatus(order: Order, newStatus: OrderStatus): ValidationResult {
    if (order.status === newStatus) {
      return { isValid: false, error: 'Pedido já está neste estado' };
    }

    if (!canOrderTransitionTo(order.status, newStatus)) {
      return {
        isValid: false,
        error: `Não é possível mudar de '${order.status}' para '${newStatus}'`,
      };
    }

    return { isValid: true };
  }

  /**
   * Obtém o próximo status na sequência normal
   */
  static getNextStatus(order: Order): OrderStatus | null {
    return getNextOrderStatus(order.status);
  }

  /**
   * Verifica se o pedido está num estado final
   */
  static isFinal(order: Order): boolean {
    return isFinalStatus(order.status);
  }

  /**
   * Verifica se o pedido está ativo
   */
  static isActive(order: Order): boolean {
    return isActiveStatus(order.status);
  }

  /**
   * Calcula o total de um pedido
   */
  static calculateOrderTotal(order: Order): number {
    return order.quantity * order.unitPrice;
  }

  /**
   * Calcula o total de uma lista de pedidos
   */
  static calculateTotal(orders: Order[]): number {
    return orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + this.calculateOrderTotal(o), 0);
  }

  /**
   * Agrupa pedidos por status
   */
  static groupByStatus(orders: Order[]): Record<OrderStatus, Order[]> {
    const groups: Record<OrderStatus, Order[]> = {
      pending: [],
      preparing: [],
      ready: [],
      delivered: [],
      cancelled: [],
    };

    orders.forEach((order) => {
      groups[order.status].push(order);
    });

    return groups;
  }

  /**
   * Agrupa pedidos de cozinha por mesa
   */
  static groupByTable(orders: KitchenOrder[]): Map<number, KitchenOrder[]> {
    const groups = new Map<number, KitchenOrder[]>();

    orders.forEach((order) => {
      const tableNumber = order.table?.number ?? 0;
      const existing = groups.get(tableNumber) || [];
      groups.set(tableNumber, [...existing, order]);
    });

    return groups;
  }

  /**
   * Calcula o tempo decorrido desde a criação do pedido (em minutos)
   */
  static getTimeElapsed(order: Order, now: Date = new Date()): number {
    return Math.floor((now.getTime() - order.createdAt.getTime()) / 60000);
  }

  /**
   * Verifica se o pedido está atrasado
   */
  static isLate(order: Order, thresholdMinutes: number = 10, now: Date = new Date()): boolean {
    return this.getTimeElapsed(order, now) > thresholdMinutes;
  }

  /**
   * Obtém a cor de urgência baseada no tempo
   */
  static getUrgencyColor(order: Order, now: Date = new Date()): 'green' | 'yellow' | 'red' {
    const minutes = this.getTimeElapsed(order, now);

    if (minutes > 10) return 'red';
    if (minutes > 5) return 'yellow';
    return 'green';
  }

  /**
   * Ordena pedidos por urgência (mais antigos primeiro)
   */
  static sortByUrgency(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Filtra pedidos ativos (não finalizados)
   */
  static filterActive(orders: Order[]): Order[] {
    return orders.filter((o) => this.isActive(o));
  }

  /**
   * Conta pedidos por status
   */
  static countByStatus(orders: Order[]): Record<OrderStatus, number> {
    const counts: Record<OrderStatus, number> = {
      pending: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      counts[order.status]++;
    });

    return counts;
  }

  /**
   * Valida dados para criar um pedido
   */
  static validateCreateData(data: {
    quantity?: number;
    unitPrice?: number;
  }): ValidationResult {
    if (!data.quantity || data.quantity < 1) {
      return { isValid: false, error: 'Quantidade deve ser pelo menos 1' };
    }

    if (data.quantity > 99) {
      return { isValid: false, error: 'Quantidade máxima é 99' };
    }

    if (!data.unitPrice || data.unitPrice < 0) {
      return { isValid: false, error: 'Preço inválido' };
    }

    return { isValid: true };
  }
}
