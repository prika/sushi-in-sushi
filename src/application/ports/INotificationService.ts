/**
 * INotificationService - Interface para serviço de notificações
 */

import { Order } from '@/domain/entities/Order';

/**
 * Interface do serviço de notificações
 */
export interface INotificationService {
  /**
   * Notifica o empregado que um pedido está pronto
   */
  notifyWaiterOrderReady(order: Order, tableId: string): Promise<void>;

  /**
   * Notifica a cozinha de um novo pedido
   */
  notifyKitchenNewOrder(order: Order): Promise<void>;
}
