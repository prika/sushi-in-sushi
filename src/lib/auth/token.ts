import { SignJWT, jwtVerify } from "jose";
import type { RoleName, AuthUser, Location } from "@/types/database";
import { AUTH_SECRET_KEY, TOKEN_EXPIRATION } from "@/lib/config/constants";

const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET_KEY);

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
