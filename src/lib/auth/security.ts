/**
 * Auth Security Module
 *
 * Provides security features for authentication:
 * - Rate limiting
 * - Audit logging
 * - MFA support
 * - Session management
 *
 * Note: Some features require migrations 013 and 014 to be applied.
 * Functions gracefully handle missing tables/functions.
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  RateLimitCheckResult,
  AuthAuditLogEntry,
  AuthSessionConfigRow,
  StaffLockedInfo,
} from "@/types/supabase-rpc";

// =============================================
// TYPES
// =============================================

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_change"
  | "mfa_enrolled"
  | "mfa_disabled"
  | "mfa_verified"
  | "mfa_failed"
  | "session_refresh"
  | "account_locked"
  | "account_unlocked"
  | "new_ip_login";

export interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  blockedUntil: Date | null;
  currentAttempts: number;
}

export interface AuditLogEntry {
  eventType: AuthEventType;
  staffId?: string;
  authUserId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

export interface SessionConfig {
  sessionTimeoutMinutes: number;
  inactivityTimeoutMinutes: number;
  requireMfa: boolean;
  maxConcurrentSessions: number;
}

export interface MfaEnrollmentResult {
  success: boolean;
  qrCode?: string;
  secret?: string;
  error?: string;
}

// Default session config when table doesn't exist
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionTimeoutMinutes: 480,
  inactivityTimeoutMinutes: 60,
  requireMfa: false,
  maxConcurrentSessions: 3,
};

// =============================================
// RATE LIMITING
// =============================================

// IPs that bypass rate limiting (localhost for testing)
const RATE_LIMIT_BYPASS_IPS = [
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "localhost",
];

/**
 * Check if a login attempt is allowed based on rate limiting.
 * Requires migration 013 to be applied.
 * Falls back to allowing all requests if rate limiting is not available.
 */
export async function checkRateLimit(
  identifier: string,
  identifierType: "ip" | "email" = "ip",
  options: {
    maxAttempts?: number;
    windowMinutes?: number;
    blockMinutes?: number;
  } = {}
): Promise<RateLimitResult> {
  const {
    maxAttempts = 5,
    windowMinutes = 15,
    blockMinutes = 30,
  } = options;

  // Bypass rate limiting for localhost (testing/development)
  if (identifierType === "ip" && RATE_LIMIT_BYPASS_IPS.includes(identifier)) {
    return {
      allowed: true,
      attemptsRemaining: maxAttempts,
      blockedUntil: null,
      currentAttempts: 0,
    };
  }

  try {
    const supabase = await createClient() as any;

    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
      p_block_minutes: blockMinutes,
    });

    if (error) {
      // Function doesn't exist or error - fail open
      console.warn("Rate limit check unavailable:", error.message);
      return {
        allowed: true,
        attemptsRemaining: maxAttempts,
        blockedUntil: null,
        currentAttempts: 0,
      };
    }

    const result = (data as RateLimitCheckResult[] | null)?.[0];
    return {
      allowed: result?.allowed ?? true,
      attemptsRemaining: result?.attempts_remaining ?? maxAttempts,
      blockedUntil: result?.blocked_until ? new Date(result.blocked_until) : null,
      currentAttempts: result?.current_attempts ?? 0,
    };
  } catch {
    // Fail open - allow the request
    return {
      allowed: true,
      attemptsRemaining: maxAttempts,
      blockedUntil: null,
      currentAttempts: 0,
    };
  }
}

/**
 * Reset rate limit for an identifier (call after successful login)
 */
export async function resetRateLimit(
  identifier: string,
  identifierType: "ip" | "email" = "ip"
): Promise<void> {
  try {
    const supabase = await createClient() as any;
    await supabase.rpc("reset_rate_limit", {
      p_identifier: identifier,
      p_identifier_type: identifierType,
    });
  } catch {
    // Ignore errors - rate limit reset is not critical
  }
}

// =============================================
// AUDIT LOGGING
// =============================================

/**
 * Log an authentication event.
 * Requires migration 013 to be applied.
 * Silently fails if audit logging is not available.
 */
