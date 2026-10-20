import type { H3Event } from 'h3'

/** Path of a tokenized stream link (manifests rewritten by `rewriteManifest` point here too). */
export const STREAM_LINK_ROUTE = '/api/stream/segment/:token'

/**
 * Serves a tokenized stream link: a playlist (rewritten so its own entries are tokenized
 * links), a segment, or a whole file. Shared by the app's route and the cast port.
 */
export async function serveStreamLink(event: H3Event) {
  // Cast links carry a file extension (".m3u8", ".mp4") as a hint for the TV's player.
  const token = getRouterParam(event, 'token')?.replace(/\.[a-z0-9]{1,5}$/i, '')
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token.' })
  }

  const upstreamUrl = resolveProxyTarget(token)
  if (!upstreamUrl) {
    throw createError({ statusCode: 404, statusMessage: 'This stream link expired. Reload the channel.' })
  }

  return await proxyHlsResource(event, upstreamUrl)
}
