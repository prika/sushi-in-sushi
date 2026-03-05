/**
 * Order Entity
 * Representa um pedido no domínio
 */

import { OrderStatus } from '../value-objects/OrderStatus';

/**
 * Entidade Order - Representa um pedido
 */
export interface Order {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  status: OrderStatus;
  sessionCustomerId: string | null;
  preparedBy: string | null;
  preparingStartedAt: Date | null;
  readyAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criar um novo pedido
 */
export interface CreateOrderData {
  sessionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  sessionCustomerId?: string | null;
}

/**
 * Dados para atualizar um pedido
 */
export interface UpdateOrderData {
  quantity?: number;
  notes?: string | null;
  status?: OrderStatus;
  preparedBy?: string | null;
}

/**
 * Order com informações do produto (para display)
 */
export interface OrderWithProduct extends Order {
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

/**
 * Order completo para a cozinha (com mesa e cliente)
 */
export interface KitchenOrder extends OrderWithProduct {
  table: {
    id: string;
    number: number;
    location: string;
  } | null;
  zone: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
  customerName: string | null;
  waiterName: string | null;
  preparerName: string | null;
}
