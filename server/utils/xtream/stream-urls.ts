export type StreamKind = 'live' | 'movie' | 'series'

const SAFE_EXTENSION = /^[a-z0-9]{1,5}$/i

/** Container extension from a query string, or `fallback` if missing/odd-looking. */
export function sanitizeExtension(value: unknown, fallback = 'mp4'): string {
  return typeof value === 'string' && SAFE_EXTENSION.test(value) ? value.toLowerCase() : fallback
}

/**
 * The real, credentialed upstream URL for a stream of the active profile.
 * Server-side only: it embeds the account password.
 */
export async function buildUpstreamStreamUrl(kind: StreamKind, id: string, extension = 'mp4'): Promise<string> {
  const profile = await getActiveProfileWithSecret()
  if (!profile) {
    throw createError({ statusCode: 400, statusMessage: 'No active IPTV profile. Add one in Profiles first.' })
  }

  const password = decryptSecret(profile.passwordEncrypted)
  const base = profile.serverUrl.replace(/\/+$/, '')
  const credentials = `${encodeURIComponent(profile.username)}/${encodeURIComponent(password)}`
  const file = kind === 'live' ? `${encodeURIComponent(id)}.m3u8` : `${encodeURIComponent(id)}.${sanitizeExtension(extension)}`
  return `${base}/${kind}/${credentials}/${file}`
}
