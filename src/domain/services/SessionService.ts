/**
 * SessionService - Serviço de domínio para sessões
 * Contém a lógica de negócio pura relacionada a sessões de mesa
 */

import { Session } from '../entities/Session';
import { Table } from '../entities/Table';
import { Order } from '../entities/Order';
import { SessionStatus, canSessionTransitionTo, isSessionActive, isSessionClosed } from '../value-objects/SessionStatus';
import { OrderService } from './OrderService';
import { ValidationResult } from './types';

/**
 * Serviço de domínio para sessões
 */
export class SessionService {
  /**
   * Verifica se é possível iniciar uma sessão numa mesa
   */
  static canStartSession(table: Table): ValidationResult {
    if (!table.isActive) {
      return { isValid: false, error: 'Mesa está inativa' };
    }

    if (table.status === 'occupied') {
      return { isValid: false, error: 'Mesa já está ocupada' };
    }

    if (table.currentSessionId) {
      return { isValid: false, error: 'Mesa já tem uma sessão ativa' };
    }

    return { isValid: true };
  }

  /**
   * Verifica se é possível fechar uma sessão
   */
  static canCloseSession(session: Session, orders: Order[]): ValidationResult {
    if (isSessionClosed(session.status)) {
      return { isValid: false, error: 'Sessão já está fechada' };
    }

    const activeOrders = orders.filter(
      (o) => o.sessionId === session.id && OrderService.isActive(o)
    );

    if (activeOrders.length > 0) {
      return {
        isValid: false,
        error: `Existem ${activeOrders.length} pedido(s) pendente(s)`,
      };
    }

    return { isValid: true };
  }

  /**
   * Verifica se uma sessão pode mudar de status
   */
  static canChangeStatus(session: Session, newStatus: SessionStatus): ValidationResult {
    if (session.status === newStatus) {
      return { isValid: false, error: 'Sessão já está neste estado' };
    }

    if (!canSessionTransitionTo(session.status, newStatus)) {
      return {
        isValid: false,
        error: `Não é possível mudar de '${session.status}' para '${newStatus}'`,
      };
    }

    return { isValid: true };
  }

  /**
   * Verifica se a sessão está ativa
   */
  static isActive(session: Session): boolean {
    return isSessionActive(session.status);
  }

  /**
   * Verifica se a sessão está fechada
   */
  static isClosed(session: Session): boolean {
    return isSessionClosed(session.status);
  }

  /**
   * Calcula a duração de uma sessão em minutos
   */
  static getDuration(session: Session, now: Date = new Date()): number {
    const endTime = session.closedAt || now;
    return Math.floor((endTime.getTime() - session.startedAt.getTime()) / 60000);
  }

  /**
   * Formata a duração da sessão
   */
  static formatDuration(session: Session, now: Date = new Date()): string {
    const minutes = this.getDuration(session, now);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }

  /**
   * Calcula o total de uma sessão baseado nos pedidos
   */
  static calculateTotal(orders: Order[]): number {
    return OrderService.calculateTotal(orders);
  }

  /**
   * Calcula o valor por pessoa
   */
  static calculatePerPerson(session: Session, total: number): number {
    if (session.numPeople <= 0) return total;
    return Math.ceil(total / session.numPeople);
  }

  /**
   * Valida dados para criar uma sessão
   */
  static validateCreateData(data: {
    numPeople?: number;
    isRodizio?: boolean;
  }): ValidationResult {
    if (!data.numPeople || data.numPeople < 1) {
      return { isValid: false, error: 'Número de pessoas deve ser pelo menos 1' };
    }

    if (data.numPeople > 50) {
      return { isValid: false, error: 'Número máximo de pessoas é 50' };
    }

    return { isValid: true };
  }

  /**
   * Verifica se um cliente pode fazer pedidos nesta sessão
   */
  static canClientOrder(session: Session): ValidationResult {
    if (!isSessionActive(session.status)) {
      return { isValid: false, error: 'Sessão não está ativa' };
    }

    if (session.orderingMode === 'waiter_only') {
      return {
        isValid: false,
        error: 'Apenas o empregado pode fazer pedidos nesta sessão',
      };
    }

    return { isValid: true };
  }

  /**
   * Verifica se pode alterar o modo de pedidos de uma sessão
   */
  static canChangeOrderingMode(
    session: Session,
    newMode: 'client' | 'waiter_only'
  ): ValidationResult {
    if (isSessionClosed(session.status)) {
      return { isValid: false, error: 'Não pode alterar sessão fechada' };
    }

    if (session.orderingMode === newMode) {
      return { isValid: false, error: 'Já está neste modo' };
    }

    return { isValid: true };
  }

  /**
   * Obtém estatísticas de uma sessão
   */
  static getStats(session: Session, orders: Order[]): {
    total: number;
    perPerson: number;
    orderCount: number;
    pendingCount: number;
    duration: string;
  } {
    const sessionOrders = orders.filter((o) => o.sessionId === session.id);
    const total = this.calculateTotal(sessionOrders);
    const orderCounts = OrderService.countByStatus(sessionOrders);

    return {
      total,
      perPerson: this.calculatePerPerson(session, total),
      orderCount: sessionOrders.length,
      pendingCount: orderCounts.pending + orderCounts.preparing,
      duration: this.formatDuration(session),
    };
  }
}
