/**
 * Infrastructure Realtime - Exportações centralizadas
 */

// Platform-agnostic RealtimeStore (useSyncExternalStore compatible)
export { RealtimeStore } from './RealtimeStore';
export type { ChannelConfig, PostgresChangeConfig, BroadcastConfig } from './RealtimeStore';
export * from './events';
export * from './channels';
