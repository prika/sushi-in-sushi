import { createClient } from "@/lib/supabase/server";
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
};

/**
 * Authenticate a user with email and password
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const supabase = await createClient();

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
        return { success: false, error: "Credenciais inválidas" };
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
