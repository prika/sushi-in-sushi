/**
 * SupabaseRealtimeHandler - Handler base para subscrições Supabase real-time
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  IRealtimeSubscription,
  RealtimeEvent,
  RealtimeCallback,
  RealtimeSubscriptionOptions,
  RealtimeEventType,
} from '@/application/ports/IRealtimeSubscription';

/**
 * Handler base para subscrições Supabase
 */
export class SupabaseRealtimeHandler<T> implements IRealtimeSubscription<T> {
  protected supabase: SupabaseClient;
  protected channel: RealtimeChannel | null = null;
  protected callback: RealtimeCallback<T> | null = null;
  protected options: RealtimeSubscriptionOptions;
  protected subscribed = false;

  constructor(options: RealtimeSubscriptionOptions, supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient();
    this.options = options;
  }

  subscribe(callback: RealtimeCallback<T>): void {
    if (this.subscribed) {
      this.unsubscribe();
    }

    this.callback = callback;
    this.channel = this.supabase.channel(this.options.channelName);

    const events = this.options.events || ['INSERT', 'UPDATE', 'DELETE'];

    events.forEach((eventType) => {
      const channelConfig: {
        event: 'INSERT' | 'UPDATE' | 'DELETE';
        schema: string;
        table: string;
        filter?: string;
      } = {
        event: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        schema: 'public',
        table: this.options.table,
      };

      if (this.options.filter) {
        channelConfig.filter = this.options.filter;
      }

      this.channel!.on(
        'postgres_changes',
        channelConfig,
        (payload) => {
          if (this.callback) {
            const event: RealtimeEvent<T> = {
              type: payload.eventType as RealtimeEventType,
              old: payload.old as T | undefined,
              new: payload.new as T | undefined,
              timestamp: new Date(),
            };
            this.callback(event);
          }
        }
      );
    });

    this.channel.subscribe((status) => {
      this.subscribed = status === 'SUBSCRIBED';
    });
  }

  unsubscribe(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.callback = null;
    this.subscribed = false;
  }

  isSubscribed(): boolean {
    return this.subscribed;
  }
}
