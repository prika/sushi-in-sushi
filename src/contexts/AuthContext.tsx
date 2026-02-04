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
import type { AuthUser, RoleName } from "@/types/database";

// =============================================
// TYPES
// =============================================

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
}

interface LoginResult {
  success: boolean;
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

  // Fetch current user on mount
  const refreshUser = useCallback(async () => {
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

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login function
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
          return { success: false, error: data.error || "Credenciais inválidas" };
        }

        setUser(data.user);
        return { success: true };
      } catch {
        return { success: false, error: "Erro ao fazer login" };
      }
    },
    []
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router]);

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
    }),
    [user, isLoading, login, logout, refreshUser, hasRole, isAdmin, isKitchen, isWaiter]
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
