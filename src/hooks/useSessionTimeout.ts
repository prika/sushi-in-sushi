"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// =============================================
// CONFIGURATION
// =============================================

// Session timeout in milliseconds (default: 30 minutes)
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

// Warning before logout in milliseconds (default: 2 minutes before timeout)
const DEFAULT_WARNING_BEFORE_MS = 2 * 60 * 1000;

// Events that count as user activity
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

// Throttle activity updates to avoid excessive processing (1 second)
const ACTIVITY_THROTTLE_MS = 1000;

// =============================================
// TYPES
// =============================================

interface SessionTimeoutOptions {
  timeoutMs?: number;
  warningBeforeMs?: number;
  onWarning?: (remainingMs: number) => void;
  onTimeout?: () => void;
  enabled?: boolean;
}

interface SessionTimeoutState {
  isWarning: boolean;
  remainingMs: number;
  lastActivity: Date;
}

// =============================================
// HOOK
// =============================================

/**
 * Hook to track user inactivity and automatically logout after timeout
 *
 * @param options Configuration options
 * @returns Session timeout state and controls
 */
export function useSessionTimeout(options: SessionTimeoutOptions = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningBeforeMs = DEFAULT_WARNING_BEFORE_MS,
    onWarning,
    onTimeout,
    enabled = true,
  } = options;

  const { isAuthenticated, logout } = useAuth();
  const [state, setState] = useState<SessionTimeoutState>({
    isWarning: false,
    remainingMs: timeoutMs,
    lastActivity: new Date(),
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<boolean>(false);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    clearAllTimeouts();

    if (onTimeout) {
      onTimeout();
    }

    // Logout the user
    await logout();
  }, [clearAllTimeouts, logout, onTimeout]);

  // Handle warning (show countdown)
  const handleWarning = useCallback(() => {
    setState((prev) => ({ ...prev, isWarning: true }));

    const warningStartTime = Date.now();
    const timeoutTime = lastActivityRef.current + timeoutMs;

    // Start countdown
    countdownRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, timeoutTime - now);

      setState((prev) => ({ ...prev, remainingMs: remaining }));

      if (onWarning) {
        onWarning(remaining);
      }

      if (remaining <= 0) {
        handleTimeout();
      }
    }, 1000);
  }, [timeoutMs, onWarning, handleTimeout]);

  // Reset the timeout (on user activity)
  const resetTimeout = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    // Throttle to avoid excessive processing
    if (throttleRef.current) return;
    throttleRef.current = true;
    setTimeout(() => {
      throttleRef.current = false;
    }, ACTIVITY_THROTTLE_MS);

    lastActivityRef.current = Date.now();

    // Clear existing timeouts
    clearAllTimeouts();

    // Reset warning state
    setState({
      isWarning: false,
      remainingMs: timeoutMs,
      lastActivity: new Date(),
    });

    // Set warning timeout
    const warningDelay = timeoutMs - warningBeforeMs;
    if (warningDelay > 0) {
      warningRef.current = setTimeout(handleWarning, warningDelay);
    }

    // Set logout timeout
    timeoutRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [
    enabled,
    isAuthenticated,
    timeoutMs,
    warningBeforeMs,
    clearAllTimeouts,
    handleWarning,
    handleTimeout,
  ]);

  // Extend session (user clicked "stay logged in")
  const extendSession = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  // Setup activity listeners
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      clearAllTimeouts();
      return;
    }

    // Initial timeout setup
    resetTimeout();

    // Add activity listeners
    const handleActivity = () => {
      resetTimeout();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if session has expired while tab was hidden
        const now = Date.now();
        const elapsed = now - lastActivityRef.current;

        if (elapsed >= timeoutMs) {
          handleTimeout();
        } else if (elapsed >= timeoutMs - warningBeforeMs) {
          // Show warning if close to timeout
          handleWarning();
        } else {
          // Reset if still within timeout
          resetTimeout();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearAllTimeouts();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    enabled,
    isAuthenticated,
    timeoutMs,
    warningBeforeMs,
    resetTimeout,
    handleTimeout,
    handleWarning,
    clearAllTimeouts,
  ]);

  return {
    ...state,
    extendSession,
    resetTimeout,
  };
}

// =============================================
// EXPORTS
// =============================================

export type { SessionTimeoutOptions, SessionTimeoutState };
