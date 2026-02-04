/**
 * Order Status Value Object
 * Define os estados possíveis de um pedido e as transições válidas
 */

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Na fila',
  preparing: 'A preparar',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '⏳',
  preparing: '🔥',
  ready: '✅',
  delivered: '🍽️',
  cancelled: '❌',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'text-yellow-500',
  preparing: 'text-orange-500',
  ready: 'text-green-500',
  delivered: 'text-gray-500',
  cancelled: 'text-red-500',
};

/**
 * Transições válidas de estado
 * Cada estado mapeia para os estados para os quais pode transitar
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * Verifica se uma transição de estado de pedido é válida
 */
export function canOrderTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Obtém o próximo estado de pedido na sequência normal
 */
export function getNextOrderStatus(current: OrderStatus): OrderStatus | null {
  const sequence: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered'];
  const currentIndex = sequence.indexOf(current);

  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return null;
  }

  return sequence[currentIndex + 1];
}

/**
 * Verifica se o pedido está num estado final
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}

/**
 * Verifica se o pedido está ativo (não finalizado)
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return !isFinalStatus(status);
}
