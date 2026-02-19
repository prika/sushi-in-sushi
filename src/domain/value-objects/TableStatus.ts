/**
 * Table Status Value Object
 * Define os estados possíveis de uma mesa
 */

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'inactive';

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Disponível',
  reserved: 'Reservada',
  occupied: 'Ocupada',
  inactive: 'Inativa',
};

export const TABLE_STATUS_COLORS: Record<TableStatus, string> = {
  available: 'bg-green-500',
  reserved: 'bg-yellow-500',
  occupied: 'bg-red-500',
  inactive: 'bg-gray-500',
};

/**
 * Verifica se a mesa pode receber clientes
 */
export function canAcceptCustomers(status: TableStatus): boolean {
  return status === 'available' || status === 'reserved';
}

/**
 * Verifica se a mesa está ativa
 */
export function isTableActive(status: TableStatus): boolean {
  return status !== 'inactive';
}
