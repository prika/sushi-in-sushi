'use client';

/**
 * useActivityLog - Hook para logging de atividades
 *
 * Este hook fornece uma interface React-friendly para o serviço
 * de logging de atividades.
 */

import { useCallback } from 'react';
import { useDependencies } from '../contexts/DependencyContext';

/**
 * Resultado do hook
 */
export interface UseActivityLogResult {
  /**
   * Regista uma atividade
   */
  logActivity: (
    action: string,
    entityType?: string,
    entityId?: string,
    details?: Record<string, unknown>
  ) => Promise<void>;
}

/**
 * Hook para logging de atividades
 */
export function useActivityLog(): UseActivityLogResult {
  const { activityLogger } = useDependencies();

  const logActivity = useCallback(
    async (
      action: string,
      entityType?: string,
      entityId?: string,
      details?: Record<string, unknown>
    ) => {
      await activityLogger.log({
        action,
        entityType: entityType || 'unknown',
        entityId,
        details,
      });
    },
    [activityLogger]
  );

  return { logActivity };
}
