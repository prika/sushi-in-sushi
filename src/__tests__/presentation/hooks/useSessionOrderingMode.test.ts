/**
 * useSessionOrderingMode Hook Tests
 * Tests for session ordering mode management hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { OrderingMode } from '@/domain/value-objects/OrderingMode';
import type { Session } from '@/domain/entities/Session';

// Mock dependencies before imports
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/presentation/contexts/DependencyContext', () => ({
  useDependencies: vi.fn(),
}));

import { useSessionOrderingMode } from '@/presentation/hooks/useSessionOrderingMode';
import { useAuth } from '@/contexts/AuthContext';
import { useDependencies } from '@/presentation/contexts/DependencyContext';

// Mock use case
const mockExecute = vi.fn();
const mockUpdateOrderingModeUseCase = {
  execute: mockExecute,
};

const mockAuthUser = {
  id: 'staff-1',
  role: 'waiter',
};

// Helper to create mock session
const createMockSession = (orderingMode: OrderingMode = 'client'): Session => ({
  id: 'session-1',
  tableId: 'table-1',
  status: 'active',
  isRodizio: false,
  numPeople: 4,
  totalAmount: 0,
  orderingMode,
  startedAt: new Date(),
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('useSessionOrderingMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser,
      isLoading: false,
    } as any);

    vi.mocked(useDependencies).mockReturnValue({
      updateSessionOrderingMode: mockUpdateOrderingModeUseCase,
    } as any);
  });

  describe('initialization', () => {
    it('deve inicializar com modo null se não fornecer initialMode', () => {
      const { result } = renderHook(() => useSessionOrderingMode('session-1'));

      expect(result.current.orderingMode).toBeNull();
      expect(result.current.canClientOrder).toBe(false);
      expect(result.current.isUpdating).toBe(false);
    });

    it('deve inicializar com initialMode fornecido', () => {
      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'client')
      );

      expect(result.current.orderingMode).toBe('client');
      expect(result.current.canClientOrder).toBe(true);
      expect(result.current.isUpdating).toBe(false);
    });

    it('deve calcular canClientOrder corretamente', () => {
      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'waiter_only')
      );

      expect(result.current.orderingMode).toBe('waiter_only');
      expect(result.current.canClientOrder).toBe(false);
    });
  });

  describe('updateMode', () => {
    it('deve atualizar modo de client para waiter_only com sucesso', async () => {
      const mockSession = createMockSession('waiter_only');
      mockExecute.mockResolvedValue({
        success: true,
        data: mockSession,
      });

      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'client')
      );

      expect(result.current.orderingMode).toBe('client');

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMode('waiter_only');
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sessionId: 'session-1',
        orderingMode: 'waiter_only',
        staffId: 'staff-1',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.error).toBeUndefined();

      await waitFor(() => {
        expect(result.current.orderingMode).toBe('waiter_only');
        expect(result.current.canClientOrder).toBe(false);
      });
    });

    it('deve atualizar modo de waiter_only para client com sucesso', async () => {
      const mockSession = createMockSession('client');
      mockExecute.mockResolvedValue({
        success: true,
        data: mockSession,
      });

      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'waiter_only')
      );

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMode('client');
      });

      expect(updateResult.success).toBe(true);

      await waitFor(() => {
        expect(result.current.orderingMode).toBe('client');
        expect(result.current.canClientOrder).toBe(true);
      });
    });

    it('deve retornar erro se sessionId é null', async () => {
      const { result } = renderHook(() =>
        useSessionOrderingMode(null, 'client')
      );

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMode('waiter_only');
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Nenhuma sessão selecionada');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('deve retornar erro se user não está autenticado', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'client')
      );

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMode('waiter_only');
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Não autenticado');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('deve retornar erro do use case se atualização falhar', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        error: 'Sessão não encontrada',
        code: 'SESSION_NOT_FOUND',
      });

      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'client')
      );

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMode('waiter_only');
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Sessão não encontrada');
      expect(result.current.orderingMode).toBe('client');
    });

    it('deve tratar exceções do use case', async () => {
      mockExecute.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'client')
      );

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateMode('waiter_only');
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Network error');
      expect(result.current.orderingMode).toBe('client');
    });
  });

  describe('múltiplas atualizações', () => {
    it('deve permitir múltiplas atualizações consecutivas', async () => {
      const mockSession1 = createMockSession('waiter_only');
      const mockSession2 = createMockSession('client');

      mockExecute
        .mockResolvedValueOnce({ success: true, data: mockSession1 })
        .mockResolvedValueOnce({ success: true, data: mockSession2 });

      const { result } = renderHook(() =>
        useSessionOrderingMode('session-1', 'client')
      );

      await act(async () => {
        await result.current.updateMode('waiter_only');
      });
      await waitFor(() => {
        expect(result.current.orderingMode).toBe('waiter_only');
      });

      await act(async () => {
        await result.current.updateMode('client');
      });
      await waitFor(() => {
        expect(result.current.orderingMode).toBe('client');
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('deve funcionar com sessionId vazio', async () => {
      const { result } = renderHook(() =>
        useSessionOrderingMode('', 'client')
      );

      expect(result.current.orderingMode).toBe('client');

      await act(async () => {
        await result.current.updateMode('waiter_only');
      });

      // Não deve lançar erro
    });
  });
});
