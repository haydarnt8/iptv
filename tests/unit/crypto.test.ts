import { randomBytes } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decryptSecret, encryptSecret } from '../../server/utils/crypto'

function useKey(key: string) {
  vi.stubGlobal('useRuntimeConfig', () => ({ profileEncryptionKey: key }))
}

describe('password encryption at rest', () => {
  beforeEach(() => {
    vi.stubGlobal('createError', (input: { statusMessage: string }) => new Error(input.statusMessage))
    useKey(randomBytes(32).toString('base64'))
  })

  it('round-trips and never stores the plain text', () => {
    const stored = encryptSecret('s3cret-pass')
    expect(stored).not.toContain('s3cret-pass')
    expect(decryptSecret(stored)).toBe('s3cret-pass')
  })

  it('uses a fresh IV every time', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('detects tampering', () => {
    const stored = Buffer.from(encryptSecret('value'), 'base64')
    stored[stored.length - 1] = (stored[stored.length - 1] ?? 0) ^ 0xff
    expect(() => decryptSecret(stored.toString('base64'))).toThrow()
  })

  it('refuses a missing or short key', () => {
    useKey('')
    expect(() => encryptSecret('x')).toThrow(/NUXT_PROFILE_ENCRYPTION_KEY/)
    useKey(randomBytes(16).toString('base64'))
    expect(() => encryptSecret('x')).toThrow(/32 bytes/)
  })
})
