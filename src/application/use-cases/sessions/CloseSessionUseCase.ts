/**
 * CloseSessionUseCase - Caso de uso para fechar uma sessão
 */

import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { IOrderRepository } from '@/domain/repositories/IOrderRepository';
import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { Session } from '@/domain/entities/Session';
import { SessionService } from '@/domain/services/SessionService';

export interface CloseSessionInput {
  sessionId: string;
}

export interface CloseSessionResult {
  success: boolean;
  data?: Session;
  error?: string;
  code?: 'SESSION_NOT_FOUND' | 'ALREADY_CLOSED' | 'PENDING_ORDERS' | 'UNKNOWN_ERROR';
}

export class CloseSessionUseCase {
  constructor(
    private sessionRepository: ISessionRepository,
    private orderRepository: IOrderRepository,
    private tableRepository: ITableRepository
  ) {}

  async execute(input: CloseSessionInput): Promise<CloseSessionResult> {
    try {
      // Buscar sessão
      const session = await this.sessionRepository.findById(input.sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Sessão não encontrada',
          code: 'SESSION_NOT_FOUND',
        };
      }

      // Verificar se já está fechada
      if (SessionService.isClosed(session)) {
        return {
          success: false,
          error: 'Sessão já está fechada',
          code: 'ALREADY_CLOSED',
        };
      }

      // Buscar pedidos da sessão
      const orders = await this.orderRepository.findAll({ sessionId: input.sessionId });

      // Verificar se pode fechar
      const canClose = SessionService.canCloseSession(session, orders);
      if (!canClose.isValid) {
        return {
          success: false,
          error: canClose.error,
          code: 'PENDING_ORDERS',
        };
      }

      // Calcular total final
      const total = await this.sessionRepository.calculateTotal(input.sessionId);

      // Fechar sessão
      const closedSession = await this.sessionRepository.update(input.sessionId, {
        status: 'closed',
        totalAmount: total,
        closedAt: new Date(),
      });

      // Liberar mesa
      await this.tableRepository.update(session.tableId, {
        status: 'available',
        currentSessionId: null,
      });

      return {
        success: true,
        data: closedSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 'UNKNOWN_ERROR',
      };
    }
  }
}
