/**
 * WaiterAssignmentService - Serviço de domínio para atribuição automática de mesas
 *
 * Contém a lógica pura de seleção do waiter menos ocupado.
 * Sem dependências externas - apenas dados de entrada.
 */

export interface WaiterWithLoad {
  staffId: string;
  staffName: string;
  occupiedTableCount: number;
}

export class WaiterAssignmentService {
  /**
   * Seleciona o waiter com menos mesas ocupadas.
   * Empates desfeitos por staffId (determinístico).
   * Retorna null se a lista estiver vazia.
   */
  static selectLeastBusyWaiter(waiters: WaiterWithLoad[]): WaiterWithLoad | null {
    if (waiters.length === 0) return null;

    const sorted = [...waiters].sort((a, b) => {
      if (a.occupiedTableCount !== b.occupiedTableCount) {
        return a.occupiedTableCount - b.occupiedTableCount;
      }
      return a.staffId.localeCompare(b.staffId);
    });

    return sorted[0];
  }
}
