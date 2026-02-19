/**
 * RequestBillUseCase - Caso de uso para pedir a conta
 */

import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { Session } from '@/domain/entities/Session';
import { SessionService } from '@/domain/services/SessionService';

export interface RequestBillInput {
  sessionId: string;
}

export interface RequestBillResult {
  success: boolean;
  data?: Session & { total: number };
  error?: string;
  code?: 'SESSION_NOT_FOUND' | 'ALREADY_CLOSED' | 'INVALID_TRANSITION' | 'UNKNOWN_ERROR';
}

export class RequestBillUseCase {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute(input: RequestBillInput): Promise<RequestBillResult> {
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

      // Verificar se pode mudar para pending_payment
      const canChange = SessionService.canChangeStatus(session, 'pending_payment');
      if (!canChange.isValid) {
        return {
          success: false,
          error: canChange.error,
          code: 'INVALID_TRANSITION',
        };
      }

      // Calcular total
      const total = await this.sessionRepository.calculateTotal(input.sessionId);

      // Atualizar para pending_payment
      const updatedSession = await this.sessionRepository.update(input.sessionId, {
        status: 'pending_payment',
        totalAmount: total,
      });

      return {
        success: true,
        data: {
          ...updatedSession,
          total,
        },
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
