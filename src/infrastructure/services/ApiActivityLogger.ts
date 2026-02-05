/**
 * ApiActivityLogger - Implementação do IActivityLogger via API
 */

import { IActivityLogger, ActivityLogEntry } from '@/application/ports/IActivityLogger';

/**
 * Implementação do logger de atividades que utiliza a API
 */
export class ApiActivityLogger implements IActivityLogger {
  private readonly apiEndpoint: string;

  constructor(apiEndpoint: string = '/api/activity/log') {
    this.apiEndpoint = apiEndpoint;
  }

  async log(entry: ActivityLogEntry): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          details: entry.details,
        }),
      });

      if (!response.ok) {
        console.error('[ActivityLogger] Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.error('[ActivityLogger] Error logging activity:', error);
    }
  }
}
