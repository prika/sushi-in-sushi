/**
 * Session Entity
 * Representa uma sessão de mesa (refeição) no domínio
 */

import { SessionStatus } from '../value-objects/SessionStatus';

/**
 * Entidade Session - Representa uma sessão de mesa
 */
export interface Session {
  id: string;
  tableId: string;
  status: SessionStatus;
  isRodizio: boolean;
  numPeople: number;
  totalAmount: number;
  startedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criar uma nova sessão
 */
export interface CreateSessionData {
  tableId: string;
  isRodizio: boolean;
  numPeople: number;
}

/**
 * Dados para atualizar uma sessão
 */
export interface UpdateSessionData {
  status?: SessionStatus;
  numPeople?: number;
  totalAmount?: number;
  closedAt?: Date | null;
}

/**
 * Session com informações da mesa
 */
export interface SessionWithTable extends Session {
  table: {
    id: string;
    number: number;
    name: string;
    location: string;
  };
}

/**
 * Session completa com pedidos
 */
export interface SessionWithOrders extends SessionWithTable {
  orders: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    status: string;
  }>;
}
