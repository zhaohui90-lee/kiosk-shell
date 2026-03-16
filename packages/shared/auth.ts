/**
 * Shared authentication utilities
 */

import { randomBytes } from 'crypto'

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

/**
 * Session token generator function.
 */
export type TokenGenerator = () => string

/**
 * Session token store API.
 */
export interface SessionTokenStore {
  issueToken(): string
  verifyToken(token: string | undefined): boolean
  invalidateToken(): void
  getActiveToken(): string | null
}

function defaultTokenGenerator(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create an in-memory single-session token store.
 * The latest issued token replaces the previous one.
 */
export function createInMemorySessionTokenStore(
  tokenGenerator: TokenGenerator = defaultTokenGenerator,
): SessionTokenStore {
  let activeToken: string | null = null

  return {
    issueToken(): string {
      activeToken = tokenGenerator()
      return activeToken
    },
    verifyToken(token: string | undefined): boolean {
      return typeof token === 'string' && activeToken !== null && token === activeToken
    },
    invalidateToken(): void {
      activeToken = null
    },
    getActiveToken(): string | null {
      return activeToken
    },
  }
}

const defaultSessionTokenStore = createInMemorySessionTokenStore()

/**
 * Issue a new admin session token.
 */
export function issueSessionToken(): string {
  return defaultSessionTokenStore.issueToken()
}

/**
 * Verify the provided admin session token.
 */
export function verifySessionToken(token: string | undefined): boolean {
  return defaultSessionTokenStore.verifyToken(token)
}

/**
 * Invalidate the current admin session token.
 */
export function invalidateSessionToken(): void {
  defaultSessionTokenStore.invalidateToken()
}
