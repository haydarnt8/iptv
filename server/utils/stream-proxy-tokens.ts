import { randomUUID } from 'node:crypto'

/**
 * Maps opaque tokens to real upstream URLs for HLS sub-resources (child
 * playlists, segments) and cast links. Keeps the real Xtream host/credentials
 * out of any URL a browser or TV ever sees, and stops this proxy being usable
 * to fetch arbitrary attacker-supplied URLs — only URLs we generated
 * server-side are ever registered.
 */
interface ProxyTarget {
  url: string
  ttlMs: number
  expiresAt: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000
// Live manifests are refetched every few seconds and mint fresh tokens each
// time, so expired ones are swept out periodically rather than piling up.
const SWEEP_EVERY_REGISTRATIONS = 500

const targets = new Map<string, ProxyTarget>()
let registrationsSinceSweep = 0

function sweepExpired(now: number) {
  for (const [token, target] of targets) {
    if (target.expiresAt < now) targets.delete(token)
  }
}

/** `ttlMs` is idle time: every use pushes expiry forward again. */
export function registerProxyTarget(url: string, ttlMs = DEFAULT_TTL_MS): string {
  const now = Date.now()
  if (++registrationsSinceSweep >= SWEEP_EVERY_REGISTRATIONS) {
    registrationsSinceSweep = 0
    sweepExpired(now)
  }
  const token = randomUUID()
  targets.set(token, { url, ttlMs, expiresAt: now + ttlMs })
  return token
}

export function resolveProxyTarget(token: string): string | null {
  const target = targets.get(token)
  if (!target) return null

  const now = Date.now()
  if (target.expiresAt < now) {
    targets.delete(token)
    return null
  }

  // Refresh so a long-running session doesn't expire mid-playback.
  target.expiresAt = now + target.ttlMs
  return target.url
}
