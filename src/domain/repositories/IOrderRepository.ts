/**
 * IOrderRepository - Interface do repositório de pedidos
 * Define o contrato para acesso a dados de pedidos
 */

import { Order, CreateOrderData, UpdateOrderData, OrderWithProduct, KitchenOrder } from '../entities/Order';
import { OrderStatus } from '../value-objects/OrderStatus';

/**
 * Filtros para busca de pedidos
 */
export interface OrderFilter {
  sessionId?: string;
  statuses?: OrderStatus[];
  tableId?: string;
  location?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Interface do repositório de pedidos
 * Implementações concretas (Supabase, etc.) devem implementar esta interface
 */
export interface IOrderRepository {
  /**
   * Busca um pedido por ID
   */
  findById(id: string): Promise<Order | null>;

  /**
   * Busca um pedido por ID com informações do produto
   */
  findByIdWithProduct(id: string): Promise<OrderWithProduct | null>;

  /**
   * Busca todos os pedidos com filtros opcionais
   */
  findAll(filter?: OrderFilter): Promise<Order[]>;

  /**
   * Busca pedidos de uma sessão específica
   */
  findBySession(sessionId: string): Promise<OrderWithProduct[]>;

  /**
   * Busca pedidos para a cozinha (com mesa e cliente)
   */
  findForKitchen(filter?: OrderFilter): Promise<KitchenOrder[]>;

  /**
   * Cria um novo pedido
   */
  create(data: CreateOrderData): Promise<Order>;

  /**
   * Atualiza um pedido
   */
  update(id: string, data: UpdateOrderData): Promise<Order>;

  /**
   * Atualiza o status de um pedido
   */
  updateStatus(id: string, status: OrderStatus): Promise<Order>;

  /**
   * Remove um pedido
   */
  delete(id: string): Promise<void>;

  /**
   * Conta pedidos por status
   */
  countByStatus(sessionId?: string): Promise<Record<OrderStatus, number>>;
}
