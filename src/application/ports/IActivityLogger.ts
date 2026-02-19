/**
 * IActivityLogger - Interface para logging de atividades
 */

/**
 * Entrada de log de atividade
 */
export interface ActivityLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

/**
 * Interface do serviço de logging de atividades
 */
export interface IActivityLogger {
  /**
   * Registar uma atividade
   */
  log(entry: ActivityLogEntry): Promise<void>;
}
