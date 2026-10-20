import { z } from 'zod'
import type { CastMediaLink } from '#shared/types/cast'

// A cast link stays valid while the TV keeps using it, and for this long after it stops
// (e.g. a paused movie), so pausing for a while doesn't break resuming.
const CAST_LINK_IDLE_TTL_MS = 6 * 60 * 60 * 1000

const bodySchema = z.object({
  kind: z.enum(['live', 'movie', 'series']),
  id: z.string().regex(/^\d+$/, 'Invalid stream id.'),
  ext: z.string().optional()
})

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  ts: 'video/mp2t',
  m3u8: 'application/x-mpegurl'
}

/**
 * Mints a link the TV can fetch from the cast port on the local network. This endpoint itself
 * is only reachable from this computer (see middleware/network-access).
 */
export default defineEventHandler(async (event): Promise<CastMediaLink> => {
  const { kind, id, ext } = await readBodyWithSchema(event, bodySchema)
  const extension = kind === 'live' ? 'm3u8' : sanitizeExtension(ext)
  const upstreamUrl = await buildUpstreamStreamUrl(kind, id, extension)
  const token = registerProxyTarget(upstreamUrl, CAST_LINK_IDLE_TTL_MS)

  return {
    url: `${getCastBaseUrl(event)}/api/stream/segment/${token}.${extension}`,
    contentType: VIDEO_CONTENT_TYPES[extension] ?? 'video/mp4',
    isLive: kind === 'live'
  }
})
