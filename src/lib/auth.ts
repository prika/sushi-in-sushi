import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createClient } from "@/lib/supabase/server";
import type {
  RoleName,
  Staff,
  StaffWithRole,
  AuthUser,
  Location,
} from "@/types/database";

// =============================================
// CONFIGURATION
// =============================================

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "sushi-in-sushi-secret-key-change-in-production"
);

const COOKIE_NAME = "sushi-auth-token";
const TOKEN_EXPIRATION = "24h";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

// =============================================
// PASSWORD UTILITIES
// =============================================

/**
 * Hash a password
 * TODO: Replace with bcrypt in production
 * For now, using simple comparison for development
 */
export function hashPassword(password: string): string {
  // TODO: Use bcrypt.hash(password, 10) in production
  return password;
}

/**
 * Verify a password against a hash
 * TODO: Replace with bcrypt in production
 */
export function verifyPassword(password: string, hash: string): boolean {
  // TODO: Use bcrypt.compare(password, hash) in production
  return password === hash;
}

// =============================================
// TOKEN MANAGEMENT
// =============================================

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  location: Location | null;
}

/**
 * Create a JWT token for a user
 */
export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    location: payload.location,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(SECRET_KEY);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as RoleName,
      location: payload.location as Location | null,
    };
  } catch {
    return null;
  }
}

// =============================================
// COOKIE MANAGEMENT
// =============================================

/**
 * Get the current authenticated user from cookies
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Set the auth cookie with a token
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Clear the auth cookie (logout)
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the cookie name
 */
export function getCookieName(): string {
  return COOKIE_NAME;
}

// =============================================
// AUTHENTICATION
// =============================================

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

// Fallback credentials from environment (for development before DB migration)
const FALLBACK_USERS: Record<string, { password: string; role: RoleName; name: string }> = {
  "admin@sushiinsushi.pt": {
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
    name: "Administrador",
  },
  "admin": {
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
    name: "Administrador",
  },
  "cozinha@sushiinsushi.pt": {
    password: process.env.COZINHA_PASSWORD || "cozinha123",
    role: "kitchen",
    name: "Cozinha",
  },
  "cozinha": {
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
  password: string
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
      `
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

// =============================================
// STAFF QUERIES
// =============================================

/**
 * Get a staff member by ID with role information
 */
export async function getStaffById(id: string): Promise<StaffWithRole | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("staff")
      .select(
        `
        *,
        role:roles(*)
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      role: data.role,
    } as StaffWithRole;
  } catch (error) {
    console.error("Error fetching staff:", error);
    return null;
  }
}

/**
 * Get all staff members with roles
 */
export async function getAllStaff(): Promise<StaffWithRole[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("staff").select(
      `
        *,
        role:roles(*)
      `
    );

    if (error || !data) return [];

    return data as StaffWithRole[];
  } catch (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
}

// =============================================
// PERMISSION CHECKS
// =============================================

/**
 * Get all tables accessible by a user based on their role
 */
