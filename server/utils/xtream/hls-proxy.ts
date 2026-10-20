import type { H3Event } from 'h3'

const REQUEST_TIMEOUT_MS = 15_000

function resolveUrl(base: string, ref: string): string {
  try {
    return new URL(ref, base).toString()
  } catch {
    return ref
  }
}

const URI_ATTRIBUTE_REGEX = /URI="([^"]+)"/

/** Rewrites a tag line's URI="..." attribute (used by #EXT-X-MEDIA, #EXT-X-KEY, #EXT-X-I-FRAME-STREAM-INF). */
function rewriteUriAttribute(line: string, manifestUrl: string): string {
  const match = line.match(URI_ATTRIBUTE_REGEX)
  if (!match || !match[1]) return line

  const absolute = resolveUrl(manifestUrl, match[1])
  const token = registerProxyTarget(absolute)
  return line.replace(URI_ATTRIBUTE_REGEX, `URI="/api/stream/segment/${token}"`)
}

/**
 * Rewrites every URI reference in an HLS playlist (master or media) to
 * route through our own segment proxy, so the browser never sees the real
 * upstream host or credentialed path. Handles both bare URI lines (variant
 * streams, media segments) and URI="..." attributes on tag lines (alternate
 * audio/subtitle tracks via #EXT-X-MEDIA, encryption keys via #EXT-X-KEY).
 * A subtitle/audio track hls.js can't fetch eventually becomes a *fatal*
 * error for the whole player, not just a missing side-channel — so this
 * isn't optional polish.
 */
export function rewriteManifest(manifestText: string, manifestUrl: string): string {
  return manifestText
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        return line
      }
      if (trimmed.startsWith('#')) {
        return trimmed.includes('URI="') ? rewriteUriAttribute(line, manifestUrl) : line
      }
      const absolute = resolveUrl(manifestUrl, trimmed)
      const token = registerProxyTarget(absolute)
      return `/api/stream/segment/${token}`
    })
    .join('\n')
}

/**
 * Fetches an upstream HLS resource (manifest or segment) and either
 * rewrites it (if it's a playlist) or passes it through as-is (segments,
 * raw media), forwarding Range requests so EXT-X-BYTERANGE playlists (many
 * segments sliced out of one large file) don't re-download the whole file
 * per segment. Sets headers/status directly on `event`; playlists come back as
 * rewritten text, everything else is streamed rather than buffered.
 */
export async function proxyHlsResource(event: H3Event, upstreamUrl: string): Promise<string | Buffer | ReadableStream<Uint8Array>> {
  // Manifests must never be cached (they mint fresh, TTL-bound tokens on
  // every fetch); segments are effectively single-use too since their
  // token disappears once the referencing manifest is refetched.
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const range = getHeader(event, 'range')
  const requestHeaders: Record<string, string> = range ? { Range: range } : {}

  let response: Response
  try {
    response = await fetch(upstreamUrl, { signal: controller.signal, headers: requestHeaders })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'Stream request timed out.' })
    }
    throw createError({ statusCode: 502, statusMessage: 'Could not reach the stream.' })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok && response.status !== 206) {
    throw createError({ statusCode: 502, statusMessage: `Stream server responded with HTTP ${response.status}.` })
  }

  const contentType = response.headers.get('content-type') ?? ''
  const finalUrl = response.url || upstreamUrl
  const looksLikePlaylist = contentType.includes('mpegurl') || finalUrl.endsWith('.m3u8')

  if (looksLikePlaylist) {
    const text = await response.text()
    if (text.trimStart().startsWith('#EXTM3U')) {
      setResponseHeader(event, 'Content-Type', 'application/vnd.apple.mpegurl')
      return rewriteManifest(text, finalUrl)
    }
    // Content-type/extension suggested a playlist but the body isn't one - pass it through untouched.
    setResponseHeader(event, 'Content-Type', contentType || 'application/octet-stream')
    return text
  }

  setResponseHeader(event, 'Content-Type', contentType || 'application/octet-stream')
  setResponseHeader(event, 'Accept-Ranges', 'bytes')
  const contentRange = response.headers.get('content-range')
  if (contentRange) {
    setResponseHeader(event, 'Content-Range', contentRange)
  }
  setResponseStatus(event, response.status)

  // Only forward Content-Length when the body isn't re-encoded in transit
  // (a gzip'd upstream would make the length disagree with decoded bytes).
  const contentLength = response.headers.get('content-length')
  if (contentLength && !response.headers.get('content-encoding')) {
    setResponseHeader(event, 'Content-Length', Number(contentLength))
  }

  // Stream the body straight through instead of buffering it: movies run to
  // multiple GB, and browsers open playback with an open-ended `bytes=0-`
  // range, so buffering would pull the entire file into memory before the
  // first byte reached the player. Stop the upstream transfer as soon as the
  // client goes away (seeking, closing the tab, switching episodes).
  event.node.res.once('close', () => controller.abort())

  return response.body ?? Buffer.alloc(0)
}
