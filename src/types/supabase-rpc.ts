/**
 * Custom RPC function types for Supabase
 *
 * These types extend the auto-generated Supabase types to provide
 * type safety for custom RPC functions that aren't in the generated types.
 *
 * Usage:
 *   import { TypedSupabaseClient } from '@/types/supabase-rpc';
 *   const supabase: TypedSupabaseClient = await createClient();
 *   const result = await supabase.rpc('get_current_staff');
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RoleName, Location } from "./database";

// =============================================================================
// RPC FUNCTION ARGUMENT TYPES
// =============================================================================

export interface CheckRateLimitArgs {
  p_identifier: string;
  p_identifier_type: "ip" | "email";
  p_max_attempts: number;
  p_window_minutes: number;
  p_block_minutes: number;
}

export interface ResetRateLimitArgs {
  p_identifier: string;
  p_identifier_type: "ip" | "email";
}

export interface LogAuthEventArgs {
  p_event_type: string;
  p_staff_id: string | null;
  p_auth_user_id: string | null;
  p_email: string | null;
  p_ip_address: string | null;
  p_user_agent: string | null;
  p_metadata: Record<string, unknown>;
  p_success: boolean;
  p_error_message: string | null;
}

export interface UpdateStaffLoginInfoArgs {
  p_staff_id: string;
  p_ip_address: string | null;
  p_success: boolean;
}

// =============================================================================
// RPC FUNCTION RETURN TYPES
// =============================================================================

export interface RateLimitCheckResult {
  allowed: boolean;
  attempts_remaining: number;
  blocked_until: string | null;
  current_attempts: number;
}

export interface CurrentStaffResult {
  id: string;
  email: string;
  name: string;
  location: Location | null;
  is_active: boolean;
  role_id: number;
}

export interface AuthAuditLogEntry {
  id: string;
  event_type: string;
  staff_id: string | null;
  auth_user_id: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AuthSessionConfigRow {
  id: number;
  role_name: RoleName;
  session_timeout_minutes: number;
  inactivity_timeout_minutes: number;
  require_mfa: boolean;
  max_concurrent_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface StaffLockedInfo {
  locked_until: string | null;
}

// =============================================================================
// CUSTOM RPC FUNCTIONS INTERFACE
// =============================================================================

/**
 * Custom RPC functions that may not be in the auto-generated types.
 * These are typically created via migrations and may not exist in all environments.
 */
export interface CustomRpcFunctions {
  // Staff authentication
  get_current_staff: {
    Args: Record<string, never>;
    Returns: CurrentStaffResult[];
  };
  get_current_staff_role: {
    Args: Record<string, never>;
    Returns: RoleName;
  };

  // Rate limiting
  check_rate_limit: {
    Args: CheckRateLimitArgs;
    Returns: RateLimitCheckResult[];
  };
  reset_rate_limit: {
    Args: ResetRateLimitArgs;
    Returns: void;
  };

  // Audit logging
  log_auth_event: {
    Args: LogAuthEventArgs;
    Returns: string;
  };

  // Staff login info
  update_staff_login_info: {
    Args: UpdateStaffLoginInfoArgs;
    Returns: boolean;
  };
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Extended Database type that includes custom RPC functions.
 * Use this when you need to call custom RPC functions with type safety.
 */
export interface ExtendedDatabase extends Database {
  public: Database["public"] & {
    Functions: Database["public"]["Functions"] & CustomRpcFunctions;
  };
}

/**
 * Typed Supabase client with custom RPC functions.
 * This provides full type safety for RPC calls.
 */
export type TypedSupabaseClient = SupabaseClient<ExtendedDatabase>;

/**
 * Helper type to extract the return type of an RPC function.
 */
export type RpcReturnType<T extends keyof CustomRpcFunctions> =
  CustomRpcFunctions[T]["Returns"];

/**
 * Helper type to extract the arguments type of an RPC function.
 */
export type RpcArgs<T extends keyof CustomRpcFunctions> =
  CustomRpcFunctions[T]["Args"];
