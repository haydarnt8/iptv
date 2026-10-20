import type { EpgGridRow, EpgMatchMethod, EpgNowNext, EpgProgramme, EpgSourceStatus, EpgStatus } from '#shared/types/epg'
import type { XtreamCredentials } from '../xtream/client'

// Keep a little history (a show that started before the guide was built)
// and a day and a half ahead; real guides carry up to a week.
const WINDOW_PAST_MS = 2 * 60 * 60 * 1000
const WINDOW_FUTURE_MS = 36 * 60 * 60 * 1000
// Players commonly refresh guides every 12-24h.
const STALE_AFTER_MS = 12 * 60 * 60 * 1000
const MAX_DESCRIPTION_LENGTH = 280
const DEFAULT_PROGRAMME_MS = 60 * 60 * 1000
export const MAX_EPG_SOURCES = 10

interface GuideIndex {
  builtAt: string
  /** streamId -> guide channel key */
  channelByStream: Record<string, string>
  /** guide channel key -> programmes sorted by start */
  programmes: Record<string, EpgProgramme[]>
  totalChannels: number
  matchedBy: Record<EpgMatchMethod, number>
  programmeCount: number
  sources: EpgSourceStatus[]
}

const indexes = new Map<string, GuideIndex>()
const builds = new Map<string, Promise<void>>()
const buildErrors = new Map<string, string>()

function storage() {
  return useStorage('epg')
}

interface ActiveContext {
  profileId: string
  credentials: XtreamCredentials
}

export async function getActiveEpgContext(): Promise<ActiveContext> {
  const profile = await getActiveProfileWithSecret()
  if (!profile) {
    throw createError({ statusCode: 400, statusMessage: 'No active IPTV profile. Add one in Profiles first.' })
  }
  return {
    profileId: profile.id,
    credentials: {
      serverUrl: profile.serverUrl,
      username: profile.username,
      password: decryptSecret(profile.passwordEncrypted)
    }
  }
}

export async function getEpgSourceUrls(profileId: string): Promise<string[]> {
  return (await storage().getItem<string[]>(`sources:${profileId}`)) ?? []
}

export async function setEpgSourceUrls(profileId: string, urls: string[]): Promise<string[]> {
  const unique = [...new Set(urls.map(url => url.trim()).filter(Boolean))].slice(0, MAX_EPG_SOURCES)
  await storage().setItem(`sources:${profileId}`, unique)
  return unique
}

function providerGuideUrl({ serverUrl, username, password }: XtreamCredentials): string {
  const url = new URL(`${serverUrl.replace(/\/+$/, '')}/xmltv.php`)
  url.searchParams.set('username', username)
  url.searchParams.set('password', password)
  return url.toString()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.'
}

async function buildGuide({ profileId, credentials }: ActiveContext): Promise<void> {
  const streams = await getLiveStreams(credentials)
  const matcher = new LineupMatcher(streams)
  const now = Date.now()
  const windowStart = now - WINDOW_PAST_MS
  const windowEnd = now + WINDOW_FUTURE_MS

  const sources = [
    { label: 'Your provider\'s guide', url: providerGuideUrl(credentials), isProvider: true },
    ...(await getEpgSourceUrls(profileId)).map(url => ({ label: url, url, isProvider: false }))
  ]

  const kept = new Map<string, EpgProgramme[]>()
  const sourceStatuses: EpgSourceStatus[] = []

  // Sources are processed in order, so with equal evidence the provider's own
  // guide (index 0) wins over added sources.
  for (const [index, source] of sources.entries()) {
    let channels = 0
    let programmes = 0
    const triedById = new Set<string>()
    try {
      await streamXmltv(source.url, {
        onChannel(channel) {
          channels++
          matcher.matchChannel(`${index}|${channel.id}`, channel.id, channel.names)
        },
        onProgramme(programme) {
          programmes++
          const stop = programme.stop ?? programme.start + DEFAULT_PROGRAMME_MS
          if (stop < windowStart || programme.start > windowEnd) return
          const key = `${index}|${programme.channel}`
          if (!matcher.isMatched(key)) {
            if (triedById.has(key)) return
            triedById.add(key)
            if (!matcher.matchByIdOnly(key, programme.channel)) return
          }
          const list = kept.get(key) ?? []
          list.push({
            start: programme.start,
            stop: programme.stop ?? 0,
            title: programme.title,
            description: programme.description?.slice(0, MAX_DESCRIPTION_LENGTH) ?? null
          })
          kept.set(key, list)
        }
      })
      sourceStatuses.push({ label: source.label, isProvider: source.isProvider, ok: true, error: null, channels, programmes })
    } catch (error) {
      sourceStatuses.push({
        label: source.label, isProvider: source.isProvider, ok: false, error: errorMessage(error), channels, programmes
      })
    }
  }

  const channelByStream: Record<string, string> = {}
  const matchedBy: Record<EpgMatchMethod, number> = { id: 0, normalizedId: 0, name: 0 }
  const programmesByKey: Record<string, EpgProgramme[]> = {}
  let programmeCount = 0

  const assignments = matcher.resolve(key => (kept.get(key)?.length ?? 0) > 0)
  for (const [streamId, { key, method }] of assignments) {
    const list = kept.get(key)
    if (!list?.length) continue
    channelByStream[streamId] = key
    matchedBy[method]++
    if (!programmesByKey[key]) {
      list.sort((a, b) => a.start - b.start)
      list.forEach((programme, i) => {
        if (!programme.stop) programme.stop = list[i + 1]?.start ?? programme.start + DEFAULT_PROGRAMME_MS
      })
      programmesByKey[key] = list
      programmeCount += list.length
    }
  }

  const index: GuideIndex = {
    builtAt: new Date().toISOString(),
    channelByStream,
    programmes: programmesByKey,
    totalChannels: matcher.totalChannels,
    matchedBy,
    programmeCount,
    sources: sourceStatuses
  }
  indexes.set(profileId, index)
  await storage().setItem(`index:${profileId}`, index)
}

