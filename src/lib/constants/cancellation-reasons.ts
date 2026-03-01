export interface CancellationReason {
  id: string;
  label: string;
  isCustom?: boolean;
  source: 'admin' | 'customer' | 'both';
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  // Admin-only
  { id: 'restaurant_full', label: 'Restaurante lotado', source: 'admin' },
  { id: 'time_unavailable', label: 'Horário indisponível', source: 'admin' },
  { id: 'private_event', label: 'Evento privado', source: 'admin' },
  { id: 'unexpected_closure', label: 'Encerramento inesperado', source: 'admin' },
  // Customer-only
  { id: 'change_of_plans', label: 'Mudança de planos', source: 'customer' },
  { id: 'found_alternative', label: 'Encontrei outra opção', source: 'customer' },
  { id: 'health_issues', label: 'Problemas de saúde', source: 'customer' },
  // Shared
  { id: 'customer_request', label: 'Pedido do cliente', source: 'both' },
  { id: 'date_change', label: 'Alteração de data', source: 'both' },
  { id: 'other', label: 'Outro (especificar)', source: 'both', isCustom: true },
];

export function getReasonsForSource(source: 'admin' | 'customer'): CancellationReason[] {
  return CANCELLATION_REASONS.filter(r => r.source === source || r.source === 'both');
}
