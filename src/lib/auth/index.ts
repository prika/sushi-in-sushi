/**
 * Auth module - Re-exports all auth utilities
 */

// Password utilities
export { hashPassword, verifyPassword } from "./password";

// Token management
export { createToken, verifyToken } from "./token";
export type { TokenPayload } from "./token";

// Cookie management
export { getAuthUser, setAuthCookie, clearAuthCookie, getCookieName } from "./cookie";

// Login
export { login } from "./login";
export type { LoginResult } from "./login";

// Staff queries
export { getStaffById, getAllStaff } from "./staff";

// Permissions
export {
  getAccessibleTables,
  canAccessTable,
  canEditOrder,
  hasRole,
  isAdmin,
  isKitchen,
  isWaiter,
} from "./permissions";

// Activity logging
export { logActivity } from "./activity";

// Waiter management
export {
  assignTableToWaiter,
  removeTableFromWaiter,
  getWaiterTables,
} from "./waiter";

// Security features
export {
  checkRateLimit,
  resetRateLimit,
  logAuthEvent,
  getAuthEventsForStaff,
  getFailedLoginAttempts,
  updateStaffLoginInfo,
  isAccountLocked,
  getSessionConfig,
  enrollMfa,
  verifyMfa,
  getMfaFactors,
  unenrollMfa,
  isMfaRequired,
  secureLogin,
} from "./security";
export type {
  AuthEventType,
  RateLimitResult,
  AuditLogEntry,
  SessionConfig,
  MfaEnrollmentResult,
  SecureLoginOptions,
  SecureLoginResult,
} from "./security";

// Legacy support (for backward compatibility)
export type { RoleName as UserRole } from "@/types/database";
