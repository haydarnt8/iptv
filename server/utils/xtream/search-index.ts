import type { SearchResults } from '#shared/types/search'
import type { LiveStream, SeriesSummary, VodStream } from '#shared/types/xtream'
import type { XtreamCredentials } from './client'

// Catalogues change slowly; rebuilding costs ~25 MB of downloads on a big provider.
const INDEX_TTL_MS = 6 * 60 * 60 * 1000
const RESULT_LIMITS = { live: 30, movies: 48, series: 48 }

interface Entry<T> {
  item: T
  /** Normalized name for matching. */
  key: string
}

interface SearchIndex {
  builtAt: number
  live: Entry<LiveStream>[]
  movies: Entry<VodStream>[]
  series: Entry<SeriesSummary>[]
}

const indexes = new Map<string, SearchIndex>()
const builds = new Map<string, Promise<SearchIndex>>()

/** Lowercase, accents removed, so "Pokemon" finds "Pokémon". */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}

function toEntries<T extends { name: string }>(items: T[]): Entry<T>[] {
  return items.map(item => ({ item, key: normalizeForSearch(item.name) }))
}

async function buildIndex(credentials: XtreamCredentials): Promise<SearchIndex> {
  const [live, movies, series] = await Promise.all([
    getLiveStreams(credentials),
    getVodStreams(credentials),
    getSeriesList(credentials)
  ])
  return { builtAt: Date.now(), live: toEntries(live), movies: toEntries(movies), series: toEntries(series) }
}

/** The profile's index, built on first use and refreshed when stale; concurrent callers share one build. */
async function getIndex(profileId: string, credentials: XtreamCredentials): Promise<SearchIndex> {
  const existing = indexes.get(profileId)
  if (existing && Date.now() - existing.builtAt < INDEX_TTL_MS) return existing

  let build = builds.get(profileId)
  if (!build) {
    build = buildIndex(credentials)
      .then((index) => {
        indexes.set(profileId, index)
        return index
      })
      .finally(() => builds.delete(profileId))
    builds.set(profileId, build)
  }
  // A stale index still answers while the fresh one builds.
  return existing ?? build
}

/** Starts building the index in the background (if it's missing or stale) so the first search is fast. */
export function warmSearchIndex(profileId: string, credentials: XtreamCredentials) {
  getIndex(profileId, credentials).catch(() => {
    // A failed warm-up is retried by the next search.
  })
}

export function invalidateSearchIndex(profileId: string) {
  indexes.delete(profileId)
}

/**
 * Every word must appear in the name. Ranked: name starts with the query, then a word starts
 * with it, then anywhere; shorter names first within a rank.
 */
function rank<T>(entries: Entry<T>[], query: string, limit: number): { items: T[], total: number } {
  const terms = query.split(/\s+/).filter(Boolean)
  const matches: { item: T, score: number, length: number }[] = []
  for (const { item, key } of entries) {
    if (!terms.every(term => key.includes(term))) continue
    const score = key.startsWith(query) ? 0 : key.includes(` ${terms[0]}`) || key.startsWith(terms[0] ?? '') ? 1 : 2
    matches.push({ item, score, length: key.length })
  }
  matches.sort((a, b) => a.score - b.score || a.length - b.length)
  return { items: matches.slice(0, limit).map(match => match.item), total: matches.length }
}

export async function searchCatalog(profileId: string, credentials: XtreamCredentials, rawQuery: string): Promise<SearchResults> {
  const index = await getIndex(profileId, credentials)
  const query = normalizeForSearch(rawQuery.trim())
  const live = rank(index.live, query, RESULT_LIMITS.live)
  const movies = rank(index.movies, query, RESULT_LIMITS.movies)
  const series = rank(index.series, query, RESULT_LIMITS.series)
  return {
    query: rawQuery,
    live: live.items,
    movies: movies.items,
    series: series.items,
    totals: { live: live.total, movies: movies.total, series: series.total }
  }
}
