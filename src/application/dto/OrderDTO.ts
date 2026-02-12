/**
 * Order DTOs - Data Transfer Objects para pedidos
 */

import { OrderStatus } from '@/domain/value-objects/OrderStatus';

/**
 * DTO para criar um pedido
 */
export interface CreateOrderDTO {
  sessionId: string;
  productId: string;
  quantity: number;
  notes?: string;
  sessionCustomerId?: string;
}

/**
 * DTO para atualizar um pedido
 */
export interface UpdateOrderDTO {
  quantity?: number;
  notes?: string;
}

/**
 * DTO para resposta de pedido (uso na UI)
 */
export interface OrderResponseDTO {
  id: string;
  sessionId: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

/**
 * DTO para pedido na cozinha (com mesa e cliente)
 */
export interface KitchenOrderDTO {
  id: string;
  sessionId: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;
  timeElapsedMinutes: number;
  isLate: boolean;
  urgencyColor: 'green' | 'yellow' | 'red';
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  table: {
    id: string;
    number: number;
    location: string;
  } | null;
  customerName: string | null;
  waiterName: string | null;
  preparedBy: string | null;
  preparerName: string | null;
  preparingStartedAt: string | null;
  readyAt: string | null;
  prepTimeMinutes: number | null;
  pendingMinutes: number;
  preparingMinutes: number | null;
  readyMinutes: number | null;
}

/**
 * DTO para filtros de busca de pedidos
 */
export interface OrderFilterDTO {
  sessionId?: string;
  statuses?: OrderStatus[];
  location?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * DTO para contagem de pedidos por status
 */
export interface OrderCountsDTO {
  pending: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
  total: number;
  active: number;
}

/**
 * DTO para pedido de sessão (mesa)
 */
export interface SessionOrderDTO {
  id: string;
  sessionId: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  subtotal: number;
}

/**
 * DTO para resumo de pedidos da sessão
 */
export interface SessionOrdersSummaryDTO {
  orders: SessionOrderDTO[];
  counts: OrderCountsDTO;
  totals: {
    subtotal: number;
    itemCount: number;
  };
}
