import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

// Singleton instance for browser client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates a Supabase browser client (singleton)
 * Returns the same instance across all calls to prevent
 * issues with real-time subscriptions and state management
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        auth: {
          flowType: "pkce",
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            // Skip Navigator LockManager to avoid timeout issues
            return fn();
          },
        } as any,
      }
    );
  }
  return browserClient;
}
