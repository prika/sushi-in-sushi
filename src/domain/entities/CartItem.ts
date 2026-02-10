/**
 * CartItem Entity
 * Representa um item no carrinho de compras do cliente
 */

import { Product } from './Product';

/**
 * Entidade CartItem - Item no carrinho local do cliente
 */
export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  notes?: string;
  addedBy?: string;
}

/**
 * Formato de inserção de pedido na base de dados
 */
export interface OrderInsert {
  session_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  status: 'pending';
  session_customer_id: string | null;
}

/**
 * Informação de duplicado detectado
 */
export interface DuplicateInfo {
  totalQty: number;
}
