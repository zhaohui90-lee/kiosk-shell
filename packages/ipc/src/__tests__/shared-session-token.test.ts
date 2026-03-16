import { describe, expect, it } from 'vitest'
import { createInMemorySessionTokenStore } from '@kiosk/shared'

describe('shared session token store', () => {
  it('issues and verifies a token', () => {
    const store = createInMemorySessionTokenStore(() => 'token-1')

    const token = store.issueToken()

    expect(token).toBe('token-1')
    expect(store.verifyToken(token)).toBe(true)
    expect(store.verifyToken('invalid-token')).toBe(false)
  })

  it('replaces old token when issuing a new one', () => {
    const tokens = ['token-1', 'token-2']
    const store = createInMemorySessionTokenStore(() => tokens.shift() ?? 'fallback')

    const token1 = store.issueToken()
    const token2 = store.issueToken()

    expect(token1).toBe('token-1')
    expect(token2).toBe('token-2')
    expect(store.verifyToken(token1)).toBe(false)
    expect(store.verifyToken(token2)).toBe(true)
  })

  it('invalidates active token', () => {
    const store = createInMemorySessionTokenStore(() => 'token-1')

    const token = store.issueToken()
    expect(store.verifyToken(token)).toBe(true)

    store.invalidateToken()

    expect(store.verifyToken(token)).toBe(false)
    expect(store.getActiveToken()).toBeNull()
  })
})
