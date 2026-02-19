import { createAdminClient } from "@/lib/supabase/server";
import type { RoleName, AuthUser, Location } from "@/types/database";
import { verifyPassword } from "./password";
import { createToken } from "./token";
import { logActivity } from "./activity";

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

// Fallback credentials from environment (for development before DB migration)
const FALLBACK_USERS: Record<
  string,
  { password: string; role: RoleName; name: string }
> = {
  "admin@sushinsushi.pt": {
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
    name: "Administrador",
  },
  admin: {
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
    name: "Administrador",
  },
  "cozinha@sushinsushi.pt": {
    password: process.env.COZINHA_PASSWORD || "cozinha123",
    role: "kitchen",
    name: "Cozinha",
  },
  cozinha: {
    password: process.env.COZINHA_PASSWORD || "cozinha123",
    role: "kitchen",
    name: "Cozinha",
  },
  "empregado@sushinsushi.pt": {
    password: process.env.EMPREGADO_PASSWORD || "empregado123",
    role: "waiter",
    name: "Empregado",
  },
  empregado: {
    password: process.env.EMPREGADO_PASSWORD || "empregado123",
    role: "waiter",
    name: "Empregado",
  },
};

/**
 * Authenticate a user with email and password
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    // Use admin client to bypass RLS for authentication queries
    const supabase = createAdminClient();

    // Try database authentication first
    const { data: staff, error } = await supabase
      .from("staff")
      .select(
        `
        *,
        role:roles(*)
      `,
      )
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .single();

    // If database query succeeded and we have a staff member
    if (!error && staff) {
      // Verify password
      if (!verifyPassword(password, staff.password_hash)) {
        // In non-production, allow fallback credentials even if DB user exists
        if (process.env.NODE_ENV !== "production") {
          const fallbackUser = FALLBACK_USERS[email.toLowerCase()];
          if (fallbackUser && fallbackUser.password === password) {
            const authUser: AuthUser = {
              id: staff.id, // Use real staff ID for consistency
              email: staff.email,
              name: staff.name,
              role: fallbackUser.role,
              location: staff.location as Location | null,
            };

            const token = await createToken(authUser);
            return { success: true, user: authUser, token };
          }
        }
        return { success: false, error: "Credenciais inválidas" };
      }

      // Verify role exists
      if (!staff.role || !staff.role.name) {
        console.error("Staff role not found for user:", staff.email);
        return { success: false, error: "Erro de configuração do utilizador" };
      }

      // Update last login
      await supabase
        .from("staff")
        .update({ last_login: new Date().toISOString() })
        .eq("id", staff.id);

      // Create auth user
      const authUser: AuthUser = {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role.name as RoleName,
        location: staff.location as Location | null,
      };

      // Create token
      const token = await createToken(authUser);

      // Log activity
      await logActivity(staff.id, "login", "staff", staff.id);

      return { success: true, user: authUser, token };
    }

    // Fallback to environment credentials (for development)
    const fallbackUser = FALLBACK_USERS[email.toLowerCase()];
    if (fallbackUser && fallbackUser.password === password) {
      const authUser: AuthUser = {
        id: `fallback-${email.toLowerCase()}`,
        email: email.toLowerCase(),
        name: fallbackUser.name,
        role: fallbackUser.role,
        location: null,
      };

      const token = await createToken(authUser);
      return { success: true, user: authUser, token };
    }

    return { success: false, error: "Credenciais inválidas" };
  } catch (error) {
    console.error("Login error:", error);

    // If database error, try fallback credentials
    const fallbackUser = FALLBACK_USERS[email.toLowerCase()];
    if (fallbackUser && fallbackUser.password === password) {
      const authUser: AuthUser = {
        id: `fallback-${email.toLowerCase()}`,
        email: email.toLowerCase(),
        name: fallbackUser.name,
        role: fallbackUser.role,
        location: null,
      };

      const token = await createToken(authUser);
      return { success: true, user: authUser, token };
    }

    return { success: false, error: "Erro ao fazer login" };
  }
}
