/**
 * IRealtimeSubscription - Interface para subscrições em tempo real
 * Define o contrato para handlers de eventos em tempo real
 */

/**
 * Tipos de eventos real-time
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Evento real-time genérico
 */
export interface RealtimeEvent<T> {
  type: RealtimeEventType;
  old?: T;
  new?: T;
  timestamp: Date;
}

/**
 * Callback para eventos real-time
 */
export type RealtimeCallback<T> = (event: RealtimeEvent<T>) => void;

/**
 * Interface para subscrições real-time
 */
export interface IRealtimeSubscription<T> {
  /**
   * Subscrever a eventos
   */
  subscribe(callback: RealtimeCallback<T>): void;

  /**
   * Cancelar subscrição
   */
  unsubscribe(): void;

  /**
   * Verificar se está subscrito
   */
  isSubscribed(): boolean;
}

/**
 * Opções para criar uma subscrição
 */
export interface RealtimeSubscriptionOptions {
  /**
   * Canal único para esta subscrição
   */
  channelName: string;

  /**
   * Tabela a monitorar
   */
  table: string;

  /**
   * Filtro opcional (ex: "session_id=eq.xxx")
   */
  filter?: string;

  /**
   * Eventos a monitorar (default: todos)
   */
  events?: RealtimeEventType[];
}
