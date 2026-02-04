/**
 * Session Status Value Object
 * Define os estados possíveis de uma sessão de mesa
 */

export type SessionStatus = 'active' | 'pending_payment' | 'paid' | 'closed';

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  active: 'Ativa',
  pending_payment: 'Aguarda Pagamento',
  paid: 'Paga',
  closed: 'Fechada',
};

export const SESSION_STATUS_COLORS: Record<SessionStatus, string> = {
  active: 'text-green-500',
  pending_payment: 'text-yellow-500',
  paid: 'text-blue-500',
  closed: 'text-gray-500',
};

/**
 * Transições válidas de estado de sessão
 */
export const SESSION_STATUS_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  active: ['pending_payment', 'closed'],
  pending_payment: ['paid', 'active'],
  paid: ['closed'],
  closed: [],
};

/**
 * Verifica se uma transição de estado de sessão é válida
 */
export function canSessionTransitionTo(from: SessionStatus, to: SessionStatus): boolean {
  return SESSION_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Verifica se a sessão está ativa
 */
export function isSessionActive(status: SessionStatus): boolean {
  return status === 'active' || status === 'pending_payment';
}

/**
 * Verifica se a sessão está fechada
 */
export function isSessionClosed(status: SessionStatus): boolean {
  return status === 'closed';
}
