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

// Feature flag for Supabase Auth
const USE_SUPABASE_AUTH =
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true";

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
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: RoleName[]) => boolean;
  isAdmin: boolean;
  isKitchen: boolean;
  isWaiter: boolean;
  // MFA support
  mfaStatus: MfaStatus | null;
  verifyMfa: (code: string) => Promise<MfaVerifyResult>;
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
  // This bypasses RLS issues with the roles table
  const fetchStaffProfile = useCallback(
    async (_authUserId: string): Promise<AuthUser | null> => {
      // Use get_current_staff() RPC which is SECURITY DEFINER
      const { data: staffArray, error: staffError } = await (supabase as any).rpc("get_current_staff");

      if (staffError || !staffArray || staffArray.length === 0) {
        console.error("Error fetching staff profile:", staffError);
        return null;
      }

      const staff = staffArray[0];

      // Get role name using RPC function
      const { data: roleName, error: roleError } = await (supabase as any).rpc("get_current_staff_role");

      if (roleError || !roleName) {
        console.error("Error fetching staff role:", roleError);
        return null;
      }

      return {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: roleName as RoleName,
        location: staff.location as Location | null,
      };
    },
    [supabase]
  );

  // Fetch MFA status
  const refreshMfaStatus = useCallback(async () => {
    if (!USE_SUPABASE_AUTH) {
      setMfaStatus(null);
      return;
    }

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

  // Fetch current user (legacy API)
  const refreshUserLegacy = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch current user (Supabase Auth)
  const refreshUserSupabase = useCallback(async () => {
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

      // Also refresh MFA status
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

  // Combined refresh function
  const refreshUser = useCallback(async () => {
    if (USE_SUPABASE_AUTH) {
      await refreshUserSupabase();
    } else {
      await refreshUserLegacy();
    }
  }, [refreshUserLegacy, refreshUserSupabase]);

  // Initialize auth state
  useEffect(() => {
    if (USE_SUPABASE_AUTH) {
      // Initial fetch
      refreshUserSupabase();

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const staffProfile = await fetchStaffProfile(session.user.id);
          setUser(staffProfile);
          if (staffProfile) {
            await refreshMfaStatus();
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setMfaStatus(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      refreshUserLegacy();
    }
  }, [supabase, refreshUserLegacy, refreshUserSupabase, fetchStaffProfile, refreshMfaStatus]);

  // Login function (legacy)
  const loginLegacy = useCallback(
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
          };
        }

        setUser(data.user);
        return { success: true };
      } catch {
        return { success: false, error: "Erro ao fazer login" };
      }
    },
    []
  );

  // Login function (Supabase Auth with security features)
  const loginSupabase = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        // Call secure login API that handles rate limiting and audit logging
        const response = await fetch("/api/auth/secure-login", {
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

  // Combined login function
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      if (USE_SUPABASE_AUTH) {
        return loginSupabase(email, password);
      } else {
        return loginLegacy(email, password);
      }
    },
    [loginLegacy, loginSupabase]
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

        // Refresh user and MFA status after successful verification
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

  // Logout function (legacy)
  const logoutLegacy = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMfaStatus(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router]);

  // Logout function (Supabase Auth)
  const logoutSupabase = useCallback(async () => {
    try {
      // Log the logout event
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut();
      setUser(null);
      setMfaStatus(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [supabase, router]);

  // Combined logout function
  const logout = useCallback(async () => {
    if (USE_SUPABASE_AUTH) {
      await logoutSupabase();
    } else {
      await logoutLegacy();
    }
  }, [logoutLegacy, logoutSupabase]);

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
        // Redirect to appropriate dashboard based on role
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
 * Redirects to MFA verification page if MFA is required but not verified
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