async function loadIndex(profileId: string): Promise<GuideIndex | null> {
  const cached = indexes.get(profileId)
  if (cached) return cached
  const stored = await storage().getItem<GuideIndex>(`index:${profileId}`)
  if (stored) indexes.set(profileId, stored)
  return stored ?? null
}

/** Starts a rebuild unless one is already running for this profile. */
export function startGuideBuild(context: ActiveContext): Promise<void> {
  const running = builds.get(context.profileId)
  if (running) return running

  buildErrors.delete(context.profileId)
  const build = buildGuide(context)
    .catch((error) => {
      buildErrors.set(context.profileId, errorMessage(error))
    })
    .finally(() => builds.delete(context.profileId))
  builds.set(context.profileId, build)
  return build
}

/** Kicks off a background rebuild when the guide is missing or older than the refresh interval. */
export async function refreshGuideIfStale(context: ActiveContext): Promise<void> {
  const index = await loadIndex(context.profileId)
  const age = index ? Date.now() - Date.parse(index.builtAt) : Infinity
  if (age > STALE_AFTER_MS && !buildErrors.has(context.profileId)) {
    void startGuideBuild(context)
  }
}

export async function getGuideStatus(profileId: string): Promise<EpgStatus> {
  const index = await loadIndex(profileId)
  const building = builds.has(profileId)
  const error = buildErrors.get(profileId) ?? null
  const matched = index ? Object.keys(index.channelByStream).length : 0
  return {
    state: building ? 'building' : error ? 'error' : index ? 'ready' : 'never',
    builtAt: index?.builtAt ?? null,
    error,
    totalChannels: index?.totalChannels ?? 0,
    matchedChannels: matched,
    matchedBy: index?.matchedBy ?? { id: 0, normalizedId: 0, name: 0 },
    programmes: index?.programmeCount ?? 0,
    sources: index?.sources ?? []
  }
}

function programmesFor(index: GuideIndex, streamId: number): EpgProgramme[] {
  const key = index.channelByStream[streamId]
  return key ? index.programmes[key] ?? [] : []
}

export async function getNowNext(profileId: string, streamIds: number[], at = Date.now()): Promise<EpgNowNext[]> {
  const index = await loadIndex(profileId)
  if (!index) return []
  const result: EpgNowNext[] = []
  for (const streamId of streamIds) {
    const list = programmesFor(index, streamId)
    if (!list.length) continue
    const nowIndex = list.findIndex(programme => programme.start <= at && at < programme.stop)
    const nextIndex = nowIndex >= 0 ? nowIndex + 1 : list.findIndex(programme => programme.start > at)
    const now = nowIndex >= 0 ? list[nowIndex] ?? null : null
    const next = nextIndex >= 0 ? list[nextIndex] ?? null : null
    if (now || next) result.push({ streamId, now, next })
  }
  return result
}

export async function getSchedule(profileId: string, streamId: number, at = Date.now()): Promise<EpgProgramme[]> {
  const index = await loadIndex(profileId)
  if (!index) return []
  return programmesFor(index, streamId).filter(programme => programme.stop > at)
}

/** Programmes overlapping [from, to) for each channel that has any; channels without data are omitted. */
export async function getGuideGrid(profileId: string, streamIds: number[], from: number, to: number): Promise<EpgGridRow[]> {
  const index = await loadIndex(profileId)
  if (!index) return []
  const rows: EpgGridRow[] = []
  for (const streamId of streamIds) {
    const programmes = programmesFor(index, streamId).filter(programme => programme.stop > from && programme.start < to)
    if (programmes.length) rows.push({ streamId, programmes })
  }
  return rows
}

/** Drops the built guide so the next request rebuilds it (e.g. the profile now points at another account). */
export async function invalidateGuide(profileId: string): Promise<void> {
  indexes.delete(profileId)
  buildErrors.delete(profileId)
  await storage().removeItem(`index:${profileId}`)
}

/** Removes a profile's guide sources and built guide (e.g. when the profile is deleted). */
export async function deleteGuideData(profileId: string): Promise<void> {
  indexes.delete(profileId)
  buildErrors.delete(profileId)
  await Promise.all([storage().removeItem(`sources:${profileId}`), storage().removeItem(`index:${profileId}`)])
}
