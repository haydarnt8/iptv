import type {
  LiveStream,
  SeriesDetails,
  SeriesSummary,
  VodDetails,
  VodStream,
  XtreamCategory
} from '#shared/types/xtream'

/**
 * Xtream providers are inconsistent about field casing, missing keys, and
 * numbers-as-strings. These helpers coerce leniently instead of throwing,
 * since one bad field shouldn't break an entire list.
 */
export function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length > 0 ? str : null
}

/**
 * Free text from the provider (plots, descriptions). Some panels double-escape quotes
 * (`\\\"Why…\\\"`), which would otherwise show up literally.
 */
export function toTextOrNull(value: unknown): string | null {
  return toStringOrNull(value)?.replace(/\\+(["'])/g, '$1') ?? null
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function toNumber(value: unknown, fallback = 0): number {
  return toNumberOrNull(value) ?? fallback
}

type RawRecord = Record<string, unknown>

/** Provider JSON as a record we can read fields from; anything else reads as empty. */
function asRecord(value: unknown): RawRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : {}
}

function normalizeParentId(raw: unknown): string | null {
  const value = toStringOrNull(raw)
  return value === '0' ? null : value
}

export function normalizeCategory(raw: unknown): XtreamCategory {
  const r = asRecord(raw)
  return {
    categoryId: toStringOrNull(r.category_id) ?? '',
    categoryName: toStringOrNull(r.category_name) ?? 'Unnamed',
    parentId: normalizeParentId(r.parent_id)
  }
}

export function normalizeLiveStream(raw: unknown): LiveStream {
  const r = asRecord(raw)
  return {
    streamId: toNumber(r.stream_id),
    name: toStringOrNull(r.name) ?? 'Unknown channel',
    categoryId: toStringOrNull(r.category_id),
    streamIcon: toStringOrNull(r.stream_icon),
    epgChannelId: toStringOrNull(r.epg_channel_id)
  }
}

export function normalizeVodStream(raw: unknown): VodStream {
  const r = asRecord(raw)
  return {
    streamId: toNumber(r.stream_id),
    name: toStringOrNull(r.name) ?? 'Unknown title',
    categoryId: toStringOrNull(r.category_id),
    streamIcon: toStringOrNull(r.stream_icon),
    rating: toNumberOrNull(r.rating),
    containerExtension: toStringOrNull(r.container_extension)
  }
}

/** get_vod_info splits data across an "info" object (metadata) and a "movie_data" object (stream_id/container). */
export function normalizeVodInfo(raw: unknown, fallbackStreamId: number): VodDetails {
  const data = asRecord(raw)
  const info = asRecord(data.info)
  const movieData = asRecord(data.movie_data)

  return {
    streamId: toNumber(movieData.stream_id, fallbackStreamId),
    name: toStringOrNull(movieData.name ?? info.name) ?? 'Unknown title',
    plot: toTextOrNull(info.plot),
    cast: toStringOrNull(info.cast),
    director: toStringOrNull(info.director),
    genre: toStringOrNull(info.genre),
    releaseDate: toStringOrNull(info.release_date),
    rating: toNumberOrNull(info.rating),
    durationSecs: toNumberOrNull(info.duration_secs),
    cover: toStringOrNull(info.movie_image ?? movieData.cover),
    containerExtension: toStringOrNull(movieData.container_extension)
  }
}

export function normalizeSeriesSummary(raw: unknown): SeriesSummary {
  const r = asRecord(raw)
  return {
    seriesId: toNumber(r.series_id),
    name: toStringOrNull(r.name) ?? 'Unknown series',
    categoryId: toStringOrNull(r.category_id),
    cover: toStringOrNull(r.cover),
    plot: toTextOrNull(r.plot),
    rating: toNumberOrNull(r.rating),
    releaseDate: toStringOrNull(r.release_date)
  }
}

export function normalizeSeriesInfo(raw: unknown): SeriesDetails {
  const r = asRecord(raw)
  const info = asRecord(r.info)
  const seasonsRaw: unknown[] = Array.isArray(r.seasons) ? r.seasons : []
  // Usually { "1": [...], "2": [...] }, but some panels send an array of season lists.
  const episodesRaw = r.episodes !== null && typeof r.episodes === 'object' ? r.episodes as RawRecord : {}

  const episodes = Object.entries(episodesRaw).flatMap(([seasonKey, list]) => {
    if (!Array.isArray(list)) return []
    return list.map((item: unknown) => {
      const episode = asRecord(item)
      const episodeInfo = asRecord(episode.info)
      return {
        id: toStringOrNull(episode.id) ?? toStringOrNull(episode.episode_num) ?? '',
        seasonNumber: toNumber(episode.season, toNumber(seasonKey)),
        episodeNum: toNumber(episode.episode_num),
        title: toStringOrNull(episode.title) ?? `Episode ${toNumber(episode.episode_num)}`,
        containerExtension: toStringOrNull(episode.container_extension),
        plot: toTextOrNull(episodeInfo.plot ?? episode.plot),
        durationSecs: toNumberOrNull(episodeInfo.duration_secs ?? episode.duration_secs)
      }
    })
  })

  return {
    info: {
      seriesId: toNumber(info.series_id ?? r.series_id),
      name: toStringOrNull(info.name) ?? 'Unknown series',
      categoryId: toStringOrNull(info.category_id),
      cover: toStringOrNull(info.cover),
      plot: toTextOrNull(info.plot),
      rating: toNumberOrNull(info.rating),
      releaseDate: toStringOrNull(info.release_date)
    },
    seasons: seasonsRaw.map((item) => {
      const season = asRecord(item)
      return {
        seasonNumber: toNumber(season.season_number),
        name: toStringOrNull(season.name),
        overview: toStringOrNull(season.overview),
        cover: toStringOrNull(season.cover)
      }
    }),
    episodes
  }
}
