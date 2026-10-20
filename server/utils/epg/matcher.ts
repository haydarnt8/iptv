import type { EpgMatchMethod } from '#shared/types/epg'
import type { LiveStream } from '#shared/types/xtream'

const QUALITY_TOKENS = /\b(?:uhd|fhd|hd|sd|4k|8k|hevc|h265|low|backup|raw|vip)\b/g

/** "AR: MBC 1 HD" and "MBC 1 4K" both become "mbc1". */
export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[a-z]{2,4}\s*[:|]\s*/, '')
    .replace(QUALITY_TOKENS, ' ')
    .replace(/[^a-z0-9]/g, '')
}

/** "MBC.1.HD.ae" and "mbc1.ae" both become "mbc1.ae". */
export function normalizeGuideId(id: string): string {
  const lower = id.toLowerCase()
  const dot = lower.lastIndexOf('.')
  const base = dot > 0 ? lower.slice(0, dot) : lower
  const country = dot > 0 ? lower.slice(dot + 1) : ''
  const cleaned = base.replace(/\./g, ' ').replace(QUALITY_TOKENS, ' ').replace(/[^a-z0-9]/g, '')
  return `${cleaned}.${country}`
}

// Names shorter than this ("bbc", "tv") match far too much to trust.
const MIN_NAME_LENGTH = 4

const METHOD_RANK: Record<EpgMatchMethod, number> = { id: 0, normalizedId: 1, name: 2 }

interface Candidate {
  key: string
  method: EpgMatchMethod
}

function addTo(map: Map<string, number[]>, key: string, streamId: number) {
  const list = map.get(key)
  if (list) list.push(streamId)
  else map.set(key, [streamId])
}

/**
 * Pairs live channels with guide channels. Collects every candidate while
 * guides stream in, then picks per channel the strongest evidence (exact
 * EPG id, then normalized id, then name — the order TiviMate and similar
 * players use) *among candidates that actually have programmes*. Deciding
 * early doesn't work: a provider can publish a guide whose channel ids match
 * the lineup exactly but which contains no programmes at all, and that would
 * otherwise lock every channel to an empty guide.
 */
export class LineupMatcher {
  private readonly byId = new Map<string, number[]>()
  private readonly byNormalizedId = new Map<string, number[]>()
  private readonly byName = new Map<string, number[]>()
  private readonly candidates = new Map<number, Candidate[]>()
  private readonly matchedKeys = new Set<string>()
  readonly totalChannels: number

  constructor(streams: LiveStream[]) {
    this.totalChannels = streams.length
    for (const stream of streams) {
      if (stream.epgChannelId) {
        addTo(this.byId, stream.epgChannelId.toLowerCase(), stream.streamId)
        addTo(this.byNormalizedId, normalizeGuideId(stream.epgChannelId), stream.streamId)
      }
      const name = normalizeChannelName(stream.name)
      if (name.length >= MIN_NAME_LENGTH) addTo(this.byName, name, stream.streamId)
    }
  }

  private add(streamIds: number[] | undefined, key: string, method: EpgMatchMethod) {
    if (!streamIds) return
    for (const streamId of streamIds) {
      const list = this.candidates.get(streamId)
      const existing = list?.find(candidate => candidate.key === key)
      if (existing) {
        if (METHOD_RANK[method] < METHOD_RANK[existing.method]) existing.method = method
      } else if (list) {
        list.push({ key, method })
      } else {
        this.candidates.set(streamId, [{ key, method }])
      }
    }
    this.matchedKeys.add(key)
  }

  /** Match a guide `<channel>` element, using its id and display names. */
  matchChannel(key: string, guideId: string, names: string[]) {
    this.add(this.byId.get(guideId.toLowerCase()), key, 'id')
    this.add(this.byNormalizedId.get(normalizeGuideId(guideId)), key, 'normalizedId')
    for (const name of names) {
      const normalized = normalizeChannelName(name)
      if (normalized.length >= MIN_NAME_LENGTH) this.add(this.byName.get(normalized), key, 'name')
    }
  }

  /** Whether this guide channel matched any live channel (so its programmes are worth keeping). */
  isMatched(key: string): boolean {
    return this.matchedKeys.has(key)
  }

  /** For programmes listed before (or without) their `<channel>` element: id evidence only. */
  matchByIdOnly(key: string, guideId: string): boolean {
    this.add(this.byId.get(guideId.toLowerCase()), key, 'id')
    this.add(this.byNormalizedId.get(normalizeGuideId(guideId)), key, 'normalizedId')
    return this.isMatched(key)
  }

  /**
   * Best candidate per live channel among keys with programmes. Ties go to the
   * earlier source (candidates are recorded in source order).
   */
  resolve(hasProgrammes: (key: string) => boolean): Map<number, Candidate> {
    const result = new Map<number, Candidate>()
    for (const [streamId, list] of this.candidates) {
      let best: Candidate | null = null
      for (const candidate of list) {
        if (!hasProgrammes(candidate.key)) continue
        if (!best || METHOD_RANK[candidate.method] < METHOD_RANK[best.method]) best = candidate
      }
      if (best) result.set(streamId, best)
    }
    return result
  }
}