export async function getAccessibleTables(
  userId: string
): Promise<{ id: string; number: number; name: string }[]> {
  try {
    const supabase = await createClient();

    // First, get the user's role
    const staff = await getStaffById(userId);
    if (!staff) return [];

    // Admin and kitchen can see all tables (at their location)
    if (staff.role.name === "admin" || staff.role.name === "kitchen") {
      const query = supabase
        .from("tables")
        .select("id, number, name")
        .eq("is_active", true);

      // Filter by location if staff has a specific location
      if (staff.location) {
        query.eq("location", staff.location);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    }

    // Waiters can only see their assigned tables
    if (staff.role.name === "waiter") {
      const { data, error } = await supabase
        .from("waiter_tables")
        .select(
          `
          table:tables(id, number, name)
        `
        )
        .eq("staff_id", userId);

      if (error || !data) return [];

      return data
        .filter((d) => d.table)
        .map((d) => d.table as { id: string; number: number; name: string });
    }

    return [];
  } catch (error) {
    console.error("Error fetching accessible tables:", error);
    return [];
  }
}

/**
 * Check if a user can access a specific table
 */
export async function canAccessTable(
  userId: string,
  tableId: string
): Promise<boolean> {
  try {
    const staff = await getStaffById(userId);
    if (!staff) return false;

    // Admin has access to all tables
    if (staff.role.name === "admin") return true;

    // Kitchen has access to all tables (view only)
    if (staff.role.name === "kitchen") return true;

    // Waiters can only access assigned tables
    if (staff.role.name === "waiter") {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("waiter_tables")
        .select("id")
        .eq("staff_id", userId)
        .eq("table_id", tableId)
        .single();

      return !error && !!data;
    }

    return false;
  } catch (error) {
    console.error("Error checking table access:", error);
    return false;
  }
}

/**
 * Check if a user can edit an order
 */
export async function canEditOrder(
  userId: string,
  orderId: string
): Promise<boolean> {
  try {
    const staff = await getStaffById(userId);
    if (!staff) return false;

    // Admin can edit all orders
    if (staff.role.name === "admin") return true;

    // Kitchen can update order status (preparing, ready)
    if (staff.role.name === "kitchen") return true;

    // Waiters can edit orders for their assigned tables
    if (staff.role.name === "waiter") {
      const supabase = await createClient();

      // Get the order's session and table
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          session:sessions(table_id)
        `
        )
        .eq("id", orderId)
        .single();

      if (orderError || !order || !order.session) return false;

      // Check if waiter has access to this table
      return canAccessTable(userId, order.session.table_id);
    }

    return false;
  } catch (error) {
    console.error("Error checking order edit permission:", error);
    return false;
  }
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: AuthUser | null, roles: RoleName[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, ["admin"]);
}

/**
 * Check if user is kitchen staff
 */
export function isKitchen(user: AuthUser | null): boolean {
  return hasRole(user, ["kitchen"]);
}

/**
 * Check if user is waiter
 */
export function isWaiter(user: AuthUser | null): boolean {
  return hasRole(user, ["waiter"]);
}

// =============================================
// ACTIVITY LOGGING
// =============================================

/**
 * Log an activity in the activity log
 */
export async function logActivity(
  staffId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("activity_log").insert({
      staff_id: staffId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || null,
    });
  } catch (error) {
    // Don't throw errors for logging - just log to console
    console.error("Error logging activity:", error);
  }
}

// =============================================
// WAITER MANAGEMENT
// =============================================

/**
 * Assign a table to a waiter
 */
export async function assignTableToWaiter(
  waiterId: string,
  tableId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("waiter_tables").insert({
      staff_id: waiterId,
      table_id: tableId,
    });

    if (error) {
      console.error("Error assigning table:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error assigning table:", error);
    return false;
  }
}

/**
 * Remove a table assignment from a waiter
 */
export async function removeTableFromWaiter(
  waiterId: string,
  tableId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("waiter_tables")
      .delete()
      .eq("staff_id", waiterId)
      .eq("table_id", tableId);

    if (error) {
      console.error("Error removing table assignment:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error removing table assignment:", error);
    return false;
  }
}

/**
 * Get all tables assigned to a waiter
 */
export async function getWaiterTables(
  waiterId: string
): Promise<{ id: string; number: number; name: string; location: string }[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("waiter_tables")
      .select(
        `
        table:tables(id, number, name, location)
      `
      )
      .eq("staff_id", waiterId);

    if (error || !data) return [];

    return data
      .filter((d) => d.table)
      .map(
        (d) =>
          d.table as { id: string; number: number; name: string; location: string }
      );
  } catch (error) {
    console.error("Error fetching waiter tables:", error);
    return [];
  }
}

// =============================================
// LEGACY SUPPORT (for backward compatibility)
// =============================================

export type UserRole = RoleName;
