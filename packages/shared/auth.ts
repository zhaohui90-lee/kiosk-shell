/**
 * Shared authentication utilities
 */

/**
 * Minimum length for secure password overrides.
 */
export const MIN_SECURE_PASSWORD_LENGTH = 8

/**
 * Check if a password can be accepted as a secure override.
 */
export function isSecurePasswordOverride(password: string | undefined): password is string {
  return typeof password === 'string' && password.length >= MIN_SECURE_PASSWORD_LENGTH
}

/**
 * Verify a plain-text password against expected value.
 */
export function verifyPassword(provided: string | undefined, expected: string): boolean {
  return typeof provided === 'string' && provided === expected
}
