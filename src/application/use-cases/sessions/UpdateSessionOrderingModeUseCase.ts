/**
 * UpdateSessionOrderingModeUseCase - Caso de uso para alterar o modo de pedidos
 *
 * Permite que staff (admin/waiter) alterne entre:
 * - 'client': Clientes podem fazer pedidos normalmente
 * - 'waiter_only': Apenas waiter pode fazer pedidos (modo bloqueio)
 */

import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { IActivityLogger } from '@/application/ports/IActivityLogger';
import { Session } from '@/domain/entities/Session';
import { OrderingMode } from '@/domain/value-objects/OrderingMode';
import { SessionService } from '@/domain/services/SessionService';

export interface UpdateOrderingModeInput {
  sessionId: string;
  orderingMode: OrderingMode;
  staffId: string; // For audit logging
}

export interface UpdateOrderingModeResult {
  success: boolean;
  data?: Session;
  error?: string;
  code?: 'SESSION_NOT_FOUND' | 'SESSION_CLOSED' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
}

export class UpdateSessionOrderingModeUseCase {
  constructor(
    private sessionRepository: ISessionRepository,
    private activityLogger?: IActivityLogger
  ) {}

  async execute(input: UpdateOrderingModeInput): Promise<UpdateOrderingModeResult> {
    try {
      // 1. Buscar sessão
      const session = await this.sessionRepository.findById(input.sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Sessão não encontrada',
          code: 'SESSION_NOT_FOUND',
        };
      }

      // 2. Validar com domain service
      const validation = SessionService.canChangeOrderingMode(
        session,
        input.orderingMode
      );
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          code: SessionService.isClosed(session) ? 'SESSION_CLOSED' : 'VALIDATION_ERROR',
        };
      }

      // 3. Atualizar ordering mode
      const updatedSession = await this.sessionRepository.update(input.sessionId, {
        orderingMode: input.orderingMode,
      });

      // 4. Log activity (optional)
      if (this.activityLogger) {
        try {
          await this.activityLogger.log({
            action: 'session_ordering_mode_changed',
            entityType: 'session',
            entityId: input.sessionId,
            userId: input.staffId,
            details: {
              oldMode: session.orderingMode,
              newMode: input.orderingMode,
            },
          });
        } catch (logError) {
          // Não falhar o use case se log falhar
          console.error('Failed to log activity:', logError);
        }
      }

      return {
        success: true,
        data: updatedSession,
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