export async function logAuthEvent(entry: AuditLogEntry): Promise<string | null> {
  try {
    const supabase = await createClient() as any;

    const { data, error } = await supabase.rpc("log_auth_event", {
      p_event_type: entry.eventType,
      p_staff_id: entry.staffId ?? null,
      p_auth_user_id: entry.authUserId ?? null,
      p_email: entry.email ?? null,
      p_ip_address: entry.ipAddress ?? null,
      p_user_agent: entry.userAgent ?? null,
      p_metadata: entry.metadata ?? {},
      p_success: entry.success ?? true,
      p_error_message: entry.errorMessage ?? null,
    });

    if (error) {
      console.warn("Audit log unavailable:", error.message);
      return null;
    }

    return data as string;
  } catch {
    return null;
  }
}

/**
 * Get recent auth events for a staff member
 */
export async function getAuthEventsForStaff(
  staffId: string,
  limit: number = 50
): Promise<AuthAuditLogEntry[]> {
  try {
    const supabase = await createClient();

    // auth_audit_log table may not exist (requires migration 013)
    const { data, error } = await supabase
      .from("auth_audit_log" as "activity_log") // Type workaround for optional table
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data as unknown as AuthAuditLogEntry[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Get failed login attempts for an email
 */
export async function getFailedLoginAttempts(
  email: string,
  sinceMinutes: number = 60
): Promise<number> {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    // auth_audit_log table may not exist (requires migration 013)
    const { count, error } = await supabase
      .from("auth_audit_log" as "activity_log") // Type workaround for optional table
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .eq("event_type", "login_failed")
      .gte("created_at", since);

    if (error) {
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

// =============================================
// STAFF LOGIN INFO
// =============================================

/**
 * Update staff login information and check for new IP.
 * Requires migration 013 to be applied.
 */
export async function updateStaffLoginInfo(
  staffId: string,
  ipAddress: string | null,
  success: boolean = true
): Promise<{ isNewIp: boolean }> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any).rpc("update_staff_login_info", {
      p_staff_id: staffId,
      p_ip_address: ipAddress,
      p_success: success,
    });

    if (error) {
      return { isNewIp: false };
    }

    return { isNewIp: data ?? false };
  } catch {
    return { isNewIp: false };
  }
}

/**
 * Check if staff account is locked.
 * Requires migration 013 to be applied.
 */
export async function isAccountLocked(staffId: string): Promise<{
  locked: boolean;
  lockedUntil: Date | null;
}> {
  try {
    const supabase = await createClient();

    // Try to select locked_until column (may not exist)
    const { data, error } = await (supabase as any)
      .from("staff")
      .select("locked_until")
      .eq("id", staffId)
      .single();

    if (error || !data || !data.locked_until) {
      return { locked: false, lockedUntil: null };
    }

    const lockedUntil = new Date(data.locked_until);
    return {
      locked: lockedUntil > new Date(),
      lockedUntil,
    };
  } catch {
    return { locked: false, lockedUntil: null };
  }
}

// =============================================
// SESSION CONFIGURATION
// =============================================

/**
 * Get session configuration for a role.
 * Requires migration 013 to be applied.
 * Returns defaults if table doesn't exist.
 */
export async function getSessionConfig(
  roleName: string
): Promise<SessionConfig> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("auth_session_config")
      .select("*")
      .eq("role_name", roleName)
      .single();

    if (error || !data) {
      return DEFAULT_SESSION_CONFIG;
    }

    return {
      sessionTimeoutMinutes: data.session_timeout_minutes ?? 480,
      inactivityTimeoutMinutes: data.inactivity_timeout_minutes ?? 60,
      requireMfa: data.require_mfa ?? false,
      maxConcurrentSessions: data.max_concurrent_sessions ?? 3,
    };
  } catch {
    return DEFAULT_SESSION_CONFIG;
  }
}

// =============================================
// MFA SUPPORT
// =============================================

/**
 * Enroll user in MFA (TOTP)
 */
export async function enrollMfa(
  supabase: SupabaseClient<Database>
): Promise<MfaEnrollmentResult> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Sushi in Sushi Authenticator",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to enroll MFA",
    };
  }
}

/**
 * Verify MFA code
 */
export async function verifyMfa(
  supabase: SupabaseClient<Database>,
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      return { success: false, error: challengeError.message };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      return { success: false, error: verifyError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify MFA",
    };
  }
}

/**
 * Get MFA factors for user
 */
