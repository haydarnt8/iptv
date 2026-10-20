import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = useRuntimeConfig().profileEncryptionKey

  if (!raw) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server misconfigured: set NUXT_PROFILE_ENCRYPTION_KEY in .env (see .env.example).'
    })
  }

  const key = Buffer.from(raw, 'base64')

  if (key.length !== 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PROFILE_ENCRYPTION_KEY must decode to 32 bytes. Generate one with: openssl rand -base64 32'
    })
  }

  return key
}

/** Encrypts a secret for at-rest storage. Output packs iv + authTag + ciphertext into one base64 string. */
export function encryptSecret(plainText: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const key = getKey()
  const buffer = Buffer.from(payload, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
