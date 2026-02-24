/**
 * StartSessionUseCase - Caso de uso para iniciar uma sessão
 */

import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { ITableRepository } from '@/domain/repositories/ITableRepository';
import { Session, CreateSessionData } from '@/domain/entities/Session';
import { SessionService } from '@/domain/services/SessionService';
import { OrderingMode } from '@/domain/value-objects/OrderingMode';
import { AutoAssignWaiterUseCase } from './AutoAssignWaiterUseCase';

export interface StartSessionInput {
  tableId: string;
  isRodizio: boolean;
  numPeople: number;
  orderingMode?: OrderingMode;
}

export interface StartSessionResult {
  success: boolean;
  data?: Session;
  error?: string;
  code?: 'TABLE_NOT_FOUND' | 'TABLE_INACTIVE' | 'TABLE_OCCUPIED' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
}

export class StartSessionUseCase {
  constructor(
    private sessionRepository: ISessionRepository,
    private tableRepository: ITableRepository,
    private autoAssignWaiterUseCase?: AutoAssignWaiterUseCase,
  ) {}

  async execute(input: StartSessionInput): Promise<StartSessionResult> {
    try {
      // Validar dados de entrada
      const validation = SessionService.validateCreateData({
        numPeople: input.numPeople,
        isRodizio: input.isRodizio,
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          code: 'VALIDATION_ERROR',
        };
      }

      // Buscar mesa
      const table = await this.tableRepository.findById(input.tableId);
      if (!table) {
        return {
          success: false,
          error: 'Mesa não encontrada',
          code: 'TABLE_NOT_FOUND',
        };
      }

      // Se a mesa tem currentSessionId, verificar se a sessão ainda está ativa
      // Limpar dados stale de sessões antigas não fechadas corretamente
      if (table.currentSessionId) {
        const existingSession = await this.sessionRepository.findById(table.currentSessionId);
        const isStale = !existingSession || existingSession.status === 'closed' || existingSession.status === 'paid';
        if (isStale) {
          // Limpar dados stale — a sessão já não existe ou está fechada
          await this.tableRepository.update(input.tableId, {
            status: 'available',
            currentSessionId: null,
          });
          // Atualizar referência local
          table.currentSessionId = null;
          table.status = 'available';
        }
      }

      // Verificar se pode iniciar sessão
      const canStart = SessionService.canStartSession(table);
      if (!canStart.isValid) {
        const code = table.status === 'occupied' ? 'TABLE_OCCUPIED' : 'TABLE_INACTIVE';
        return {
          success: false,
          error: canStart.error,
          code,
        };
      }

      // Criar sessão
      const sessionData: CreateSessionData = {
        tableId: input.tableId,
        isRodizio: input.isRodizio,
        numPeople: input.numPeople,
        orderingMode: input.orderingMode, // Defaults to 'client' in repository if not provided
      };

      const session = await this.sessionRepository.create(sessionData);

      // Atualizar mesa como ocupada
      await this.tableRepository.update(input.tableId, {
        status: 'occupied',
        currentSessionId: session.id,
      });

      // Auto-atribuir waiter (se configurado)
      if (this.autoAssignWaiterUseCase) {
        await this.autoAssignWaiterUseCase.execute({
          tableId: input.tableId,
          location: table.location,
        });
      }

      return {
        success: true,
        data: session,
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
