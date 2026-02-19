/**
 * OrderingMode Value Object
 *
 * Represents the ordering permission mode for a session.
 * Controls whether clients can submit orders or only waiters can.
 */

/**
 * Ordering mode type
 * - 'client': Clients can submit orders normally (default)
 * - 'waiter_only': Only waiter can submit orders, clients view menu only
 */
export type OrderingMode = 'client' | 'waiter_only';

/**
 * Human-readable labels for each ordering mode (Portuguese)
 */
export const ORDERING_MODE_LABELS: Record<OrderingMode, string> = {
  client: 'Cliente pode pedir',
  waiter_only: 'Apenas empregado',
};

/**
 * Icon representations for each ordering mode
 */
export const ORDERING_MODE_ICONS: Record<OrderingMode, string> = {
  client: '🔓',
  waiter_only: '🔒',
};

/**
 * Validates if a string is a valid OrderingMode
 */
export function isValidOrderingMode(value: unknown): value is OrderingMode {
  return typeof value === 'string' && ['client', 'waiter_only'].includes(value);
}

/**
 * Converts a string to OrderingMode with fallback to default
 */
export function toOrderingMode(value: unknown, defaultMode: OrderingMode = 'client'): OrderingMode {
  return isValidOrderingMode(value) ? value : defaultMode;
}
