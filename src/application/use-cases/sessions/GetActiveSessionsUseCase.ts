/**
 * GetActiveSessionsUseCase - Caso de uso para obter sessões ativas
 */

import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { SessionWithTable } from '@/domain/entities/Session';
import { SessionService } from '@/domain/services/SessionService';
import { Location } from '@/types/database';

export interface GetActiveSessionsInput {
  location?: Location;
}

export interface SessionWithStats extends SessionWithTable {
  duration: string;
  durationMinutes: number;
}

export interface GetActiveSessionsResult {
  success: boolean;
  data?: {
    sessions: SessionWithStats[];
    counts: {
      active: number;
      pendingPayment: number;
      total: number;
    };
  };
  error?: string;
}

export class GetActiveSessionsUseCase {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute(input: GetActiveSessionsInput = {}): Promise<GetActiveSessionsResult> {
    try {
      const sessions = await this.sessionRepository.findActive(input.location);

      // Adicionar estatísticas a cada sessão
      const sessionsWithStats: SessionWithStats[] = sessions.map((session) => ({
        ...session,
        duration: SessionService.formatDuration(session),
        durationMinutes: SessionService.getDuration(session),
      }));

      // Contar por status
      const counts = {
        active: sessions.filter((s) => s.status === 'active').length,
        pendingPayment: sessions.filter((s) => s.status === 'pending_payment').length,
        total: sessions.length,
      };

      return {
        success: true,
        data: {
          sessions: sessionsWithStats,
          counts,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
