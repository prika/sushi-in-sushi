import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSessionOrderingModeUseCase } from '@/application/use-cases/sessions/UpdateSessionOrderingModeUseCase';
import type { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import type { IActivityLogger } from '@/application/ports/IActivityLogger';
import { Session } from '@/domain/entities/Session';

// Helper para criar uma sessão de teste
function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    tableId: 'table-1',
    status: 'active',
    isRodizio: false,
    numPeople: 4,
    totalAmount: 0,
    orderingMode: 'client',
    startedAt: new Date('2024-01-01T12:00:00Z'),
    closedAt: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('UpdateSessionOrderingModeUseCase', () => {
  let mockSessionRepository: ISessionRepository;
  let mockActivityLogger: IActivityLogger;
  let useCase: UpdateSessionOrderingModeUseCase;

  beforeEach(() => {
    mockSessionRepository = {
      findById: vi.fn(),
      findByIdWithTable: vi.fn(),
      findByIdWithOrders: vi.fn(),
      findActiveByTable: vi.fn(),
      findAll: vi.fn(),
      findActive: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      close: vi.fn(),
      countByStatus: vi.fn(),
      calculateTotal: vi.fn(),
    };

    mockActivityLogger = {
      log: vi.fn(),
    };

    useCase = new UpdateSessionOrderingModeUseCase(
      mockSessionRepository,
      mockActivityLogger
    );
  });

  describe('execute', () => {
    it('deve atualizar ordering mode de client para waiter_only com sucesso', async () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'client',
      });

      const updatedSession = { ...session, orderingMode: 'waiter_only' as const };

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockSessionRepository.update).mockResolvedValue(updatedSession);

      const result = await useCase.execute({
        sessionId: 'session-1',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.orderingMode).toBe('waiter_only');
      expect(mockSessionRepository.update).toHaveBeenCalledWith('session-1', {
        orderingMode: 'waiter_only',
      });
    });

    it('deve atualizar ordering mode de waiter_only para client com sucesso', async () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'waiter_only',
      });

      const updatedSession = { ...session, orderingMode: 'client' as const };

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockSessionRepository.update).mockResolvedValue(updatedSession);

      const result = await useCase.execute({
        sessionId: 'session-1',
        orderingMode: 'client',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.orderingMode).toBe('client');
    });

    it('deve registar atividade quando atualização é bem sucedida', async () => {
      const session = createTestSession({
        orderingMode: 'client',
      });

      const updatedSession = { ...session, orderingMode: 'waiter_only' as const };

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockSessionRepository.update).mockResolvedValue(updatedSession);

      await useCase.execute({
        sessionId: 'session-1',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        userId: 'staff-1',
        action: 'session_ordering_mode_changed',
        entityType: 'session',
        entityId: 'session-1',
        details: {
          oldMode: 'client',
          newMode: 'waiter_only',
        },
      });
    });

    it('deve retornar erro quando sessão não é encontrada', async () => {
      vi.mocked(mockSessionRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({
        sessionId: 'invalid-session',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sessão não encontrada');
      expect(result.code).toBe('SESSION_NOT_FOUND');
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando sessão está fechada', async () => {
      const session = createTestSession({
        status: 'closed',
        orderingMode: 'client',
      });

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);

      const result = await useCase.execute({
        sessionId: 'session-1',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Não pode alterar sessão fechada');
      expect(result.code).toBe('SESSION_CLOSED');
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando já está no modo pretendido', async () => {
      const session = createTestSession({
        status: 'active',
        orderingMode: 'client',
      });

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);

      const result = await useCase.execute({
        sessionId: 'session-1',
        orderingMode: 'client',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Já está neste modo');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });

    it('deve tratar erros do repositório', async () => {
      const session = createTestSession({
        orderingMode: 'client',
      });

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockSessionRepository.update).mockRejectedValue(
        new Error('Database error')
      );

      const result = await useCase.execute({
        sessionId: 'session-1',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('deve funcionar sem activity logger (opcional)', async () => {
      const session = createTestSession({
        orderingMode: 'client',
      });

      const updatedSession = { ...session, orderingMode: 'waiter_only' as const };

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
      vi.mocked(mockSessionRepository.update).mockResolvedValue(updatedSession);

      const useCaseWithoutLogger = new UpdateSessionOrderingModeUseCase(
        mockSessionRepository
      );

      const result = await useCaseWithoutLogger.execute({
        sessionId: 'session-1',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.orderingMode).toBe('waiter_only');
    });
  });
});
