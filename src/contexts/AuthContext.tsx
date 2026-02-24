"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, RoleName, Location } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

// =============================================
// TYPES
// =============================================

interface MfaStatus {
  required: boolean;
  enrolled: boolean;
  needsVerification: boolean;
  factorId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (_email: string, _password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (_roles: RoleName[]) => boolean;
  isAdmin: boolean;
  isKitchen: boolean;
  isWaiter: boolean;
  // MFA support
  mfaStatus: MfaStatus | null;
  verifyMfa: (_code: string) => Promise<MfaVerifyResult>;
  enrollMfa: () => Promise<MfaEnrollResult>;
  refreshMfaStatus: () => Promise<void>;
}

interface LoginResult {
  success: boolean;
  error?: string;
  requiresMfa?: boolean;
  mfaFactorId?: string;
  rateLimited?: boolean;
  blockedUntil?: Date;
}

interface MfaVerifyResult {
  success: boolean;
  error?: string;
}

interface MfaEnrollResult {
  success: boolean;
  qrCode?: string;
  secret?: string;
  error?: string;
}

// =============================================
// CONTEXT
// =============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================
// PROVIDER
// =============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);

  // Get Supabase client (singleton)
  const supabase = useMemo(() => createClient(), []);

  // Fetch staff profile from Supabase using RPC functions (SECURITY DEFINER)
  // Both RPCs run in parallel to reduce latency
  const fetchStaffProfile = useCallback(
    async (_authUserId: string): Promise<AuthUser | null> => {
      const [staffResult, roleResult] = await Promise.all([
        (supabase as any).rpc("get_current_staff"),
        (supabase as any).rpc("get_current_staff_role"),
      ]);

      if (staffResult.error || !staffResult.data || staffResult.data.length === 0) {
        return null;
      }

      if (roleResult.error || !roleResult.data) {
        return null;
      }

      const staff = staffResult.data[0];

      return {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: roleResult.data as RoleName,
        location: staff.location as Location | null,
      };
    },
    [supabase]
  );

  // Fetch MFA status
  const refreshMfaStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/mfa/status");
      if (response.ok) {
        const data = await response.json();
        setMfaStatus({
          required: data.required,
          enrolled: data.enrolled,
          needsVerification: data.needsVerification,
          factorId: data.factors?.[0]?.id,
        });
      } else {
        setMfaStatus(null);
      }
    } catch {
      setMfaStatus(null);
    }
  }, []);

  // Fetch current user via Supabase Auth
  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setMfaStatus(null);
        return;
      }

      const staffProfile = await fetchStaffProfile(authUser.id);
      setUser(staffProfile);

      if (staffProfile) {
        await refreshMfaStatus();
      }
    } catch {
      setUser(null);
      setMfaStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchStaffProfile, refreshMfaStatus]);

  // Initialize auth state via onAuthStateChange only (avoids double fetch)
  // INITIAL_SESSION fires on mount with the existing session (or null)
  // SIGNED_IN fires on new login
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        session?.user
      ) {
        const staffProfile = await fetchStaffProfile(session.user.id);
        setUser(staffProfile);
        if (staffProfile) {
          await refreshMfaStatus();
        }
      } else if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_OUT"
      ) {
        setUser(null);
        setMfaStatus(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchStaffProfile, refreshMfaStatus]);

  // Login function (Supabase Auth with rate limiting and audit logging)
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Credenciais inválidas",
            rateLimited: data.rateLimited,
            blockedUntil: data.blockedUntil ? new Date(data.blockedUntil) : undefined,
          };
        }

        // If MFA is required, return that info
        if (data.requiresMfa) {
          return {
            success: true,
            requiresMfa: true,
            mfaFactorId: data.mfaFactorId,
          };
        }

        // Fetch staff profile
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          return { success: false, error: "Erro ao fazer login" };
        }

        const staffProfile = await fetchStaffProfile(authUser.id);

        if (!staffProfile) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: "Utilizador não tem permissões de staff",
          };
        }

        setUser(staffProfile);
        await refreshMfaStatus();
        return { success: true };
      } catch {
        return { success: false, error: "Erro ao fazer login" };
      }
    },
    [supabase, fetchStaffProfile, refreshMfaStatus]
  );

  // Verify MFA code
  const verifyMfa = useCallback(
    async (code: string): Promise<MfaVerifyResult> => {
      try {
        const response = await fetch("/api/auth/mfa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            factorId: mfaStatus?.factorId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Código MFA inválido",
          };
        }

        await refreshUser();
        return { success: true };
      } catch {
        return { success: false, error: "Erro ao verificar MFA" };
      }
    },
    [mfaStatus?.factorId, refreshUser]
  );

  // Enroll in MFA
  const enrollMfa = useCallback(async (): Promise<MfaEnrollResult> => {
    try {
      const response = await fetch("/api/auth/mfa/enroll", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Erro ao ativar MFA",
        };
      }

      return {
        success: true,
        qrCode: data.qrCode,
        secret: data.secret,
      };
    } catch {
      return { success: false, error: "Erro ao ativar MFA" };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut();
      setUser(null);
      setMfaStatus(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [supabase, router]);

  // Role check helpers
  const hasRole = useCallback(
    (roles: RoleName[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const isAdmin = user?.role === "admin";
  const isKitchen = user?.role === "kitchen";
  const isWaiter = user?.role === "waiter";

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
      hasRole,
      isAdmin,
      isKitchen,
      isWaiter,
      mfaStatus,
      verifyMfa,
      enrollMfa,
      refreshMfaStatus,
    }),
    [
      user,
      isLoading,
      login,
      logout,
      refreshUser,
      hasRole,
      isAdmin,
      isKitchen,
      isWaiter,
      mfaStatus,
      verifyMfa,
      enrollMfa,
      refreshMfaStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================
// HOOKS
// =============================================

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook that requires authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(allowedRoles?: RoleName[]): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push("/login");
    }

    if (!auth.isLoading && auth.isAuthenticated && allowedRoles) {
      if (!auth.hasRole(allowedRoles)) {
        switch (auth.user?.role) {
          case "admin":
            router.push("/admin");
            break;
          case "kitchen":
            router.push("/cozinha");
            break;
          case "waiter":
            router.push("/waiter");
            break;
          default:
            router.push("/");
        }
      }
    }
  }, [auth, allowedRoles, router]);

  return auth;
}

/**
 * Hook for admin-only routes
 */
export function useRequireAdmin(): AuthContextType {
  return useRequireAuth(["admin"]);
}

/**
 * Hook for kitchen routes
 */
export function useRequireKitchen(): AuthContextType {
  return useRequireAuth(["admin", "kitchen"]);
}

/**
 * Hook for waiter routes
 */
export function useRequireWaiter(): AuthContextType {
  return useRequireAuth(["admin", "waiter"]);
}

/**
 * Hook that requires MFA verification
 */
export function useRequireMfa(): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && auth.mfaStatus?.needsVerification) {
      router.push("/login/mfa");
    }
  }, [auth, router]);

  return auth;
}