export async function getMfaFactors(
  supabase: SupabaseClient<Database>
): Promise<{ id: string; type: string; friendlyName?: string }[]> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error || !data) {
      return [];
    }

    return data.totp.map((factor) => ({
      id: factor.id,
      type: factor.factor_type,
      friendlyName: factor.friendly_name ?? undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Unenroll from MFA
 */
export async function unenrollMfa(
  supabase: SupabaseClient<Database>,
  factorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to unenroll MFA",
    };
  }
}

/**
 * Check if MFA is required for the current session
 */
export async function isMfaRequired(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
      return false;
    }

    // If next level is aal2, MFA is required
    return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}

// =============================================
// SECURE LOGIN WRAPPER
// =============================================

export interface SecureLoginOptions {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecureLoginResult {
  success: boolean;
  requiresMfa?: boolean;
  mfaFactorId?: string;
  error?: string;
  rateLimited?: boolean;
  blockedUntil?: Date;
}

/**
 * Secure login with rate limiting and audit logging
 */
export async function secureLogin(
  supabase: SupabaseClient<Database>,
  options: SecureLoginOptions
): Promise<SecureLoginResult> {
  const { email, password, ipAddress, userAgent } = options;

  // Check rate limit by IP
  if (ipAddress) {
    const ipRateLimit = await checkRateLimit(ipAddress, "ip");
    if (!ipRateLimit.allowed) {
      await logAuthEvent({
        eventType: "login_failed",
        email,
        ipAddress,
        userAgent,
        success: false,
        errorMessage: "Rate limited (IP)",
      });
      return {
        success: false,
        rateLimited: true,
        blockedUntil: ipRateLimit.blockedUntil ?? undefined,
        error: "Demasiadas tentativas. Tente novamente mais tarde.",
      };
    }
  }

  // Check rate limit by email
  const emailRateLimit = await checkRateLimit(email, "email", {
    maxAttempts: 10,
    windowMinutes: 30,
    blockMinutes: 60,
  });
  if (!emailRateLimit.allowed) {
    await logAuthEvent({
      eventType: "login_failed",
      email,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: "Rate limited (email)",
    });
    return {
      success: false,
      rateLimited: true,
      blockedUntil: emailRateLimit.blockedUntil ?? undefined,
      error: "Demasiadas tentativas para este email. Tente novamente mais tarde.",
    };
  }

  // Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    await logAuthEvent({
      eventType: "login_failed",
      email,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: error?.message ?? "Invalid credentials",
    });
    return {
      success: false,
      error: "Credenciais inválidas",
    };
  }

  // Get staff record
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, role_id, roles!inner(name)")
    .eq("auth_user_id", data.user.id)
    .eq("is_active", true)
    .single();

  if (staffError || !staff) {
    await supabase.auth.signOut();
    await logAuthEvent({
      eventType: "login_failed",
      email,
      authUserId: data.user.id,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: "No staff record",
    });
    return {
      success: false,
      error: "Utilizador não tem permissões de staff",
    };
  }

  // Check if account is locked
  const lockStatus = await isAccountLocked(staff.id);
  if (lockStatus.locked) {
    await supabase.auth.signOut();
    await logAuthEvent({
      eventType: "login_failed",
      email,
      staffId: staff.id,
      authUserId: data.user.id,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: "Account locked",
    });
    return {
      success: false,
      error: "Conta bloqueada. Tente novamente mais tarde.",
      blockedUntil: lockStatus.lockedUntil ?? undefined,
    };
  }

  // Update login info and check for new IP
  const loginInfo = await updateStaffLoginInfo(staff.id, ipAddress ?? null, true);

  // Reset rate limits on successful login
  if (ipAddress) {
    await resetRateLimit(ipAddress, "ip");
  }
  await resetRateLimit(email, "email");

  // Check if MFA is required
  const mfaRequired = await isMfaRequired(supabase);
  let mfaFactorId: string | undefined;

  if (mfaRequired) {
    const factors = await getMfaFactors(supabase);
    if (factors.length > 0) {
      mfaFactorId = factors[0].id;
    }
  }

  // Log successful login
  const eventType: AuthEventType = loginInfo.isNewIp ? "new_ip_login" : "login_success";
  await logAuthEvent({
    eventType,
    staffId: staff.id,
    authUserId: data.user.id,
    email,
    ipAddress,
    userAgent,
    success: true,
    metadata: {
      isNewIp: loginInfo.isNewIp,
      requiresMfa: mfaRequired,
    },
  });

  return {
    success: true,
    requiresMfa: mfaRequired,
    mfaFactorId,
  };
}
