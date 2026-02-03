/**
 * Password utilities
 * TODO: Replace with bcrypt in production
 */

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
