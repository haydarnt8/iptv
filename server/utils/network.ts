import { networkInterfaces } from 'node:os'
import type { H3Event } from 'h3'

/** Requests from this computer itself (IPv4, IPv6, and IPv4-mapped IPv6 loopback). */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false
  const normalized = address.startsWith('::ffff:') ? address.slice(7) : address
  return normalized === '::1' || normalized.startsWith('127.')
}

function isPrivateIpv4(address: string): boolean {
  return /^10\./.test(address)
    || /^192\.168\./.test(address)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(address)
}

/** This computer's address on the home network, as other devices (a Chromecast) would reach it. */
export function findLanAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const info of addresses ?? []) {
      if (info.family === 'IPv4' && !info.internal && isPrivateIpv4(info.address)) return info.address
    }
  }
  return null
}

/**
 * Base URL a device on the local network uses to reach the cast port, e.g. "http://192.168.1.20:3001".
 * `NUXT_CAST_BASE_URL` overrides detection (several network adapters, a VPN, a reverse proxy).
 */
export function getCastBaseUrl(event: H3Event): string {
  const { castBaseUrl, castPort } = useRuntimeConfig(event)
  if (castBaseUrl) return castBaseUrl.replace(/\/+$/, '')
  if (!Number(castPort)) {
    throw createError({ statusCode: 409, statusMessage: 'Casting is turned off (NUXT_CAST_PORT is 0).' })
  }

  const address = findLanAddress()
  if (!address) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This computer isn\'t connected to a local network, so your TV can\'t reach it.'
    })
  }
  return `http://${address}:${castPort}`
}
