import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
